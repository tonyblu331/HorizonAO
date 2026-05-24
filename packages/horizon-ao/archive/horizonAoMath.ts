export interface HorizonAoKernelOptions {
  readonly radius?: number
  readonly intensity?: number
  readonly falloff?: number
  readonly thickness?: number
  readonly slices?: number
  readonly samples?: number
  readonly resolutionScale?: number
}

export const DEFAULT_HORIZON_AO_KERNEL_OPTIONS = {
  radius: 1.25,
  intensity: 1,
  falloff: 0.85,
  thickness: 0.5,
  slices: 3,
  samples: 12,
  resolutionScale: 0.5,
} as const satisfies Required<HorizonAoKernelOptions>

export const HORIZON_AO_CENTER_BIAS_EXPONENT = 1.35
export const HORIZON_AO_FULL_HEMISPHERE_COSINE_INTEGRAL = 2

export function clampHorizonAoKernelOptions(
  options: HorizonAoKernelOptions = {},
): Required<HorizonAoKernelOptions> {
  const merged = { ...DEFAULT_HORIZON_AO_KERNEL_OPTIONS, ...options }

  return Object.freeze({
    radius: clampNumber(merged.radius, 0.05, 8),
    intensity: clampNumber(merged.intensity, 0, 4),
    falloff: clampNumber(merged.falloff, 0, 1),
    thickness: clampNumber(merged.thickness, 0, 4),
    slices: Math.round(clampNumber(merged.slices, 1, 8)),
    samples: Math.round(clampNumber(merged.samples, 2, 32)),
    resolutionScale: clampNumber(merged.resolutionScale, 0.25, 1),
  })
}

export function computeSampleStepsPerSlice({
  samples,
  slices,
}: {
  readonly samples: number
  readonly slices: number
}): number {
  const options = clampHorizonAoKernelOptions({ samples, slices })
  return Math.ceil(options.samples / options.slices)
}

export function computeCenterBiasedSampleDistance({
  stepIndex,
  stepCount,
  exponent = HORIZON_AO_CENTER_BIAS_EXPONENT,
}: {
  readonly stepIndex: number
  readonly stepCount: number
  readonly exponent?: number
}): number {
  const safeStepCount = Math.max(1, Math.floor(stepCount))
  const safeStepIndex = Math.min(Math.max(0, Math.floor(stepIndex)), safeStepCount - 1)
  const safeExponent =
    Number.isFinite(exponent) && exponent > 0 ? exponent : HORIZON_AO_CENTER_BIAS_EXPONENT

  return Math.pow((safeStepIndex + 1) / safeStepCount, safeExponent)
}

export function computeFalloffWeight({
  stepIndex,
  falloff,
}: {
  readonly stepIndex: number
  readonly falloff: number
}): number {
  const safeStepIndex = Math.max(0, Math.floor(stepIndex))
  const safeFalloff = clampNumber(falloff, 0, 1)
  return lerp(1, 2 / (safeStepIndex + 2), safeFalloff)
}

export function resolveAccessibility({
  accumulatedSliceVisibility,
  slices,
  intensity,
}: {
  readonly accumulatedSliceVisibility: number
  readonly slices: number
  readonly intensity: number
}): number {
  const safeSlices = Math.max(1, Math.floor(slices))
  const safeIntensity = clampNumber(intensity, 0, 4)
  const accessibility = clampNumber(accumulatedSliceVisibility / safeSlices, 0, 1)

  return Math.pow(accessibility, safeIntensity)
}

export interface SignedHorizonArcOptions {
  readonly normalAngleRad: number
  readonly minHorizonAngleRad: number
  readonly maxHorizonAngleRad: number
}

export interface SignedHorizonSlice {
  readonly normalAngleRad: number
  readonly negativeHorizonAngleRad: number
  readonly positiveHorizonAngleRad: number
}

export interface SignedHorizonCosineSliceOptions {
  readonly positiveCosHorizon: number
  readonly negativeCosHorizon: number
  readonly projectedNormalOnTangent: number
  readonly projectedNormalOnView: number
}

export function integrateSignedHorizonArcAccessibility({
  normalAngleRad,
  minHorizonAngleRad,
  maxHorizonAngleRad,
}: SignedHorizonArcOptions): number {
  if (
    !Number.isFinite(normalAngleRad) ||
    !Number.isFinite(minHorizonAngleRad) ||
    !Number.isFinite(maxHorizonAngleRad)
  ) {
    return 0
  }

  const minAngle = Math.min(minHorizonAngleRad, maxHorizonAngleRad)
  const maxAngle = Math.max(minHorizonAngleRad, maxHorizonAngleRad)
  const visibleMin = Math.max(minAngle, normalAngleRad - Math.PI / 2)
  const visibleMax = Math.min(maxAngle, normalAngleRad + Math.PI / 2)

  if (visibleMax <= visibleMin) return 0

  const integratedCosine =
    Math.sin(visibleMax - normalAngleRad) - Math.sin(visibleMin - normalAngleRad)

  return clampNumber(integratedCosine / HORIZON_AO_FULL_HEMISPHERE_COSINE_INTEGRAL, 0, 1)
}

export function resolveSignedHorizonSliceAccessibility({
  normalAngleRad,
  negativeHorizonAngleRad,
  positiveHorizonAngleRad,
}: SignedHorizonSlice): number {
  return integrateSignedHorizonArcAccessibility({
    normalAngleRad,
    minHorizonAngleRad: negativeHorizonAngleRad,
    maxHorizonAngleRad: positiveHorizonAngleRad,
  })
}

export function resolveSignedHorizonCosineSliceAccessibility({
  positiveCosHorizon,
  negativeCosHorizon,
  projectedNormalOnTangent,
  projectedNormalOnView,
}: SignedHorizonCosineSliceOptions): number {
  if (
    !Number.isFinite(positiveCosHorizon) ||
    !Number.isFinite(negativeCosHorizon) ||
    !Number.isFinite(projectedNormalOnTangent) ||
    !Number.isFinite(projectedNormalOnView)
  ) {
    return 0
  }

  const positiveCos = clampNumber(positiveCosHorizon, -1, 1)
  const negativeCos = clampNumber(negativeCosHorizon, -1, 1)
  const positiveSin = Math.sqrt(Math.max(0, 1 - positiveCos * positiveCos))
  const negativeSin = Math.sqrt(Math.max(0, 1 - negativeCos * negativeCos))
  const positiveAngle = Math.acos(positiveCos)
  const negativeAngle = Math.acos(negativeCos)
  const tangentContribution =
    0.5 * (negativeAngle - positiveAngle + (positiveSin * positiveCos - negativeSin * negativeCos))
  const normalContribution = 0.5 * (2 - positiveCos * positiveCos - negativeCos * negativeCos)

  return clampNumber(
    projectedNormalOnTangent * tangentContribution + projectedNormalOnView * normalContribution,
    0,
    1,
  )
}

export function resolveSignedHorizonAccessibility({
  slices,
  intensity = 1,
}: {
  readonly slices: readonly SignedHorizonSlice[]
  readonly intensity?: number
}): number {
  if (slices.length === 0) return 0

  const accumulatedAccessibility = slices.reduce(
    (sum, slice) => sum + resolveSignedHorizonSliceAccessibility(slice),
    0,
  )

  return Math.pow(
    clampNumber(accumulatedAccessibility / slices.length, 0, 1),
    clampNumber(intensity, 0, 4),
  )
}

export function generateMagicSquareIndices(size = 5): number[] {
  const noiseSize = sanitizeOddSize(size)
  const noiseSquareSize = noiseSize * noiseSize
  const magicSquare = Array<number>(noiseSquareSize).fill(0)
  let row = Math.floor(noiseSize / 2)
  let column = noiseSize - 1

  for (let value = 1; value <= noiseSquareSize; ) {
    if (row === -1 && column === noiseSize) {
      column = noiseSize - 2
      row = 0
    } else {
      if (column === noiseSize) column = 0
      if (row < 0) row = noiseSize - 1
    }

    if (magicSquare[row * noiseSize + column] !== 0) {
      column -= 2
      row += 1
      continue
    }

    magicSquare[row * noiseSize + column] = value
    value += 1
    column += 1
    row -= 1
  }

  return magicSquare
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t
}

function sanitizeOddSize(size: number): number {
  const floored = Math.max(1, Math.floor(Number.isFinite(size) ? size : 5))
  return floored % 2 === 0 ? floored + 1 : floored
}
