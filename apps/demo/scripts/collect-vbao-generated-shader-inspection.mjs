#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertWebGpu,
  launchBenchmarkBrowser,
  startBenchmarkServer,
  waitForBenchmark,
  waitForServer,
} from './profiling/benchmarkHarness.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(scriptDir, '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')
const shaderInspectionArtifact =
  'artifacts/benchmarks/vbao-generated-shader-inspection-latest.json'
const outputJson = path.join(repoRoot, shaderInspectionArtifact)
const outputMd = path.join(artifactRoot, 'vbao-generated-shader-inspection-summary.md')
const benchmarkPort = Number(
  process.env.PLAYWRIGHT_TEST_PORT ?? process.env.AO_BENCHMARK_PORT ?? 5173,
)
const explicitBaseUrl = process.env.AO_BENCHMARK_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL
const externalServer =
  process.env.AO_BENCHMARK_EXTERNAL_SERVER === '1' || explicitBaseUrl !== undefined
if (process.env.AO_BENCHMARK_EXTERNAL_SERVER === '1' && explicitBaseUrl === undefined) {
  throw new Error(
    'AO_BENCHMARK_EXTERNAL_SERVER=1 requires AO_BENCHMARK_BASE_URL or PLAYWRIGHT_BASE_URL to avoid stale-server captures.',
  )
}
const baseUrl = explicitBaseUrl ?? `http://127.0.0.1:${benchmarkPort}`
const requireWebGpu = process.env.AO_BENCHMARK_REQUIRE_WEBGPU !== '0'
const expectedInspections = [
  {
    sampleMode: 'product-preset',
    sampleShape: 'quality-preset',
    expectedSliceLoopBound: 4,
    expectedSampleLoopBound: 8,
  },
  {
    sampleMode: 'spatial-ultra',
    sampleShape: 'explicit-override',
    expectedSliceLoopBound: 4,
    expectedSampleLoopBound: 10,
  },
]

function shaderMatchesLoopBound(shaderCode, bound) {
  const escapedBound = String(bound).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`for \\( var [^\\n]+<\\s*(?:i32\\()?\\s*${escapedBound}\\b`).test(shaderCode)
}

function countSubstring(value, needle) {
  return value.split(needle).length - 1
}

function isIgnoredConsoleDiagnostic(message) {
  return (
    message.type === 'warning' &&
    message.text.includes('powerPreference option is currently ignored') &&
    message.text.includes('crbug.com/369219127')
  )
}

function assertShaderInspection(inspection, consoleMessages, expected) {
  const shaderText = inspection.shaderPrograms.map((program) => program.code).join('\n')
  const fragmentPrograms = inspection.shaderPrograms.filter((program) => program.stage === 'fragment')
  const hasFixedSliceLoop = shaderMatchesLoopBound(shaderText, expected.expectedSliceLoopBound)
  const hasFixedSampleLoop = shaderMatchesLoopBound(shaderText, expected.expectedSampleLoopBound)
  const hasDynamicSliceUniformLoop = /<\s*vbao_slices\b|<\s*nodeUniform\d+_slices\b/i.test(shaderText)
  const hasDynamicSampleUniformLoop = /<\s*vbao_samples\b|<\s*nodeUniform\d+_samples\b/i.test(shaderText)
  const hasUnexpectedFullResJbu = /JBU8|JBU16|wideJbu|fullResJbu/i.test(shaderText)
  const hasUnexpectedWidePolish = /POISSON_WIDE|widePolish|start:\s*i32\(-2\)|<\s*i32\(5\)/i.test(
    shaderText,
  )
  const hasUnexpectedPass = fragmentPrograms.length > 6
  const vbaoDuplicateDeclarationWarnings = consoleMessages.filter((message) =>
    /Declaration name '.+vbao/i.test(message.text),
  )
  const consoleDiagnostics = consoleMessages.filter(
    (message) => ['error', 'warning'].includes(message.type) && !isIgnoredConsoleDiagnostic(message),
  )
  const ignoredConsoleDiagnostics = consoleMessages.filter(isIgnoredConsoleDiagnostic)

  return {
    expectedSliceLoopBound: expected.expectedSliceLoopBound,
    expectedSampleLoopBound: expected.expectedSampleLoopBound,
    sampleShape: expected.sampleShape,
    shaderProgramCount: inspection.shaderPrograms.length,
    fragmentProgramCount: fragmentPrograms.length,
    hasFixedSliceLoop,
    hasFixedSampleLoop,
    hasDynamicSliceUniformLoop,
    hasDynamicSampleUniformLoop,
    hasUnexpectedFullResJbu,
    hasUnexpectedWidePolish,
    hasUnexpectedPass,
    vbaoDuplicateDeclarationWarnings: vbaoDuplicateDeclarationWarnings.length,
    consoleDiagnostics: consoleDiagnostics.length,
    ignoredConsoleDiagnostics: ignoredConsoleDiagnostics.length,
    vbaoRawNoisePixelTokenCount: countSubstring(shaderText, 'vbaoRawNoisePixel'),
    passed:
      inspection.productPreset === 'quality' &&
      inspection.sampleMode === expected.sampleMode &&
      inspection.fullResolution === true &&
      inspection.shaderPrograms.length > 0 &&
      hasFixedSliceLoop &&
      hasFixedSampleLoop &&
      !hasDynamicSliceUniformLoop &&
      !hasDynamicSampleUniformLoop &&
      !hasUnexpectedFullResJbu &&
      !hasUnexpectedWidePolish &&
      !hasUnexpectedPass &&
      vbaoDuplicateDeclarationWarnings.length === 0 &&
      consoleDiagnostics.length === 0,
  }
}

async function writeReport(report) {
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`)

  const lines = []
  lines.push('# VBAO Generated Shader Inspection')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(`Status: ${report.passed ? 'PASS' : 'FAIL'}`)
  lines.push('')
  lines.push('| Check | Result |')
  lines.push('| --- | --- |')
  for (const capture of report.captures) {
    const assertions = capture.assertions
    lines.push(`| ${capture.sampleMode} sample shape | \`${assertions.sampleShape}\` |`)
    lines.push(`| ${capture.sampleMode} full resolution | ${capture.inspection.fullResolution ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} shader programs with VBAO tokens | ${assertions.shaderProgramCount} |`)
    lines.push(`| ${capture.sampleMode} fragment programs with VBAO tokens | ${assertions.fragmentProgramCount} |`)
    lines.push(`| ${capture.sampleMode} fixed slice loop bound (${assertions.expectedSliceLoopBound}) | ${assertions.hasFixedSliceLoop ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} fixed sample loop bound (${assertions.expectedSampleLoopBound}) | ${assertions.hasFixedSampleLoop ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} dynamic slice uniform loop | ${assertions.hasDynamicSliceUniformLoop ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} dynamic sample uniform loop | ${assertions.hasDynamicSampleUniformLoop ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} unexpected full-res JBU | ${assertions.hasUnexpectedFullResJbu ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} unexpected wide polish | ${assertions.hasUnexpectedWidePolish ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} unexpected pass count | ${assertions.hasUnexpectedPass ? 'yes' : 'no'} |`)
    lines.push(`| ${capture.sampleMode} VBAO duplicate declaration warnings | ${assertions.vbaoDuplicateDeclarationWarnings} |`)
    lines.push(`| ${capture.sampleMode} console diagnostics (error/warning) | ${assertions.consoleDiagnostics} |`)
    lines.push(`| ${capture.sampleMode} ignored platform diagnostics | ${assertions.ignoredConsoleDiagnostics} |`)
  }
  lines.push('')
  lines.push('Notes:')
  lines.push(
    '- Shader code is captured from Three WebGPU renderer pipeline program maps after rendering Museum VBAO rows.',
  )
  lines.push(
    '- The `spatial-ultra` row passes explicit `samples/slices`, so it guards the old dynamic-uniform fallback path.',
  )
  lines.push(
    '- Console error/warning diagnostics fail this gate because release diagnostics must be clean.',
  )
  lines.push(
    '- The known Chromium Windows `powerPreference` warning is reported separately and ignored because it is outside shader generation.',
  )

  await writeFile(outputMd, `${lines.join('\n')}\n`)
}

await mkdir(artifactRoot, { recursive: true })
const server = startBenchmarkServer({ externalServer, appRoot, benchmarkPort, baseUrl })
let browser
try {
  await waitForServer({ server, baseUrl })
  browser = await launchBenchmarkBrowser()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
  const captures = []
  page.on('console', (message) => {
    const capture = captures.at(-1)
    if (capture !== undefined) {
      capture.consoleMessages.push({ type: message.type(), text: message.text() })
    }
  })
  try {
    for (const expected of expectedInspections) {
      const capture = {
        sampleMode: expected.sampleMode,
        route: '/museum',
        consoleMessages: [],
      }
      captures.push(capture)
      const url = new URL('/museum', baseUrl)
      url.searchParams.set('vbaoSampleMode', expected.sampleMode)
      await page.goto(url.href, { waitUntil: 'domcontentloaded' })
      await waitForBenchmark(page)
      await assertWebGpu(page, { requireWebGpu })
      await page.evaluate(() => {
        const compose = document.querySelector('input[data-compose-debug]')
        if (compose instanceof HTMLInputElement && compose.checked) compose.click()
      })
      await page.click('[data-mode="vbao"]')
      await page.click('[data-view="ao"]')
      await page.waitForFunction(
        (sampleMode) =>
          window.__aoBenchmark?.latest?.renderMode === 'single' &&
          window.__aoBenchmark?.latest?.mode === 'vbao' &&
          (sampleMode === 'product-preset'
            ? window.__aoBenchmark?.latest?.vbaoSamplePreset === 'quality'
            : window.__aoBenchmark?.latest?.vbaoSamplePreset === sampleMode),
        expected.sampleMode,
        { timeout: 30_000 },
      )
      const inspection = await page.evaluate(() =>
        window.__aoBenchmark?.inspectVbaoGeneratedShaders(),
      )
      if (inspection === undefined) throw new Error('Missing inspectVbaoGeneratedShaders API')

      capture.inspection = inspection
      capture.assertions = assertShaderInspection(inspection, capture.consoleMessages, expected)
    }

    const assertions = Object.fromEntries(
      captures.map((capture) => [capture.sampleMode, capture.assertions]),
    )
    const passed = captures.every((capture) => capture.assertions.passed)
    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      passed,
      assertions,
      captures,
    }
    await writeReport(report)
    console.log(JSON.stringify({ outputJson, outputMd, passed, assertions }, null, 2))
    if (!passed) process.exitCode = 1
  } finally {
    await page.close()
  }
} finally {
  await browser?.close()
  server?.child.kill('SIGTERM')
}
