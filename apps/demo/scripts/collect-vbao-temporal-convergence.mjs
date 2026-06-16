#!/usr/bin/env node
/**
 * collect-vbao-temporal-convergence.mjs — Gate 1: Static convergence
 *
 * TEMPORAL PROMOTION GATE 1: Static scene RMSE convergence.
 * Verifies that the temporal accumulation path reaches ≤5% RMSE relative to
 * the full-sample spatial reference within 5 frames on a static camera.
 *
 * MANUAL RUN INSTRUCTIONS:
 * ─────────────────────────────────────────────────────────────────────────
 * Prerequisites:
 *   1. Build the demo: pnpm --filter demo build
 *   2. Serve on port 5173: pnpm --filter demo preview
 *   3. Ensure a WebGPU-capable browser is available (Chrome 113+, Edge 113+)
 *
 * Run:
 *   node apps/demo/scripts/collect-vbao-temporal-convergence.mjs
 *
 * Environment variables:
 *   VBAO_TEMPORAL_CONV_BASE_URL  - base URL (default: http://127.0.0.1:5173)
 *   VBAO_TEMPORAL_CONV_SCENE     - scene route (default: /vbao-temporal)
 *   VBAO_TEMPORAL_CONV_FRAMES    - frames to capture (default: 10)
 *   VBAO_TEMPORAL_CONV_OUTPUT    - output JSON path
 *
 * Output JSON schema:
 * {
 *   "generatedAt": "ISO timestamp",
 *   "gate": "static-convergence",
 *   "verdict": "pass" | "fail" | "incomplete",
 *   "frames": [
 *     { "frame": 0, "rmse": 0.12 },
 *     { "frame": 1, "rmse": 0.07 },
 *     { "frame": 4, "rmse": 0.04 }   ← should be ≤0.05 by frame 4
 *   ],
 *   "convergedByFrame": 4 | null,
 *   "threshold": { "maxRmse": 0.05, "byFrame": 4 }
 * }
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

const baseUrl = process.env.VBAO_TEMPORAL_CONV_BASE_URL ?? 'http://127.0.0.1:5173'
const sceneRoute = process.env.VBAO_TEMPORAL_CONV_SCENE ?? '/vbao-temporal'
const frameCount = Number(process.env.VBAO_TEMPORAL_CONV_FRAMES ?? 10)
const outputJsonPath =
  process.env.VBAO_TEMPORAL_CONV_OUTPUT ??
  path.join(artifactRoot, 'vbao-temporal-convergence-latest.json')

const RMSE_THRESHOLD = 0.05
const CONVERGENCE_BY_FRAME = 4 // must converge on or before this frame index (0-based)

// ---------------------------------------------------------------------------
// CPU-side convergence math (used by gate logic and vitest reference tests)
// ---------------------------------------------------------------------------

/**
 * Computes RMSE between two AO sample arrays (values in [0,1]).
 * This is the CPU-testable part of the gate.
 *
 * @param {Float32Array} reference - Full-sample spatial reference (ground truth)
 * @param {Float32Array} temporal  - Temporal accumulation output at frame N
 * @returns {number} RMSE in [0, 1]
 */
export function computeAoRmse(reference, temporal) {
  if (reference.length !== temporal.length || reference.length === 0) {
    throw new RangeError(
      `computeAoRmse: arrays must be non-empty and equal length (got ${reference.length} vs ${temporal.length})`,
    )
  }
  let sumSq = 0
  for (let i = 0; i < reference.length; i++) {
    const diff = reference[i] - temporal[i]
    sumSq += diff * diff
  }
  return Math.sqrt(sumSq / reference.length)
}

/**
 * Returns the first frame index where RMSE ≤ threshold, or null if never.
 *
 * @param {number[]} rmseByFrame - RMSE value at each frame (0-indexed)
 * @param {number} threshold     - Maximum acceptable RMSE
 * @returns {number | null}
 */
export function findConvergenceFrame(rmseByFrame, threshold) {
  for (let i = 0; i < rmseByFrame.length; i++) {
    if (rmseByFrame[i] <= threshold) return i
  }
  return null
}

/**
 * Evaluates the static convergence gate from a series of per-frame RMSE values.
 *
 * @param {number[]} rmseByFrame
 * @param {{ maxRmse: number, byFrame: number }} threshold
 * @returns {{ verdict: 'pass' | 'fail', convergedByFrame: number | null }}
 */
export function evaluateConvergenceGate(rmseByFrame, threshold) {
  const convergedByFrame = findConvergenceFrame(rmseByFrame, threshold.maxRmse)
  const verdict =
    convergedByFrame !== null && convergedByFrame <= threshold.byFrame ? 'pass' : 'fail'
  return { verdict, convergedByFrame }
}

// ---------------------------------------------------------------------------
// GPU evidence collection (requires running browser — manual run)
// ---------------------------------------------------------------------------

async function collectConvergenceEvidence() {
  console.log(
    `[vbao-temporal-convergence] Gate 1: static convergence scaffold\n` +
      `  Scene: ${baseUrl}${sceneRoute}\n` +
      `  Frames: ${frameCount}\n` +
      `  Threshold: RMSE ≤ ${RMSE_THRESHOLD} by frame ${CONVERGENCE_BY_FRAME}\n`,
  )

  // Placeholder: real collection requires Playwright + WebGPU readback.
  // The browser page at /vbao-temporal must expose window.vbaoTemporalDebug.readAoPixels()
  // returning a Float32Array of per-pixel AO values.
  //
  // Scaffold result — replace with real Playwright collection when wiring browser harness.
  const scaffoldFrames = Array.from({ length: frameCount }, (_, i) => ({
    frame: i,
    rmse: null, // null = not yet collected (GPU evidence required)
  }))

  const result = evaluateConvergenceGate(
    scaffoldFrames.map((f) => f.rmse ?? Infinity),
    { maxRmse: RMSE_THRESHOLD, byFrame: CONVERGENCE_BY_FRAME },
  )

  const report = {
    generatedAt: new Date().toISOString(),
    gate: 'static-convergence',
    verdict: 'incomplete', // remains incomplete until GPU evidence is collected
    frames: scaffoldFrames,
    convergedByFrame: result.convergedByFrame,
    threshold: { maxRmse: RMSE_THRESHOLD, byFrame: CONVERGENCE_BY_FRAME },
    note: 'Scaffold: GPU pixel readback not yet wired. Connect Playwright + window.vbaoTemporalDebug.readAoPixels().',
  }

  await mkdir(path.dirname(outputJsonPath), { recursive: true })
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log(
    `[vbao-temporal-convergence] Output: ${outputJsonPath}\n` +
      `  Verdict: ${report.verdict} (scaffold — GPU evidence required)\n`,
  )
}

await collectConvergenceEvidence()
