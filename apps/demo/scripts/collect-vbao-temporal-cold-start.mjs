#!/usr/bin/env node
/**
 * collect-vbao-temporal-cold-start.mjs — Gate 4: Cold-start ≤3 frames
 *
 * TEMPORAL PROMOTION GATE 4: Cold-start convergence window.
 * Verifies that on the first 3 frames (frames 0–2), the temporal path does
 * not introduce noticeable flicker or overly dark AO relative to the single-
 * frame spatial reference. The reliability counter starts at 0 and ramps up;
 * the cold-start α override (counterToAlphaScale) ensures the first frames
 * weight toward the current frame, not stale history.
 *
 * MANUAL RUN INSTRUCTIONS:
 * ─────────────────────────────────────────────────────────────────────────
 * Prerequisites:
 *   1. Build the demo: pnpm --filter demo build
 *   2. Serve on port 5173: pnpm --filter demo preview
 *   3. Ensure a WebGPU-capable browser is available (Chrome 113+, Edge 113+)
 *
 * Run:
 *   node apps/demo/scripts/collect-vbao-temporal-cold-start.mjs
 *
 * Environment variables:
 *   VBAO_TEMPORAL_COLDSTART_BASE_URL  - base URL (default: http://127.0.0.1:5173)
 *   VBAO_TEMPORAL_COLDSTART_SCENE     - scene route (default: /vbao-temporal)
 *   VBAO_TEMPORAL_COLDSTART_OUTPUT    - output JSON path
 *
 * Output JSON schema:
 * {
 *   "generatedAt": "ISO timestamp",
 *   "gate": "cold-start",
 *   "verdict": "pass" | "fail" | "incomplete",
 *   "frames": [
 *     { "frame": 0, "deviationFromSpatial": null },
 *     { "frame": 1, "deviationFromSpatial": null },
 *     { "frame": 2, "deviationFromSpatial": null }
 *   ],
 *   "threshold": { "maxDeviationFromSpatial": 0.08, "windowFrames": 3 },
 *   "maxDeviationFromSpatial": null
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

const baseUrl = process.env.VBAO_TEMPORAL_COLDSTART_BASE_URL ?? 'http://127.0.0.1:5173'
const sceneRoute = process.env.VBAO_TEMPORAL_COLDSTART_SCENE ?? '/vbao-temporal'
const outputJsonPath =
  process.env.VBAO_TEMPORAL_COLDSTART_OUTPUT ??
  path.join(artifactRoot, 'vbao-temporal-cold-start-latest.json')

const MAX_DEVIATION_FROM_SPATIAL = 0.08
const COLD_START_WINDOW_FRAMES = 3 // frames 0, 1, 2

// ---------------------------------------------------------------------------
// CPU-side cold-start math (used by gate logic and vitest reference tests)
// ---------------------------------------------------------------------------

/**
 * Simulates the per-pixel blend weight during cold-start using the reliability
 * counter model. This is the CPU-testable part of the gate.
 *
 * @param {number} frameIndex - 0-based frame index (0 = first frame)
 * @param {number} adaptiveAlpha - Steady-state adaptive α (e.g. 0.1 at confidence=0.5)
 * @returns {number} Effective blend weight α for this frame
 */
export function computeColdStartAlpha(frameIndex, adaptiveAlpha) {
  // The reliability counter starts at 0 (history invalid) and increments each
  // valid reprojection frame. counterToAlphaScale(counter) = 1 - counter/15.
  // Effective α = max(adaptiveAlpha, counterToAlphaScale(counter)).
  //
  // Frame 0: counter = 0 → scale = 1.0 → α = max(adaptiveAlpha, 1.0) = 1.0 (full new frame)
  // Frame 1: counter = 1 → scale = 14/15 ≈ 0.933 → α = max(adaptiveAlpha, 0.933)
  // Frame 2: counter = 2 → scale = 13/15 ≈ 0.867 → α = max(adaptiveAlpha, 0.867)
  const counter = Math.min(frameIndex, 15)
  const counterScale = 1.0 - counter / 15
  return Math.max(adaptiveAlpha, counterScale)
}

/**
 * Estimates the deviation from full-spatial reference at a cold-start frame.
 *
 * During cold start, α is high (closer to 1), so the output is close to the
 * current spatial-only sample. Deviation = expected blend residual.
 *
 * @param {number} frameIndex - 0-based frame index
 * @param {number} adaptiveAlpha - Steady-state adaptive α
 * @param {number} spatialSample - Full-spatial reference AO value for this pixel
 * @param {number} temporalHistory - Previous frame AO (0 on frame 0)
 * @returns {number} Expected AO deviation from spatial reference
 */
export function computeColdStartDeviation(frameIndex, adaptiveAlpha, spatialSample, temporalHistory) {
  const alpha = computeColdStartAlpha(frameIndex, adaptiveAlpha)
  const blendedAo = temporalHistory + (spatialSample - temporalHistory) * alpha
  return Math.abs(blendedAo - spatialSample)
}

/**
 * Evaluates the cold-start gate from per-frame spatial deviations.
 *
 * @param {number[]} deviationByFrame - Per-frame max deviation from spatial reference
 * @param {{ maxDeviationFromSpatial: number, windowFrames: number }} threshold
 * @returns {{ verdict: 'pass' | 'fail', maxDeviationFromSpatial: number | null }}
 */
export function evaluateColdStartGate(deviationByFrame, threshold) {
  const validDeviations = deviationByFrame
    .slice(0, threshold.windowFrames)
    .filter((d) => d !== null && Number.isFinite(d))
  if (validDeviations.length === 0) return { verdict: 'fail', maxDeviationFromSpatial: null }
  const maxDeviationFromSpatial = Math.max(...validDeviations)
  const verdict = maxDeviationFromSpatial <= threshold.maxDeviationFromSpatial ? 'pass' : 'fail'
  return { verdict, maxDeviationFromSpatial }
}

// ---------------------------------------------------------------------------
// GPU evidence collection (requires running browser — manual run)
// ---------------------------------------------------------------------------

async function collectColdStartEvidence() {
  console.log(
    `[vbao-temporal-cold-start] Gate 4: cold-start ≤${COLD_START_WINDOW_FRAMES} frames scaffold\n` +
      `  Scene: ${baseUrl}${sceneRoute}\n` +
      `  Threshold: deviation ≤ ${MAX_DEVIATION_FROM_SPATIAL} over ${COLD_START_WINDOW_FRAMES} frames\n`,
  )

  const scaffoldFrames = Array.from({ length: COLD_START_WINDOW_FRAMES }, (_, i) => ({
    frame: i,
    deviationFromSpatial: null,
  }))

  const report = {
    generatedAt: new Date().toISOString(),
    gate: 'cold-start',
    verdict: 'incomplete',
    frames: scaffoldFrames,
    threshold: {
      maxDeviationFromSpatial: MAX_DEVIATION_FROM_SPATIAL,
      windowFrames: COLD_START_WINDOW_FRAMES,
    },
    maxDeviationFromSpatial: null,
    note: 'Scaffold: GPU pixel readback on first 3 frames not yet wired.',
  }

  await mkdir(path.dirname(outputJsonPath), { recursive: true })
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log(
    `[vbao-temporal-cold-start] Output: ${outputJsonPath}\n` +
      `  Verdict: ${report.verdict} (scaffold — GPU evidence required)\n`,
  )
}

await collectColdStartEvidence()
