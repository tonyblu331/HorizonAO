/**
 * Compile-time constants and clamped defaults for {@link VBAONode}.
 *
 * Pinned by `openspec/specs/vbao-node/spec.md` and `openspec/changes/vbao-pivot/design.md`.
 *
 * SECTOR_COUNT and the quality tier values are **NOT user-adjustable** in v1.
 * Product quality presets now use fixed slice/sample loop shapes while
 * preserving the same 32-sector bitmask contract.
 */

/**
 * Number of sectors in the per-slice visibility bitmask.
 *
 * Fixed at 32 in v1 to ship a single shader variant and to take advantage
 * of native WGSL `countOneBits()` on a `u32` value (1 cycle on WebGPU,
 * ~12 ALU ops in the GLSL emulation on WebGL2).
 */
export const SECTOR_COUNT = 32 as const

export const VBAO_THETA_MIN = -Math.PI * 0.5
export const VBAO_THETA_MAX = Math.PI * 0.5
export const VBAO_THETA_RANGE = Math.PI
export const VBAO_THETA_STEP = VBAO_THETA_RANGE / SECTOR_COUNT

/**
 * Internal finite-thickness policy for raw visibility intervals.
 *
 * These ratios are not public API. They keep the current contact behavior named
 * so reference gates can fit replacements without brittle source-literal tests.
 */
export const VBAO_CONTACT_THICKNESS_RADIUS_RATIO = 0.3 as const
export const VBAO_NEAR_SAMPLE_THICKNESS_RATIO = 0.85 as const
export const VBAO_CONTACT_THICKNESS_MIN_RATIO = 0.12 as const
export const VBAO_DEFAULT_CONTACT = 0.45 as const

function clampFinite(v: number, min: number, max: number): number {
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min
}

export function resolveVbaoContactThickness(radius: number, contact: number): number {
  const safeRadius = Math.max(0, Number.isFinite(radius) ? radius : 0)
  const safeContact = clampFinite(contact, 0, 1)
  const ratio =
    VBAO_CONTACT_THICKNESS_MIN_RATIO +
    (VBAO_CONTACT_THICKNESS_RADIUS_RATIO - VBAO_CONTACT_THICKNESS_MIN_RATIO) *
      safeContact

  return safeRadius * ratio
}

/**
 * Default values for the public `VBAONode` uniforms.
 *
 * `resolutionScale` is a JS field on `VBAONode`, not a raw AO uniform; included
 * here because quality tiers override it alongside the shader values.
 */
export const VBAO_DEFAULTS = Object.freeze({
  radius: 1.25,
  contact: VBAO_DEFAULT_CONTACT,
  thickness: resolveVbaoContactThickness(1.25, VBAO_DEFAULT_CONTACT),
  strength: 1.0,
  contrast: 1.0,
  softness: 0.0,
  slices: 3,
  samples: 8,
  resolutionScale: 0.5,
} as const)

/**
 * Clamp ranges for the public `VBAONode` uniforms.
 *
 * `samples` and `slices` are clamped to the 64-phase atlas layout used by the
 * production shader (`slice * 16 + sample`). That keeps public overrides inside
 * the non-aliasing phase budget instead of silently wrapping high sample counts.
 */
export const VBAO_CLAMP_RANGES = Object.freeze({
  radius: { min: 0.05, max: 8 },
  contact: { min: 0, max: 1 },
  thickness: { min: 0, max: 2 },
  strength: { min: 0, max: 1 },
  contrast: { min: 0, max: 4 },
  softness: { min: 0, max: 1 },
  slices: { min: 1, max: 4 },
  samples: { min: 2, max: 16 },
  resolutionScale: { min: 0.05, max: 1 },
} as const)

/**
 * Locked quality tier values.
 *
 * One sector count across all tiers (32); product presets vary only the fixed
 * slice/sample loop bounds.
 * Tier values are read by the demo and EVIDENCE capture; tier numbers are
 * pinned by `openspec/specs/vbao-node/spec.md` and any change requires a
 * spec amendment.
 */
export const VBAO_QUALITY_TIERS = Object.freeze({
  performance: { resolutionScale: 0.5, slices: 2, samples: 4, sectors: 32 },
  balanced: { resolutionScale: 0.75, slices: 3, samples: 6, sectors: 32 },
  quality: { resolutionScale: 1.0, slices: 4, samples: 8, sectors: 32 },
  ultra: { resolutionScale: 1.0, slices: 4, samples: 10, sectors: 32 },
} as const)

export type VBAOQualityPreset = keyof typeof VBAO_QUALITY_TIERS

/**
 * User-supplied options accepted by `VBAONode` constructor and the
 * `vbao(...)` factory.
 *
 * `sectors` is intentionally NOT a key — the value is compile-time in v1.
 */
export interface VBAONodeOptions {
  readonly quality?: VBAOQualityPreset
  /** @deprecated Use `quality`; kept temporarily for older HorizonAO callers. */
  readonly preset?: VBAOQualityPreset
  readonly radius?: number
  readonly contact?: number
  /** @deprecated Use `contact` or `advanced.thickness`; kept for older callers. */
  readonly thickness?: number
  readonly strength?: number
  /** @deprecated Use `advanced.contrast`; kept for older callers. */
  readonly contrast?: number
  readonly softness?: number
  /** @deprecated Use `contrast`; kept for GTAONode-style compatibility. */
  readonly scale?: number
  /** @deprecated Use `strength`; kept for older HorizonAO callers. */
  readonly intensity?: number
  /** @deprecated Use `advanced.slices`; kept for evidence and older callers. */
  readonly slices?: number
  /** @deprecated Use `advanced.samples`; kept for evidence and older callers. */
  readonly samples?: number
  /** @deprecated Use `advanced.resolutionScale`; kept for evidence and older callers. */
  readonly resolutionScale?: number
  readonly advanced?: {
    readonly thickness?: number
    readonly contrast?: number
    readonly slices?: number
    readonly samples?: number
    readonly resolutionScale?: number
  }
}

export interface VBAOResolvedNodeOptions {
  readonly radius: number
  readonly contact: number
  readonly thickness: number
  readonly strength: number
  readonly contrast: number
  readonly softness: number
  readonly slices: number
  readonly samples: number
  readonly resolutionScale: number
}

/**
 * Clamp a partial options bag against {@link VBAO_CLAMP_RANGES} and fill
 * any missing keys with {@link VBAO_DEFAULTS}.
 */
export function clampVbaoNodeOptions(options: VBAONodeOptions): VBAOResolvedNodeOptions {
  const qualityName = options.quality ?? options.preset
  const quality = qualityName === undefined ? undefined : VBAO_QUALITY_TIERS[qualityName]
  const advanced = options.advanced ?? {}
  const radius = clampFinite(options.radius ?? VBAO_DEFAULTS.radius, 0.05, 8)
  const contact = clampFinite(options.contact ?? VBAO_DEFAULTS.contact, 0, 1)
  const thickness =
    advanced.thickness ?? options.thickness ?? resolveVbaoContactThickness(radius, contact)

  return Object.freeze({
    radius,
    contact,
    thickness: clampFinite(thickness, 0, 2),
    strength: clampFinite(
      options.strength ?? options.intensity ?? VBAO_DEFAULTS.strength,
      0,
      1,
    ),
    contrast: clampFinite(
      advanced.contrast ?? options.contrast ?? options.scale ?? VBAO_DEFAULTS.contrast,
      0,
      4,
    ),
    softness: clampFinite(options.softness ?? VBAO_DEFAULTS.softness, 0, 1),
    slices: Math.round(
      clampFinite(advanced.slices ?? options.slices ?? quality?.slices ?? VBAO_DEFAULTS.slices, 1, 4),
    ),
    samples: Math.round(
      clampFinite(
        advanced.samples ?? options.samples ?? quality?.samples ?? VBAO_DEFAULTS.samples,
        2,
        16,
      ),
    ),
    resolutionScale: clampFinite(
      advanced.resolutionScale ??
        options.resolutionScale ??
        quality?.resolutionScale ??
        VBAO_DEFAULTS.resolutionScale,
      0.05,
      1,
    ),
  })
}
