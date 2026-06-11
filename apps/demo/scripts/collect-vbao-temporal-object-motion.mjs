#!/usr/bin/env node
/**
 * collect-vbao-temporal-object-motion.mjs — Gate 3: Object motion no-ghost
 *
 * TEMPORAL PROMOTION GATE 3: Dynamic object ghost-free verification.
 * Verifies that temporal reprojection correctly handles moving objects and
 * does not retain stale AO from previous object positions.
 *
 * MANUAL RUN INSTRUCTIONS:
 * ─────────────────────────────────────────────────────────────────────────
 * Prerequisites:
 *   1. Build the demo: pnpm --filter demo build
 *   2. Serve on port 5173: pnpm --filter demo preview
 *   3. Ensure a WebGPU-capable browser is available (Chrome 113+, Edge 113+)
 *
 * Run:
 *   node apps/demo/scripts/collect-vbao-temporal-object-motion.mjs
 *
 * Environment variables:
 *   VBAO_TEMPORAL_OBJMOTION_BASE_URL  - base URL (default: http://127.0.0.1:5173)
 *   VBAO_TEMPORAL_OBJMOTION_SCENE     - scene route (default: /vbao-temporal)
 *   VBAO_TEMPORAL_OBJMOTION_OUTPUT    - output JSON path
 *
 * Output JSON schema:
 * {
 *   "generatedAt": "ISO timestamp",
 *   "gate": "object-motion-no-ghost",
 *   "verdict": "pass" | "fail" | "incomplete",
 *   "frames": [],
 *   "threshold": { "maxResidualScore": 0.03 },
 *   "maxResidualScore": null
 * }
 *
 * Residual score: mean AO residual at formerly-occluded pixels after the
 * object moves away. Score < 0.03 → AO clears within the reliability counter
 * warmup window (≤15 frames reset on validity failure).
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

const baseUrl = process.env.VBAO_TEMPORAL_OBJMOTION_BASE_URL ?? 'http://127.0.0.1:5173'
const sceneRoute = process.env.VBAO_TEMPORAL_OBJMOTION_SCENE ?? '/vbao-temporal'
const outputJsonPath =
  process.env.VBAO_TEMPORAL_OBJMOTION_OUTPUT ??
  path.join(artifactRoot, 'vbao-temporal-object-motion-latest.json')

const RESIDUAL_THRESHOLD = 0.03

// ---------------------------------------------------------------------------
// CPU-side residual math (used by gate logic and vitest reference tests)
// ---------------------------------------------------------------------------

/**
 * Computes the mean AO residual at formerly-occluded pixels.
 *
 * After an occluder moves away, the revealed background pixels should have
 * AO close to 1.0 (unoccluded). The residual is the mean deviation from 1.0
 * at those pixel positions.
 *
 * This is the CPU-testable part of the gate.
 *
 * @param {Float32Array} aoValues - AO values at formerly-occluded pixel positions
 * @returns {number} Mean residual (0 = fully cleared, 1 = fully stale)
 */
export function computeOcclusionResidual(aoValues) {
  if (aoValues.length === 0) {
    throw new RangeError('computeOcclusionResidual: aoValues must be non-empty')
  }
  let sum = 0
  for (let i = 0; i < aoValues.length; i++) {
    // Residual: distance from unoccluded value (1.0)
    sum += 1.0 - aoValues[i]
  }
  return sum / aoValues.length
}

/**
 * Evaluates the object motion no-ghost gate.
 *
 * @param {number[]} residualByFrame - Per-frame residual scores
 * @param {{ maxResidualScore: number }} threshold
 * @returns {{ verdict: 'pass' | 'fail', maxResidualScore: number | null }}
 */
export function evaluateObjectMotionGate(residualByFrame, threshold) {
  const validScores = residualByFrame.filter((s) => s !== null && Number.isFinite(s))
  if (validScores.length === 0) return { verdict: 'fail', maxResidualScore: null }
  const maxResidualScore = Math.max(...validScores)
  const verdict = maxResidualScore <= threshold.maxResidualScore ? 'pass' : 'fail'
  return { verdict, maxResidualScore }
}

// ---------------------------------------------------------------------------
// GPU evidence collection (requires running browser — manual run)
// ---------------------------------------------------------------------------

async function collectObjectMotionEvidence() {
  console.log(
    `[vbao-temporal-object-motion] Gate 3: object motion no-ghost scaffold\n` +
      `  Scene: ${baseUrl}${sceneRoute}\n` +
      `  Threshold: residual score ≤ ${RESIDUAL_THRESHOLD}\n`,
  )

  const report = {
    generatedAt: new Date().toISOString(),
    gate: 'object-motion-no-ghost',
    verdict: 'incomplete',
    frames: [],
    maxResidualScore: null,
    threshold: { maxResidualScore: RESIDUAL_THRESHOLD },
    note: 'Scaffold: dynamic object sequence + GPU pixel readback not yet wired. Scene needs a moving occluder path.',
  }

  await mkdir(path.dirname(outputJsonPath), { recursive: true })
  await writeFile(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log(
    `[vbao-temporal-object-motion] Output: ${outputJsonPath}\n` +
      `  Verdict: ${report.verdict} (scaffold — GPU evidence required)\n`,
  )
}

await collectObjectMotionEvidence()
