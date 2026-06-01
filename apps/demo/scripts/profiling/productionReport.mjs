import { writeFile } from 'node:fs/promises'

export const AO_FAILURE_LABELS = [
  'none',
  'noise',
  'mud',
  'halo',
  'thin-gap',
  'edge-bleed',
  'scale-mismatch',
  'false-curvature',
]

export function classifyFailureLabels(row) {
  if (row.mode !== 'vbao') return ['none']
  if (row.fullResolutionVbao === false) return ['noise', 'false-curvature', 'scale-mismatch']

  const labels = new Set(['noise'])
  const contract = row.productOutputContract ?? ''
  const legacyDenoisedMode =
    row.denoise === true &&
    ((contract.length > 0 && !contract.includes('final product AO')) ||
      row.vbaoFilter !== undefined ||
      row.vbaoDenoiseFilter !== undefined)

  if (legacyDenoisedMode) {
    labels.add('mud')
    labels.add('thin-gap')
    labels.add('edge-bleed')
    return [...labels]
  }

  if (row.denoise === false || row.fullResolutionVbao === true) return ['noise', 'edge-bleed']
  return [...labels]
}

export async function writeProductionQualityReports({ outputJson, outputMd, report }) {
  await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`)

  const lines = []
  lines.push('# AO Production Screenshot Quality Summary')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push('This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.')
  lines.push('')
  lines.push('| Resolution | Algorithm | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |')
  lines.push('| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |')
  for (const row of report.rows) {
    const metrics = row.qualityMetrics
    const outputLabel =
      row.mode === 'vbao' ? (row.denoise ? 'product' : 'raw-debug') : row.denoise ? 'denoised' : 'raw'
    lines.push(
      `| ${row.resolution.width}x${row.resolution.height} | ${row.mode} | ${row.vbaoResolution} | ${row.view} | ${outputLabel} | ${metrics.patternNoiseScore.toFixed(5)} | ${metrics.stripeScore.toFixed(5)} | ${metrics.horizontalStripeScore.toFixed(5)} | ${metrics.verticalStripeScore.toFixed(5)} | ${metrics.directionalAnisotropy.toFixed(5)} |`,
    )
  }
  lines.push('')
  lines.push('## AO Production Pass Timing Status')
  lines.push('')
  lines.push('Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, while `unmeasured` means the pass participates but this collector has not captured a pass-level GPU timestamp yet.')
  lines.push('')
  lines.push('| Resolution | Algorithm | VBAO res | Output | Pass | Status | GPU ms |')
  lines.push('| --- | --- | --- | --- | --- | --- | ---: |')
  for (const row of report.rows) {
    const outputLabel =
      row.mode === 'vbao' ? (row.denoise ? 'product' : 'raw-debug') : row.denoise ? 'denoised' : 'raw'
    for (const passTiming of row.passTimings ?? []) {
      const gpuMs =
        passTiming.gpuMs === null || passTiming.gpuMs === undefined
          ? 'n/a'
          : passTiming.gpuMs.toFixed(3)
      lines.push(
        `| ${row.resolution.width}x${row.resolution.height} | ${row.mode} | ${row.vbaoResolution} | ${outputLabel} | ${passTiming.pass} | ${passTiming.status} | ${gpuMs} |`,
      )
    }
  }
  lines.push('')
  lines.push('Metric basis:')
  lines.push('- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.')
  lines.push('- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.')
  lines.push('- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.')
  lines.push('- Crop excludes demo chrome and the bottom-right controls.')
  await writeFile(outputMd, `${lines.join('\n')}\n`)
}
