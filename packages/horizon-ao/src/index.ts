/**
 * `@horizonao/core` — VBAO (Visibility-Bitmask Ambient Occlusion) for TSL/WebGPU.
 *
 * The package name is historical (R1 rename scope; see ADR-007). The
 * source-level public node is `VBAONode`. The legacy `HorizonAoNode` and
 * its signed-horizon kernel have been removed from active source and
 * archived under `packages/horizon-ao/archive/`.
 */

export { VBAONode, vbao } from './VBAONode'
export {
  SECTOR_COUNT,
  VBAO_DEFAULTS,
  VBAO_CLAMP_RANGES,
  VBAO_QUALITY_TIERS,
  VBAO_SECTOR_ANGLES,
  clampVbaoNodeOptions,
  type VBAONodeOptions,
  type VBAOQualityPreset,
} from './vbaoConstants'
