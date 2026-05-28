import { writeFile } from 'node:fs/promises'

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
  lines.push('Metric basis:')
  lines.push('- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.')
  lines.push('- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.')
  lines.push('- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.')
  lines.push('- Crop excludes demo chrome and the bottom-right controls.')
  await writeFile(outputMd, `${lines.join('\n')}\n`)
}
