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
 * Fixed at 32 in v1 to ship a single shader variant and use native WGSL
 * `countOneBits()` on a `u32` value where available.
 */
export const SECTOR_COUNT = 32 as const

/**
 * Internal finite-thickness policy for raw visibility intervals.
 *
 * These ratios are not public API. They keep the current contact behavior named
 * so reference gates can fit replacements without brittle source-literal tests.
 */
export const VBAO_CONTACT_THICKNESS_RADIUS_RATIO = 0.3 as const
/**
 * Near-sample thickness ceiling ratio for the x²-spaced sample loop.
 *
 * Raised from 0.85 → 0.95 (Issue-2 contact-occlusion recovery).
 * With the old value of 0.85, the closest x²-spaced samples (indices 0–3 of 8)
 * had their effective thickness zeroed, making the thin-interval branch
 * unreachable and preventing contact-shadow mask bits from being set.
 * At 0.95, those samples retain finite effective thickness so the branch is
 * reachable and contact occlusion is correctly captured.
 *
 * CALLER CONTRACT: `near >= 0.1` is required for acceptable depth precision.
 * Results are undefined for smaller near values until reverse-Z is implemented.
 */
export const VBAO_NEAR_SAMPLE_THICKNESS_RATIO = 0.95 as const
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
  contrast: 1.8,
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
  /**
   * 3-slice preset. Note: with 3 uniformly-spaced slices a surface whose normal
   * happens to be perpendicular to every slice direction will produce NprojLen ≈ 0
   * (degeneracy), collapsing the projected-normal weighting. The `quality` and
   * `ultra` presets use 4 slices which avoids this degeneracy by construction.
   */
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
 * The public surface is `quality | radius | contact | strength | softness |
 * advanced`; older flat aliases are accepted at runtime as untyped shims
 * (see {@link VbaoDeprecatedOptionAliases}) but are not documented API.
 */
/**
 * Options for the public opt-in temporal AO accumulation path.
 *
 * Added in vbao-temporal PR1. `mode='velocity'` is guarded at construction
 * (Tier-2 implementation deferred to PR3; throws TypeError until then).
 */
/**
 * Temporal-specific quality presets for the opt-in temporal AO path.
 *
 * These are only active when `temporal` is enabled on `VBAONode`.
 * Each preset configures the raw AO slice/sample loop shape for temporal
 * accumulation contexts:
 * - `temporal-fast`:     1 slice × 2 samples — minimal per-frame cost; fastest warmup.
 * - `temporal-balanced`: 2 slices × 3 samples — balanced quality/cost.
 * - `temporal-quality`:  2 slices × 4 samples — higher spatial quality per frame.
 */
export const VBAO_TEMPORAL_PRESETS = Object.freeze({
  'temporal-fast': { slices: 1, samplesPerSlice: 2 },
  'temporal-balanced': { slices: 2, samplesPerSlice: 3 },
  'temporal-quality': { slices: 2, samplesPerSlice: 4 },
} as const)

export type VBAOTemporalPreset = keyof typeof VBAO_TEMPORAL_PRESETS

/**
 * Resolves a temporal preset to its slice/sample configuration.
 *
 * Throws a `TypeError` when `temporal` is `undefined` — temporal presets
 * are only valid when the temporal path is active.
 *
 * @param preset - The preset key to look up.
 * @param temporal - The caller's temporal options. Must be defined.
 */
export function resolveTemporalPreset(
  preset: VBAOTemporalPreset,
  temporal: VBAOTemporalOptions | undefined,
): (typeof VBAO_TEMPORAL_PRESETS)[VBAOTemporalPreset] {
  if (temporal === undefined) {
    throw new TypeError(
      `resolveTemporalPreset: preset "${preset}" requires temporal options to be active. ` +
        'Pass a VBAOTemporalOptions object to VBAONodeOptions.temporal.',
    )
  }
  return VBAO_TEMPORAL_PRESETS[preset]
}

export interface VBAOTemporalOptions {
  /**
   * Temporal reprojection mode.
   * - `'depth-reprojection'`: Tier-1 — uses depth + camera matrices.
   * - `'velocity'`: Tier-2 — uses an external velocity texture (PR3 only).
   */
  readonly mode: 'depth-reprojection' | 'velocity'
  /**
   * External velocity texture node. Required when `mode = 'velocity'`.
   * The constructor throws a TypeError if `mode = 'velocity'` and this is absent.
   */
  readonly velocityNode?: unknown
  /**
   * EMA blend bounds. `min` = blend weight at full confidence (minimum history weight).
   * `max` = blend weight at zero confidence (maximum history weight).
   * Both in (0, 1). Defaults to `{ min: 0.05, max: 0.25 }`.
   *
   * PR1 note: adaptive alpha driven by the confidence channel is PR2 scope.
   * PR1 uses `alpha.min` as the fixed blend weight.
   */
  readonly alpha?: { readonly min: number; readonly max: number }
  /**
   * Enable TSVGF 4-bit reliability counter packed into the G channel of the
   * RG16F history buffer. Default `true`. Counter logic is PR2 scope.
   */
  readonly reliabilityCounter?: boolean
}

export interface VBAONodeOptions {
  readonly quality?: VBAOQualityPreset
  readonly radius?: number
  readonly contact?: number
  readonly strength?: number
  readonly softness?: number
  readonly advanced?: {
    readonly thickness?: number
    readonly contrast?: number
    readonly slices?: number
    readonly samples?: number
    readonly resolutionScale?: number
  }
  /**
   * Opt-in temporal AO accumulation. When absent or `undefined` the system
   * behaves identically to the current spatial-only path (zero behavior change,
   * no history buffers allocated).
   *
   * Added in vbao-temporal PR1.
   */
  readonly temporal?: VBAOTemporalOptions
}

/**
 * Legacy flat aliases still honored at runtime for older HorizonAO callers
 * and GTAONode-style option bags. Internal constructor shims only: this type
 * is intentionally NOT exported from the package entrypoint and the aliases
 * are not part of the documented `VBAONodeOptions` surface.
 */
export interface VbaoDeprecatedOptionAliases {
  /** @deprecated Use `quality`. */
  readonly preset?: VBAOQualityPreset
  /** @deprecated Use `contact` or `advanced.thickness`. */
  readonly thickness?: number
  /** @deprecated Use `advanced.contrast`. */
  readonly contrast?: number
  /** @deprecated Use `advanced.contrast`; GTAONode-style alias. */
  readonly scale?: number
  /** @deprecated Use `strength`. */
  readonly intensity?: number
  /** @deprecated Use `advanced.slices`. */
  readonly slices?: number
  /** @deprecated Use `advanced.samples`. */
  readonly samples?: number
  /** @deprecated Use `advanced.resolutionScale`. */
  readonly resolutionScale?: number
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
 * any missing keys with {@link VBAO_DEFAULTS}. Accepts the deprecated flat
 * aliases so older callers keep resolving through the shim path.
 */
export function clampVbaoNodeOptions(
  options: VBAONodeOptions & VbaoDeprecatedOptionAliases,
): VBAOResolvedNodeOptions {
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
