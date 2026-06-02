#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')
const outputJson = path.join(artifactRoot, 'ao-ground-truth-latest.json')
const outputMd = path.join(artifactRoot, 'ao-ground-truth-summary.md')
const sectorCount = Number(process.env.AO_GT_SECTORS ?? 32)
const thetaMin = -Math.PI / 2
const thetaMax = Math.PI / 2
const thetaRange = Math.PI

const fixtures = [
  {
    id: 'flat-plane-open',
    description: 'No above-surface occluder; AO should remain open.',
    intervals: [],
  },
  {
    id: 'full-hemisphere-blocker',
    description: 'Entire visible hemislice blocked; AO should be dark.',
    intervals: [[thetaMin, thetaMax]],
  },
  {
    id: 'two-wall-corner-gap',
    description: 'Two broad wall lobes with a center opening.',
    intervals: [[-1.2, -0.2], [0.2, 1.2]],
  },
  {
    id: 'thin-pole',
    description: 'Single finite thin occluder; should not become a fat halo.',
    intervals: [[-0.06, 0.06]],
  },
  {
    id: 'thin-fence-separated',
    description: 'Several separated thin occluders; bitmask should preserve gaps better than horizon envelope.',
    intervals: [[-0.75, -0.68], [-0.2, -0.13], [0.23, 0.3], [0.7, 0.77]],
  },
  {
    id: 'grazing-wall-side',
    description: 'One grazing-side occluder; tests false broad darkening.',
    intervals: [[0.95, 1.35]],
  },
]

function clampTheta(value) {
  return Math.max(thetaMin, Math.min(thetaMax, value))
}

function cosineCdf(theta) {
  return 0.5 * (Math.sin(clampTheta(theta)) + 1)
}

function normalizeIntervals(intervals) {
  return intervals
    .map(([a, b]) => [Math.min(clampTheta(a), clampTheta(b)), Math.max(clampTheta(a), clampTheta(b))])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])
}

function unionIntervals(intervals) {
  const normalized = normalizeIntervals(intervals)
  const result = []
  for (const interval of normalized) {
    const last = result.at(-1)
    if (!last || interval[0] > last[1]) result.push([...interval])
    else last[1] = Math.max(last[1], interval[1])
  }
  return result
}

function physicalAccessibility(intervals) {
  const union = unionIntervals(intervals)
  const occludedMeasure = union.reduce((sum, [a, b]) => sum + cosineCdf(b) - cosineCdf(a), 0)
  return Math.max(0, Math.min(1, 1 - occludedMeasure))
}

function vbaoSectorAccessibility(intervals) {
  const bits = new Set()
  for (const [a, b] of normalizeIntervals(intervals)) {
    const u0 = cosineCdf(a)
    const u1 = cosineCdf(b)
    const first = Math.ceil(Math.min(u0, u1) * sectorCount - 0.5)
    const last = Math.floor(Math.max(u0, u1) * sectorCount - 0.5)
    for (let k = Math.max(0, first); k <= Math.min(sectorCount - 1, last); k++) bits.add(k)
  }
  return 1 - bits.size / sectorCount
}

function gtaoHorizonEnvelopeAccessibility(intervals) {
  const normalized = normalizeIntervals(intervals)
  if (normalized.length === 0) return 1
  const minTheta = Math.min(...normalized.map(([a]) => a))
  const maxTheta = Math.max(...normalized.map(([, b]) => b))
  return physicalAccessibility([[minTheta, maxTheta]])
}

function ssaoUniformSampleAccessibility(intervals) {
  const normalized = normalizeIntervals(intervals)
  if (normalized.length === 0) return 1

  let occluded = 0
  for (let i = 0; i < sectorCount; i++) {
    const theta = thetaMin + ((i + 0.5) / sectorCount) * thetaRange
    if (normalized.some(([a, b]) => theta >= a && theta <= b)) occluded++
  }

  return 1 - occluded / sectorCount
}

function absError(value, reference) {
  return Math.abs(value - reference)
}

const rows = fixtures.map((fixture) => {
  const reference = physicalAccessibility(fixture.intervals)
  const vbao = vbaoSectorAccessibility(fixture.intervals)
  const gtao = gtaoHorizonEnvelopeAccessibility(fixture.intervals)
  const ssao = ssaoUniformSampleAccessibility(fixture.intervals)
  return {
    ...fixture,
    intervals: fixture.intervals.map(([a, b]) => [Number(a.toFixed(5)), Number(b.toFixed(5))]),
    referenceAccessibility: reference,
    candidates: [
      {
        algorithm: 'vbao-32-sector',
        accessibility: vbao,
        absError: absError(vbao, reference),
        note: 'Visibility-bitmask sector approximation of cosine-measure hemisphere visibility.',
      },
      {
        algorithm: 'gtao-horizon-envelope-proxy',
        accessibility: gtao,
        absError: absError(gtao, reference),
        note: 'Continuous min/max horizon envelope proxy; intentionally shows how horizon methods can over-merge separated blockers.',
      },
      {
        algorithm: 'ssao-uniform-sample-proxy',
        accessibility: ssao,
        absError: absError(ssao, reference),
        note: 'Classic SSAO-style binary uniform angular sample count proxy; intentionally lacks cosine-measure weighting and finite-sector gap representation.',
      },
    ],
  }
})

const algorithms = ['vbao-32-sector', 'gtao-horizon-envelope-proxy', 'ssao-uniform-sample-proxy']
const summary = algorithms.map((algorithm) => {
  const errors = rows.map((row) => row.candidates.find((candidate) => candidate.algorithm === algorithm).absError)
  const mae = errors.reduce((sum, value) => sum + value, 0) / errors.length
  const rmse = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length)
  const worstIndex = errors.indexOf(Math.max(...errors))
  return {
    algorithm,
    mae,
    rmse,
    worstFixture: rows[worstIndex].id,
    worstAbsError: errors[worstIndex],
  }
}).sort((a, b) => a.mae - b.mae)

const report = {
  generatedAt: new Date().toISOString(),
  basis: 'Cosine-weighted hemislice visibility reference: accessibility = 1 - union(cosine-measure occluded intervals). This is a CPU fixture baseline, not a live GPU readback.',
  sectorCount,
  rows,
  summary,
}

await mkdir(artifactRoot, { recursive: true })
await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`)

const lines = []
lines.push('# AO Ground Truth Baseline Summary')
lines.push('')
lines.push(`Generated: ${report.generatedAt}`)
lines.push('')
lines.push('Basis: cosine-weighted hemislice visibility. Lower error is closer to the physical AO reference.')
lines.push('')
lines.push('| Algorithm | MAE ↓ | RMSE ↓ | Worst fixture | Worst abs error ↓ |')
lines.push('| --- | ---: | ---: | --- | ---: |')
for (const item of summary) {
  lines.push(`| ${item.algorithm} | ${item.mae.toFixed(4)} | ${item.rmse.toFixed(4)} | ${item.worstFixture} | ${item.worstAbsError.toFixed(4)} |`)
}
lines.push('')
lines.push('| Fixture | Reference | VBAO-32 | VBAO err | GTAO envelope proxy | GTAO err | SSAO uniform proxy | SSAO err |')
lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
for (const row of rows) {
  const vbao = row.candidates.find((candidate) => candidate.algorithm === 'vbao-32-sector')
  const gtao = row.candidates.find((candidate) => candidate.algorithm === 'gtao-horizon-envelope-proxy')
  const ssao = row.candidates.find((candidate) => candidate.algorithm === 'ssao-uniform-sample-proxy')
  lines.push(`| ${row.id} | ${row.referenceAccessibility.toFixed(4)} | ${vbao.accessibility.toFixed(4)} | ${vbao.absError.toFixed(4)} | ${gtao.accessibility.toFixed(4)} | ${gtao.absError.toFixed(4)} | ${ssao.accessibility.toFixed(4)} | ${ssao.absError.toFixed(4)} |`)
}
lines.push('')
lines.push('Notes:')
lines.push('- This baseline is deliberately small and deterministic.')
lines.push('- It evaluates physical visibility behavior, not FPS.')
lines.push('- The GTAO row is a horizon-envelope proxy, not Three.js GTAONode readback.')
lines.push('- The SSAO row is a uniform binary sample-count proxy, not a renderer-specific SSAO implementation.')
lines.push('- Use this to catch false broadening, thin-occluder halos, and separated-blocker over-merging.')
await writeFile(outputMd, `${lines.join('\n')}\n`)

console.log(JSON.stringify({ outputJson, outputMd, rows: rows.length, summary }, null, 2))
