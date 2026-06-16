/**
 * Pure-TS temporal accumulation math for {@link VBAOTemporalAccumulateNode}.
 *
 * All functions are pure (no side effects, no Three.js dependencies) so they
 * are fully vitest-testable without a WebGPU context.
 *
 * Design: sdd/vbao-temporal/design — shared math extracted from the private
 * VBAOVelocityTemporalNode so both nodes consume one source of truth.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec2 {
  readonly x: number
  readonly y: number
}

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/**
 * State of a single pixel for reprojection validity testing.
 *
 * `uv` is the UV coordinate in [0,1]².
 * `viewLen` is the length of the view-space position vector (depth proxy).
 * `normal` is the world/view-space surface normal (unit vector).
 */
export interface ReprojectionSample {
  readonly uv: Vec2
  readonly viewLen: number
  readonly normal: Vec3
}

/**
 * Validity thresholds for {@link isReprojectionValid}.
 *
 * `relDepth` — maximum allowed relative depth difference (spec: 0.05, strict <).
 * `normalDot` — minimum allowed dot product between curr and prev normals (spec: 0.906, strict >).
 */
export interface ReprojectionThresholds {
  readonly relDepth: number
  readonly normalDot: number
}

// ---------------------------------------------------------------------------
// §Depth-Reprojection Validity (Tier-1)
//
// Spec: a history sample is VALID only when ALL three sub-tests pass:
//   1. prevUV within [0,1]² (on-screen bounds)
//   2. abs(curr_len - prev_len) / curr_len < relDepth (relative-depth test, strict <)
//   3. dot(N_curr, N_prev) > normalDot (normal continuity, strict >)
// ---------------------------------------------------------------------------

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/**
 * Returns `true` only when all three reprojection validity sub-tests pass.
 *
 * On ANY failure the caller should force blend weight α to 1.0 (raw AO, no history).
 */
export function isReprojectionValid(
  curr: ReprojectionSample,
  prev: ReprojectionSample,
  thresholds: ReprojectionThresholds,
): boolean {
  // Sub-test 1: on-screen bounds
  const { uv: prevUv } = prev
  if (prevUv.x < 0 || prevUv.x > 1 || prevUv.y < 0 || prevUv.y > 1) {
    return false
  }

  // Sub-test 2: relative depth (strict <)
  const relDepth = Math.abs(curr.viewLen - prev.viewLen) / Math.max(curr.viewLen, 1e-8)
  if (relDepth >= thresholds.relDepth) {
    return false
  }

  // Sub-test 3: normal continuity (strict >)
  const nd = dot3(curr.normal, prev.normal)
  if (nd <= thresholds.normalDot) {
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// §AABB Variance Clamping
//
// Spec: history sample MUST be clamped to [neighborMin − pad, neighborMax + pad].
// Default pad = 0.05.
// ---------------------------------------------------------------------------

/**
 * Clamps `history` to the neighborhood range `[neighborMin − pad, neighborMax + pad]`.
 *
 * Returns `history` unchanged when it is already inside the padded range.
 */
export function clampToAABB(
  history: number,
  neighborMin: number,
  neighborMax: number,
  pad = 0.05,
): number {
  const lo = neighborMin - pad
  const hi = neighborMax + pad
  return Math.min(hi, Math.max(lo, history))
}

// ---------------------------------------------------------------------------
// Reprojection matrix composition
//
// Spec: P_prev_clip = proj_prev * view_prev * view_curr_inv * vec4(P_view, 1)
// Returns a column-major 4×4 matrix (16 elements, same layout as Three.js Matrix4.elements).
// ---------------------------------------------------------------------------

/**
 * Multiplies two 4×4 column-major matrices: result = a * b.
 */
function multiplyMat4(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(16).fill(0)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) {
        // Use non-null assertion: the caller passes 16-element arrays
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        sum += a[k * 4 + row]! * b[col * 4 + k]!
      }
      out[col * 4 + row] = sum
    }
  }
  return out
}

/**
 * Builds the reprojection matrix `proj_prev * view_prev * view_curr_inv`.
 *
 * All matrices are column-major 4×4 arrays (16 elements, Three.js layout).
 *
 * Usage in shader:
 * ```
 * P_prev_clip = buildReprojMatrix(projPrev, viewPrev, viewCurrInv) * vec4(P_view, 1.0)
 * prevUV      = (P_prev_clip.xy / P_prev_clip.w) * 0.5 + 0.5
 * ```
 */
export function buildReprojMatrix(
  projPrev: readonly number[],
  viewPrev: readonly number[],
  viewCurrInv: readonly number[],
): number[] {
  // proj_prev * (view_prev * view_curr_inv)
  const viewChain = multiplyMat4(viewPrev, viewCurrInv)
  return multiplyMat4(projPrev, viewChain)
}

// ---------------------------------------------------------------------------
// §EMA Blend Core
//
// Spec: output[t] = lerp(clampedHistory[t-1], raw_ao[t], α)
// α = 1 → raw AO (cold start / validity failure)
// α = 0 → full history (maximum accumulation)
// ---------------------------------------------------------------------------

/**
 * Exponential moving average blend.
 *
 * Returns `lerp(history, raw, alpha)`.
 * `alpha = 1.0` → returns `raw` (discard history).
 * `alpha = 0.0` → returns `history` (keep history).
 */
export function emaBlend(history: number, raw: number, alpha: number): number {
  return history + (raw - history) * alpha
}

// ---------------------------------------------------------------------------
// §Confidence-Adaptive α (PR2)
//
// Spec: α = mix(alpha.min, alpha.max, 1.0 − confidence)
// confidence=1 → α=min (maximum accumulation — fully confident, trust history)
// confidence=0 → α=max (minimum accumulation — no confidence, weight new frame)
// ---------------------------------------------------------------------------

/**
 * Compute the adaptive blend weight α from a per-pixel confidence value.
 *
 * Implements: `α = mix(bounds.min, bounds.max, 1.0 - confidence)`
 *
 * `confidence` is sampled from channel-G of the half-res raw VBAONode output
 * (bilinear upsample at full-res UV is acceptable — see design decision on
 * confidence reconciliation).
 *
 * Regardless of this formula, validity failure must override α to 1.0 (the
 * caller is responsible for applying the override; this function is pure).
 */
export function adaptiveAlpha(
  confidence: number,
  bounds: { readonly min: number; readonly max: number },
): number {
  const t = 1.0 - confidence
  return bounds.min + (bounds.max - bounds.min) * t
}

// ---------------------------------------------------------------------------
// §TSVGF Reliability Counter → α scale (PR2)
//
// Spec: 4-bit counter per pixel, packed into the G channel of the RG16F
// ping-pong pair. Counter increments on valid reprojection (saturating at 15),
// resets to 0 on failure. Used to scale α so low-counter pixels get higher
// blend weight (less history trust).
//
// RG16F G channel stores counter as a direct integer (0.0..15.0).
// fp16 can represent integers 0-2048 exactly, so 0-15 round-trips correctly.
//
// Design decision: store raw integer, retrieve with floor(g).
// ---------------------------------------------------------------------------

/**
 * Updates the 4-bit reliability counter for a single pixel.
 *
 * - `valid=true` → increment by 1, saturate at 15.
 * - `valid=false` → reset to 0.
 *
 * This is a pure function; the result is written into the history G channel
 * each frame by `VBAOTemporalAccumulateNode`.
 */
export function updateReliabilityCounter(counter: number, valid: boolean): number {
  return valid ? Math.min(15, counter + 1) : 0
}

/**
 * Maps a 4-bit reliability counter (0–15) to an α scale factor.
 *
 * Scale decreases monotonically as the counter increases:
 * - `counter=0` → `scale=1.0` (no history, force full new-frame weight)
 * - `counter=15` → `scale=0.0` (fully warmed up, use adaptive α as-is)
 *
 * The final blend weight is: `α_final = max(adaptiveAlpha, scale)`
 * (or equivalently, `scale` overrides adaptive α only when counter is low).
 *
 * Formula: `scale = 1.0 - counter / 15`
 */
export function counterToAlphaScale(counter: number): number {
  return 1.0 - counter / 15
}

// ---------------------------------------------------------------------------
// §Halton Temporal Phase (PR3)
//
// Spec: halton(index, base) — low-discrepancy Van der Corput sequence.
//   - index: sample index (0-based, non-negative integer)
//   - base:  prime base (2 for x, 3 for y in Halton 2D)
//
// The caller is responsible for the mod-N wrap:
//   haltonPhase = halton(frameCounter % N, base)
//
// base=2, index=0..7 → [0, 0.5, 0.25, 0.75, 0.125, 0.625, 0.375, 0.875]
// ---------------------------------------------------------------------------

/**
 * Returns the `index`-th value of the Van der Corput sequence in the given `base`.
 *
 * Pure function; no side effects. Output is in [0, 1).
 *
 * Usage for temporal phase selection (8-phase Halton-2 cycle):
 * ```ts
 * const phase = halton(frameCounter % 8, 2)
 * ```
 */
export function halton(index: number, base: number): number {
  let result = 0
  let f = 1
  let i = index

  while (i > 0) {
    f = f / base
    result += f * (i % base)
    i = Math.floor(i / base)
  }

  return result
}
