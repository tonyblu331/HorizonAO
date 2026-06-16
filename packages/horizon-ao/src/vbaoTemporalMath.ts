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
