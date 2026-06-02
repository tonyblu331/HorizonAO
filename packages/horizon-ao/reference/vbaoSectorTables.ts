import { SECTOR_COUNT, VBAO_THETA_MIN, VBAO_THETA_STEP } from '../src/vbaoConstants'

/**
 * Reference/debug sector center angles in radians, indexed by sector `k ∈ [0, SECTOR_COUNT)`.
 *
 * Production sectorization uses cosine-measure CDF remapping and reduces by popcount, so these
 * tables are intentionally kept outside runtime `src/`.
 */
export const VBAO_REFERENCE_SECTOR_ANGLES: readonly number[] = Object.freeze(
  Array.from({ length: SECTOR_COUNT }, (_, k) => (k + 0.5) * VBAO_THETA_STEP + VBAO_THETA_MIN),
)

export const VBAO_REFERENCE_SECTOR_COSINES: readonly number[] = Object.freeze(
  VBAO_REFERENCE_SECTOR_ANGLES.map((theta) => Math.cos(theta)),
)

export const VBAO_REFERENCE_SECTOR_SINES: readonly number[] = Object.freeze(
  VBAO_REFERENCE_SECTOR_ANGLES.map((theta) => Math.sin(theta)),
)