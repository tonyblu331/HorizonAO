/**
 * Sector-partition angles for the analytic VBAO reference math.
 *
 * These are REFERENCE-MATH constants, not runtime invariants: the production
 * shader works in phase-atlas coordinates, not theta angles, so it never reads
 * them. They live under `reference/` (out of the shipped `src/vbaoConstants.ts`)
 * and are derived from the runtime {@link SECTOR_COUNT}.
 */
import { SECTOR_COUNT } from '../src/vbaoConstants'

export const VBAO_THETA_MIN = -Math.PI * 0.5
export const VBAO_THETA_MAX = Math.PI * 0.5
export const VBAO_THETA_RANGE = Math.PI
export const VBAO_THETA_STEP = VBAO_THETA_RANGE / SECTOR_COUNT
