#!/usr/bin/env node
/**
 * collect-vbao-temporal-camera-dolly.mjs — Gate 2: Camera dolly no-ghost
 *
 * TEMPORAL PROMOTION GATE 2: Camera motion (dolly) ghost-free verification.
 * Verifies that temporal reprojection produces no visible ghosting artifacts
 * during a smooth camera dolly sequence.
 *
 * MANUAL RUN INSTRUCTIONS:
 * ─────────────────────────────────────────────────────────────────────────
 * Prerequisites:
 *   1. Build the demo: pnpm --filter demo build
 *   2. Serve on port 5173: pnpm --filter demo preview
 *   3. Ensure a WebGPU-capable browser is available (Chrome 113+, Edge 113+)
 *
 * Run:
 *   node apps/demo/scripts/collect-vbao-temporal-camera-dolly.mjs
 *
 * Environment variables:
 *   VBAO_TEMPORAL_DOLLY_BASE_URL  - base URL (default: http://127.0.0.1:5173)
 *   VBAO_TEMPORAL_DOLLY_SCENE     - scene route (default: /vbao-temporal)
 *   VBAO_TEMPORAL_DOLLY_OUTPUT    - output JSON path
 *
 * Output JSON schema:
 * {
 *   "generatedAt": "ISO timestamp",
 *   "gate": "camera-dolly-no-ghost",
 *   "verdict": "pass" | "fail" | "incomplete",
 *   "frames": [
 *     { "frame": 0, "ghostScore": null }
 *   ],
 *   "maxGhostScore": null,
 *   "threshold": { "maxGhostScore": 0.02 }
 * }
 *
 * Ghost score definition: mean per-pixel AO difference between consecutive
 * frames normalized by the expected camera-driven reprojection error model.
 * Score < 0.02 → no perceptible ghosting.
 *
 * CPU-testable gate logic is in:
 *   packages/horizon-ao/reference/__tests__/vbaoTemporalPromotionGates.test.ts
 * ─────────────────────────────────────────────────────────────────────────
 *
 * PROMOTION GATE STATUS: reject-promotion
 * This gate is scaffolded. The verifier (verify-vbao-temporal-gate.mjs) returns
 * reject-promotion until all 4 gates have passed evidence. Do NOT flip promotion.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '../../..')
const artifactRoot = path.join(repoRoot, 'artifacts', 'benchmarks')

const baseUrl = process.env.VBAO_TEMPORAL_DOLLY_BASE_URL ?? 'http://127.0.0.1:5173'
const sceneRoute = process.env.VBAO_TEMPORAL_DOLLY_SCENE ?? '/vbao-temporal'
const outputJsonPath =
  process.env.VBAO_TEMPORAL_DOLLY_OUTPUT ??
  path.join(artifactRoot, 'vbao-temporal-camera-dolly-latest.json')

const GHOST_SCORE_THRESHOLD = 0.02

// ---------------------------------------------------------------------------
// CPU-side ghost score math (used by gate logic and vitest reference tests)
// ---------------------------------------------------------------------------

/**
 * Computes a ghost score from two consecutive AO frames.
 *
 * The ghost score is the mean absolute difference between the current frame's
 * AO and the reprojection of the previous frame, normalized by the motion
 * magnitude. Higher scores indicate more ghosting.
 *
 * This is the CPU-testable part of the gate.
 *
 * @param {Float32Array} prevAo   - Previous frame AO values
 * @param {Float32Array} currAo   - Current frame AO values
 * @param {number} motionMagnitude - Expected reprojection delta magnitude [0,1]
 * @returns {number} Ghost score (lower is better; 0 = perfect)
 */
export function computeGhostScore(prevAo, currAo, motionMagnitude) {
  if (prevAo.length !== currAo.length || prevAo.length === 0) {
    throw new RangeError(
      `computeGhostScore: arrays must be non-empty and equal length (got ${prevAo.length} vs ${currAo.length})`,
    )
  }
  if (motionMagnitude <= 0) return 0

  let sumAbsDiff = 0
  for (let i = 0; i < prevAo.length; i++) {
    sumAbsDiff += Math.abs(currAo[i] - prevAo[i])
  }
  const meanAbsDiff = sumAbsDiff / prevAo.length
  // Normalize: ghost score > motion magnitude means the difference is larger
  // than expected from geometry alone → ghosting artifact.
  return meanAbsDiff / motionMagnitude
}

/**
 * Evaluates the camera dolly no-ghost gate.
 *
 * @param {number[]} ghostScores - Per-frame ghost scores
 * @param {{ maxGhostScore: number }} threshold
 * @returns {{ verdict: 'pass' | 'fail', maxGhostScore: number | null }}
 */
export function evaluateDollyGate(ghostScores, threshold) {
  const validScores = ghostScores.filter((s) => s !== null && Number.isFinite(s))
  if (validScores.length === 0) return { verdict: 'fail', maxGhostScore: null }
  const maxGhostScore = Math.max(...validScores)
  const verdict = maxGhostScore <= threshold.maxGhostScore ? 'pass' : 'fail'
  return { verdict, maxGhostScore }
}

// ---------------------------------------------------------------------------
// GPU evidence collection (requires running browser — manual run)
// ---------------------------------------------------------------------------

async function collectDollyEvidence() {
  console.log(
    `[vbao-temporal-camera-dolly] Gate 2: camera dolly no-ghost scaffold\n` +
      `  Scene: ${baseUrl}${sceneRoute}\n` +
      `  Threshold: ghost score ≤ ${GHOST_SCORE_THRESHOLD}\n`,
  )

  const report = {
    generatedAt: new Date().toISOString(),
    gate: 'camera-dolly-no-ghost',
    verdict: 'incomplete',
    frames: [],
    maxGhostScore: null,
    threshold: { maxGhostScore: GHOST_SCORE_THRESHOLD },
    note: 'Scaffold: Playwright camera dolly sequence + GPU pixel readback not yet wired.',
  }

  await mkdir(path.dirname(outputJsonPath), { recursive: true })
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log(
    `[vbao-temporal-camera-dolly] Output: ${outputJsonPath}\n` +
      `  Verdict: ${report.verdict} (scaffold — GPU evidence required)\n`,
  )
}

await collectDollyEvidence()
