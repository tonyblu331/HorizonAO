export type HorizonAoPreset = 'compact' | 'balanced' | 'cinematic'

export interface HorizonAoSettings {
  readonly radius: number
  readonly intensity: number
  readonly thickness: number
  readonly falloff: number
  readonly samples: number
  readonly halfResolution: boolean
}

export const HORIZON_AO_PRESETS = {
  compact: {
    radius: 1.25,
    intensity: 0.9,
    thickness: 0.35,
    falloff: 1.8,
    samples: 6,
    halfResolution: true,
  },
  balanced: {
    radius: 1.8,
    intensity: 1.15,
    thickness: 0.5,
    falloff: 1.45,
    samples: 10,
    halfResolution: true,
  },
  cinematic: {
    radius: 2.35,
    intensity: 1.35,
    thickness: 0.72,
    falloff: 1.15,
    samples: 16,
    halfResolution: false,
  },
} as const satisfies Record<HorizonAoPreset, HorizonAoSettings>

export function createHorizonAoSettings(
  preset: HorizonAoPreset = 'balanced',
  overrides: Partial<HorizonAoSettings> = {},
): HorizonAoSettings {
  const merged = { ...HORIZON_AO_PRESETS[preset], ...overrides }

  return Object.freeze({
    radius: clamp(merged.radius, 0.05, 8),
    intensity: clamp(merged.intensity, 0, 4),
    thickness: clamp(merged.thickness, 0, 2),
    falloff: clamp(merged.falloff, 0.1, 8),
    samples: Math.round(clamp(merged.samples, 2, 32)),
    halfResolution: merged.halfResolution,
  })
}

export function estimateAoSampleBudget(settings: HorizonAoSettings): number {
  const resolutionMultiplier = settings.halfResolution ? 0.25 : 1
  return Math.ceil(settings.samples * settings.radius * resolutionMultiplier * 1000)
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
