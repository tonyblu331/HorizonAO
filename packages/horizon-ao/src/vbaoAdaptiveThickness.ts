export const VBAO_ADAPTIVE_THICKNESS = Object.freeze({
  minThickness: 0.02,
  thicknessScale: 10,
  continuityDepthTolerance: 0.08,
  continuityNormalDot: 0.95,
} as const)

export interface ResolvedAdaptiveThicknessOptions {
  readonly minThickness: number
  readonly maxThickness: number
  readonly thicknessScale: number
  readonly continuityDepthTolerance: number
  readonly continuityNormalDot: number
}

export function resolveAdaptiveThicknessOptions(maxThickness: number): ResolvedAdaptiveThicknessOptions {
  const minThickness = VBAO_ADAPTIVE_THICKNESS.minThickness

  return {
    ...VBAO_ADAPTIVE_THICKNESS,
    minThickness,
    maxThickness: Math.max(minThickness, maxThickness),
  }
}
