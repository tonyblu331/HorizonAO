import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  launchBenchmarkBrowser,
  startBenchmarkServer,
  waitForServer,
} from './profiling/benchmarkHarness.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')
const repoRoot = resolve(appRoot, '..', '..')
const port = Number(process.env.VBAO_LABEL_REVIEW_PORT ?? 41861)
const baseURL = process.env.VBAO_LABEL_REVIEW_BASE_URL ?? `http://127.0.0.1:${port}`
const externalServer = process.env.VBAO_LABEL_REVIEW_EXTERNAL_SERVER === '1'
const browserChannel = process.env.VBAO_LABEL_REVIEW_BROWSER_CHANNEL ?? 'chromium'
const headless = process.env.VBAO_LABEL_REVIEW_HEADED !== '1'
const outPath = resolve(
  repoRoot,
  process.env.VBAO_LABEL_REVIEW_OUT ??
    'artifacts/analysis/vbao-support-bitmask-label-review-latest.json',
)
const contactSheetPath = resolve(
  repoRoot,
  process.env.VBAO_LABEL_REVIEW_CONTACT_SHEET ??
    'artifacts/analysis/vbao_support_bitmask_label_review_contact_sheet.html',
)

const fixtureIds = [
  'thin-gap-parallel-planes',
  'large-flat-floor-no-curvature',
  'small-contact-object-on-plane',
  'grazing-wall-corner',
  'subpixel-thin-occluder',
]

const variants = [
  { key: 'baseline-current', pixelField: 'fixturePixels' },
  { key: 'support-bitmask-v1', pixelField: 'supportBitmaskFixturePixels' },
]

function svgForPixels(pixels, width, height) {
  const scale = 4
  const rects = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = pixels[y * width + x] ?? 0
      const channel = Math.max(0, Math.min(255, Math.round(value * 255)))
      rects.push(
        `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="rgb(${channel},${channel},${channel})"/>`,
      )
    }
  }
  return `<svg width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width * scale} ${height * scale}" role="img">${rects.join('')}</svg>`
}

function renderContactSheet(packet) {
  const panels = packet.rows.map((row) => {
    const pixels = packet.pixelGrids[row.fixtureId]?.[row.variant] ?? []
    return `<section class="panel">
      <h2>${row.fixtureId}<br/><span>${row.variant}</span></h2>
      ${svgForPixels(pixels, packet.width, packet.height)}
      <p>failureLabels: <code>${row.failureLabels.join(',')}</code></p>
    </section>`
  })

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>VBAO support-bitmask label review contact sheet</title>
  <style>
    body { margin: 24px; font: 14px/1.4 system-ui, sans-serif; background: #101314; color: #e8eeee; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(300px, 1fr)); gap: 18px; }
    .panel { padding: 14px; border: 1px solid #334044; border-radius: 10px; background: #171d1f; }
    h1 { margin-top: 0; }
    h2 { margin: 0 0 10px; font-size: 14px; }
    h2 span { color: #83d8e6; font-weight: 500; }
    svg { image-rendering: pixelated; border: 1px solid #425056; background: #000; }
    code { color: #ffd27a; }
  </style>
</head>
<body>
  <h1>VBAO support-bitmask-v1 label review contact sheet</h1>
  <p>This packet is generated from live <code>/vbao-parity</code> readbacks. Labels stay <code>pending-review</code> until a reviewer replaces them.</p>
  <p>candidate: <code>${packet.candidate}</code>; labelGate: <code>${packet.labelGateVerdict}</code>; promoteProduction: <code>${packet.promoteProduction}</code></p>
  <main class="grid">${panels.join('\n')}</main>
</body>
</html>`
}

async function main() {
  const server = startBenchmarkServer({
    externalServer,
    appRoot,
    benchmarkPort: port,
    baseUrl: baseURL,
  })
  let browser
  try {
    await waitForServer({ server, baseUrl: baseURL })
    browser = await launchBenchmarkBrowser({
      channel: browserChannel === 'chromium' ? undefined : browserChannel,
      headless,
    })
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
    await page.goto(`${baseURL}/vbao-parity`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-state="ready"]', { timeout: 60_000 })

    const packet = await page.evaluate(({ fixtureIds: ids, variants: requestedVariants }) => {
      const result = window.__vbaoParity
      if (result === undefined) throw new Error('window.__vbaoParity was not set')
      if (result.status === 'non-evidence-placeholder' || result.evidence === false) {
        throw new Error(
          '/vbao-parity returned non-evidence-placeholder; support-bitmask label review requires live GPU readback evidence and will not generate scaffold artifacts.',
        )
      }
      if (
        result.supportBitmaskCandidate === undefined ||
        result.supportBitmaskFixturePixels === undefined
      ) {
        throw new Error(
          '/vbao-parity did not expose supportBitmaskCandidate/supportBitmaskFixturePixels; stale label-review script stopped before writing misleading artifacts.',
        )
      }

      const rows = []
      const pixelGrids = {}
      for (const fixtureId of ids) {
        pixelGrids[fixtureId] = {}
        for (const variant of requestedVariants) {
          rows.push({
            fixtureId,
            variant: variant.key,
            failureLabels: ['pending-review'],
          })
          pixelGrids[fixtureId][variant.key] = result[variant.pixelField]?.[fixtureId] ?? []
        }
      }

      return {
        change: 'vbao-gt-vbao-attribution-gate',
        generatedAt: new Date().toISOString(),
        sourceRoute: '/vbao-parity',
        candidate: 'support-bitmask-v1',
        labelGateVerdict: result.supportBitmaskCandidate.labelGate.verdict,
        promoteProduction: result.supportBitmaskCandidate.labelGate.promoteProduction,
        width: result.width,
        height: result.height,
        rows,
        pixelGrids,
        blockingReasons: result.supportBitmaskCandidate.labelGate.blockingReasons,
        nextGate:
          'Review the generated contact sheet and replace pending-review labels in the decision artifact only with actual reviewed labels.',
      }
    }, { fixtureIds, variants })

    await mkdir(dirname(outPath), { recursive: true })
    await mkdir(dirname(contactSheetPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8')
    await writeFile(contactSheetPath, renderContactSheet(packet), 'utf8')
    console.log(`wrote ${outPath}`)
    console.log(`wrote ${contactSheetPath}`)
  } finally {
    await browser?.close()
    server?.child.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
