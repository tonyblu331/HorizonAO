/* global console, fetch, process, setTimeout, window */
import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '..', '..')
const port = Number(process.env.AO_BENCHMARK_PORT ?? 41737)
const baseURL = process.env.AO_BENCHMARK_BASE_URL ?? `http://127.0.0.1:${port}`
const externalServer = process.env.AO_BENCHMARK_EXTERNAL_SERVER === '1'
const requireWebgpu = process.env.AO_BENCHMARK_REQUIRE_WEBGPU === '1'
const browserChannel = process.env.AO_BENCHMARK_BROWSER_CHANNEL ?? 'chromium'
const headless = process.env.AO_BENCHMARK_HEADED !== '1'
const outPath = resolve(
  repoRoot,
  process.env.AO_BENCHMARK_OUT ?? 'artifacts/benchmarks/ao-benchmark-latest.json',
)
const screenshotEnabled = process.env.AO_BENCHMARK_SCREENSHOTS === '1'
const denoiseMatrixEnabled = process.env.AO_BENCHMARK_DENOISE_MATRIX === '1'
const vbaoDenoiseFilterMatrixEnabled =
  process.env.AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX === '1'
const vbaoSampleMatrixEnabled = process.env.AO_BENCHMARK_VBAO_SAMPLE_MATRIX === '1'
const vbaoScheduleMatrixEnabled = process.env.AO_BENCHMARK_VBAO_SCHEDULE_MATRIX === '1'
const vbaoRadiusStressMatrixEnabled =
  process.env.AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX === '1'
const screenshotDir = resolve(
  repoRoot,
  process.env.AO_BENCHMARK_SCREENSHOT_DIR ?? 'artifacts/benchmarks/screenshots',
)

const defaultArgs = [
  '--enable-unsafe-webgpu',
  '--ignore-gpu-blocklist',
  '--enable-features=WebGPUDeveloperFeatures',
]

const extraArgs = (process.env.AO_BENCHMARK_BROWSER_ARGS ?? '')
  .split(/\s+/)
  .map((arg) => arg.trim())
  .filter(Boolean)

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
]

const singleModes = ['gtao', 'vbao', 'n8ao']
const viewModes = denoiseMatrixEnabled ? ['beauty', 'ao'] : ['beauty']
const denoiseStates = denoiseMatrixEnabled ? [false, true] : [true]
const baselineVbaoSamplePreset = 'baseline'
const highVbaoSamplePreset = 'high-sample'
const baselineVbaoSamplingSchedule = 'magic-square'
const baselineVbaoDenoiseFilter = 'generic'
const baselineVbaoRadiusStressPreset = 'baseline'
const largeRadiusVbaoStressPreset = 'large-radius'
const vbaoSamplingSchedules = ['magic-square', 'r2', 'hilbert', 'blue-noise']
const vbaoDenoiseFilters = ['generic', 'custom-bilateral']

function vbaoSchedulesFor(mode, denoiseEnabled) {
  if (mode !== 'vbao') return [baselineVbaoSamplingSchedule]
  if (!vbaoScheduleMatrixEnabled || denoiseEnabled) return [baselineVbaoSamplingSchedule]
  return vbaoSamplingSchedules
}

function vbaoSamplePresetsFor(mode, denoiseEnabled) {
  if (mode !== 'vbao') return [baselineVbaoSamplePreset]
  if (
    !vbaoSampleMatrixEnabled ||
    denoiseEnabled ||
    vbaoScheduleMatrixEnabled ||
    vbaoRadiusStressMatrixEnabled
  ) {
    return [baselineVbaoSamplePreset]
  }
  return [baselineVbaoSamplePreset, highVbaoSamplePreset]
}

function vbaoRadiusStressPresetsFor(mode, denoiseEnabled) {
  if (mode !== 'vbao') return [baselineVbaoRadiusStressPreset]
  if (!vbaoRadiusStressMatrixEnabled || denoiseEnabled || vbaoScheduleMatrixEnabled) {
    return [baselineVbaoRadiusStressPreset]
  }
  return [baselineVbaoRadiusStressPreset, largeRadiusVbaoStressPreset]
}

function vbaoDenoiseFiltersFor(mode, denoiseEnabled) {
  if (mode !== 'vbao') return [baselineVbaoDenoiseFilter]
  if (!denoiseEnabled || !vbaoDenoiseFilterMatrixEnabled) return [baselineVbaoDenoiseFilter]
  return vbaoDenoiseFilters
}

async function setVbaoDenoiseFilter(page, filter) {
  await page.evaluate((nextFilter) => {
    window.__aoBenchmark?.setVbaoDenoiseFilter(nextFilter)
  }, filter)
}

async function setVbaoSamplePreset(page, preset) {
  await page.evaluate((nextPreset) => {
    window.__aoBenchmark?.setVbaoSamplePreset(nextPreset)
  }, preset)
}

async function setVbaoSamplingSchedule(page, schedule) {
  await page.evaluate((nextSchedule) => {
    window.__aoBenchmark?.setVbaoSamplingSchedule(nextSchedule)
  }, schedule)
}

async function setVbaoRadiusStressPreset(page, preset) {
  await page.evaluate((nextPreset) => {
    window.__aoBenchmark?.setVbaoRadiusStressPreset(nextPreset)
  }, preset)
}

function startVite() {
  if (externalServer) return undefined

  const viteBin = resolve(appRoot, 'node_modules/vite/bin/vite.js')
  return spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: appRoot,
    stdio: 'pipe',
    windowsHide: true,
  })
}

async function waitForServer() {
  const started = Date.now()
  let lastError

  while (Date.now() - started < 30_000) {
    try {
      const response = await fetch(baseURL)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }

  throw new Error(`Timed out waiting for ${baseURL}: ${lastError?.message ?? 'no response'}`)
}

async function setChecked(page, selector, checked) {
  const locator = page.locator(selector)
  if ((await locator.count()) === 0) return
  if (checked) await locator.check()
  else await locator.uncheck()
}

async function collectLatest(page, expected) {
  await page.evaluate(() => window.__aoBenchmark?.reset())
  await page.waitForFunction(
    (match) => {
      const latest = window.__aoBenchmark?.latest
      if (latest === undefined) return false
      if (latest.renderMode !== match.renderMode) return false
      if (latest.mode !== match.mode) return false
      if (
        match.includesVbao &&
        latest.vbaoSamplingSchedule !== (match.vbaoSamplingSchedule ?? 'magic-square')
      ) {
        return false
      }
      if (!match.includesVbao && latest.vbaoSamplingSchedule !== 'n/a') return false
      if (
        match.vbaoSamplePreset !== undefined &&
        latest.vbaoSamplePreset !== match.vbaoSamplePreset
      ) {
        return false
      }
      if (
        match.vbaoDenoiseFilter !== undefined &&
        latest.vbaoDenoiseFilter !== match.vbaoDenoiseFilter
      ) {
        return false
      }
      if (
        match.vbaoRadiusStressPreset !== undefined &&
        latest.vbaoRadiusStressPreset !== match.vbaoRadiusStressPreset
      ) {
        return false
      }
      if (match.viewMode !== undefined && latest.viewMode !== match.viewMode) return false
      if (
        match.denoiseEnabled !== undefined &&
        latest.denoiseEnabled !== match.denoiseEnabled
      ) {
        return false
      }
      if (match.composeModes !== undefined) {
        if (latest.composeModes.length !== match.composeModes.length) return false
        for (const mode of match.composeModes) {
          if (!latest.composeModes.includes(mode)) return false
        }
      }
      return (
        latest.sampleCount > 0 &&
        latest.reportIndex > 0 &&
        latest.avgFrameMs > 0 &&
        latest.medianFrameMs > 0 &&
        latest.p95FrameMs > 0
      )
    },
    expected,
    { timeout: 20_000 },
  )

  return page.evaluate(() => window.__aoBenchmark.snapshot().latest)
}

function slug(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '')
}

async function captureScreenshot(page, latest, resolution) {
  if (!screenshotEnabled) return 'not-captured'

  await mkdir(screenshotDir, { recursive: true })
  const compose = latest.composeModes.length === 0 ? 'single' : latest.composeModes.join('-')
  const fileNameParts = [
    latest.scene,
    'museumBaseline',
    resolution,
    latest.renderMode,
    latest.mode,
    compose,
    latest.viewMode,
    latest.denoiseEnabled ? 'denoised' : 'raw',
    latest.vbaoSamplingSchedule,
  ]
  if (latest.vbaoSamplePreset === highVbaoSamplePreset) {
    fileNameParts.push(latest.vbaoSamplePreset)
  }
  if (latest.vbaoDenoiseFilter !== 'n/a') {
    fileNameParts.push(latest.vbaoDenoiseFilter)
  }
  if (latest.vbaoRadiusStressPreset !== baselineVbaoRadiusStressPreset) {
    fileNameParts.push(latest.vbaoRadiusStressPreset)
  }
  const fileName = fileNameParts.map(slug).join('__')

  const absolutePath = resolve(screenshotDir, `${fileName}.png`)
  await page.screenshot({ path: absolutePath, fullPage: false })
  return absolutePath.replace(`${repoRoot}\\`, '').replaceAll('\\', '/')
}

async function toRow(page, latest, resolution) {
  const n8aoInternalDenoise =
    latest.mode === 'n8ao' || latest.composeModes.includes('n8ao')

  return {
    scene: latest.scene,
    cameraId: 'museumBaseline',
    resolution,
    renderMode: latest.renderMode,
    mode: latest.mode,
    composeModes: latest.composeModes.length === 0 ? 'n/a' : latest.composeModes.join(','),
    viewMode: latest.viewMode,
    denoise: latest.denoiseEnabled ? 'denoised' : 'raw',
    denoiseNote: n8aoInternalDenoise
      ? 'n8ao segment uses n8ao-webgpu internal denoise regardless of demo toggle'
      : 'demo toggle applies to this row',
    fullResolutionVbao: latest.fullResolutionVbao,
    vbaoSamplingSchedule: latest.vbaoSamplingSchedule,
    vbaoSamplePreset: latest.vbaoSamplePreset,
    vbaoDenoiseFilter: latest.vbaoDenoiseFilter,
    vbaoRadiusStressPreset: latest.vbaoRadiusStressPreset,
    vbaoRadius: latest.vbaoRadius,
    vbaoExpectedDepthHierarchyLevel: latest.vbaoExpectedDepthHierarchyLevel,
    vbaoSamples: latest.vbaoSamples,
    vbaoSlices: latest.vbaoSlices,
    renderer: latest.rendererBackend,
    fps: Number(latest.fps.toFixed(1)),
    avgFrameMs: Number(latest.avgFrameMs.toFixed(2)),
    medianFrameMs: Number(latest.medianFrameMs.toFixed(2)),
    p95FrameMs: Number(latest.p95FrameMs.toFixed(2)),
    failureLabels: 'pending-review',
    screenshotPath: await captureScreenshot(page, latest, resolution),
    sampleCount: latest.sampleCount,
    reportIndex: latest.reportIndex,
  }
}

async function writeResult(result) {
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
}

async function run() {
  const vite = startVite()

  try {
    await waitForServer()

    const launchOptions = {
      args: [...defaultArgs, ...extraArgs],
      headless,
    }
    if (browserChannel !== 'bundled') {
      launchOptions.channel = browserChannel
    }

    const browser = await chromium.launch(launchOptions)
    const rows = []
    let environment

    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport })
      await page.goto(`${baseURL}/museum`)
      await page.locator('.benchmark-panel').waitFor({ state: 'visible', timeout: 30_000 })
      const snapshot = await page.evaluate(() => window.__aoBenchmark?.snapshot())
      environment ??= snapshot?.environment

      if (snapshot?.environment?.rendererBackend !== 'webgpu') {
        await page.close()
        await browser.close()
        const result = {
          status: 'blocked',
          reason: 'Museum route did not get a WebGPU renderer backend; AO comparison controls are disabled.',
          baseURL,
          browserChannel,
          headless,
          denoiseMatrixEnabled,
          vbaoDenoiseFilterMatrixEnabled,
          vbaoSampleMatrixEnabled,
          vbaoScheduleMatrixEnabled,
          vbaoRadiusStressMatrixEnabled,
          launchArgs: launchOptions.args,
          environment: snapshot?.environment,
          rows,
          generatedAt: new Date().toISOString(),
        }
        await writeResult(result)
        console.log(JSON.stringify(result, null, 2))
        if (requireWebgpu) process.exitCode = 1
        return
      }

      for (const viewMode of viewModes) {
        await page.locator(`[data-view="${viewMode}"]`).click()

        for (const denoiseEnabled of denoiseStates) {
          await setChecked(page, '[data-denoise]', denoiseEnabled)

          for (const mode of singleModes) {
            for (const vbaoDenoiseFilter of vbaoDenoiseFiltersFor(mode, denoiseEnabled)) {
              await setVbaoDenoiseFilter(page, vbaoDenoiseFilter)

              for (const vbaoSamplingSchedule of vbaoSchedulesFor(mode, denoiseEnabled)) {
                await setVbaoSamplingSchedule(page, vbaoSamplingSchedule)

                for (const vbaoRadiusStressPreset of vbaoRadiusStressPresetsFor(
                  mode,
                  denoiseEnabled,
                )) {
                  await setVbaoRadiusStressPreset(page, vbaoRadiusStressPreset)

                  for (const vbaoSamplePreset of vbaoSamplePresetsFor(mode, denoiseEnabled)) {
                    await setVbaoSamplePreset(page, vbaoSamplePreset)
                    await setChecked(page, '[data-compose-debug]', false)
                    await setChecked(page, '[data-full-resolution]', mode === 'vbao')
                    await page.locator(`[data-mode="${mode}"]`).click()
                    const latest = await collectLatest(page, {
                      renderMode: 'single',
                      mode,
                      includesVbao: mode === 'vbao',
                      vbaoSamplingSchedule:
                        mode === 'vbao' ? vbaoSamplingSchedule : baselineVbaoSamplingSchedule,
                      vbaoSamplePreset: mode === 'vbao' ? vbaoSamplePreset : 'n/a',
                      vbaoDenoiseFilter:
                        mode === 'vbao' && denoiseEnabled ? vbaoDenoiseFilter : 'n/a',
                      vbaoRadiusStressPreset:
                        mode === 'vbao' ? vbaoRadiusStressPreset : 'n/a',
                      viewMode,
                      denoiseEnabled,
                    })
                    rows.push(await toRow(page, latest, `${viewport.width}x${viewport.height}`))
                  }
                }
              }
            }
          }

          const composeVbaoSamplingSchedules =
            vbaoScheduleMatrixEnabled && !denoiseEnabled
              ? vbaoSamplingSchedules
              : [baselineVbaoSamplingSchedule]
          const composeVbaoSamplePresets =
            vbaoSampleMatrixEnabled &&
            !denoiseEnabled &&
            !vbaoScheduleMatrixEnabled &&
            !vbaoRadiusStressMatrixEnabled
              ? [baselineVbaoSamplePreset, highVbaoSamplePreset]
              : [baselineVbaoSamplePreset]
          const composeVbaoRadiusStressPresets =
            vbaoRadiusStressMatrixEnabled && !denoiseEnabled && !vbaoScheduleMatrixEnabled
              ? [baselineVbaoRadiusStressPreset, largeRadiusVbaoStressPreset]
              : [baselineVbaoRadiusStressPreset]
          const composeVbaoDenoiseFilters =
            vbaoDenoiseFilterMatrixEnabled && denoiseEnabled
              ? vbaoDenoiseFilters
              : [baselineVbaoDenoiseFilter]
          for (const vbaoDenoiseFilter of composeVbaoDenoiseFilters) {
            await setVbaoDenoiseFilter(page, vbaoDenoiseFilter)

            for (const vbaoSamplingSchedule of composeVbaoSamplingSchedules) {
              await setVbaoSamplingSchedule(page, vbaoSamplingSchedule)

              for (const vbaoRadiusStressPreset of composeVbaoRadiusStressPresets) {
                await setVbaoRadiusStressPreset(page, vbaoRadiusStressPreset)

                for (const vbaoSamplePreset of composeVbaoSamplePresets) {
                  await setVbaoSamplePreset(page, vbaoSamplePreset)
                  await setChecked(page, '[data-compose-debug]', true)
                  await setChecked(page, '[data-compose-mode="ssao"]', false)
                  await setChecked(page, '[data-compose-mode="gtao"]', true)
                  await setChecked(page, '[data-compose-mode="vbao"]', true)
                  await setChecked(page, '[data-compose-mode="n8ao"]', true)
                  await setChecked(page, '[data-full-resolution]', true)
                  const latest = await collectLatest(page, {
                    renderMode: 'compose',
                    mode: 'compose',
                    includesVbao: true,
                    vbaoSamplingSchedule,
                    vbaoSamplePreset,
                    vbaoDenoiseFilter: denoiseEnabled ? vbaoDenoiseFilter : 'n/a',
                    vbaoRadiusStressPreset,
                    composeModes: ['gtao', 'vbao', 'n8ao'],
                    viewMode,
                    denoiseEnabled,
                  })
                  rows.push(await toRow(page, latest, `${viewport.width}x${viewport.height}`))
                }
              }
            }
          }
        }
      }
      await page.close()
    }

    await browser.close()
    const result = {
      status: 'ok',
      baseURL,
      browserChannel,
      headless,
      denoiseMatrixEnabled,
      vbaoDenoiseFilterMatrixEnabled,
      vbaoSampleMatrixEnabled,
      vbaoScheduleMatrixEnabled,
      vbaoRadiusStressMatrixEnabled,
      launchArgs: launchOptions.args,
      environment,
      rows,
      generatedAt: new Date().toISOString(),
    }
    await writeResult(result)
    console.log(JSON.stringify(result, null, 2))
  } finally {
    if (vite !== undefined && vite.exitCode === null) {
      vite.kill()
    }
  }
}

await run()
