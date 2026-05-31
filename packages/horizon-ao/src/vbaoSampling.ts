export const VBAO_SAMPLING_SCHEME = 'phase-atlas-stable-hash' as const
export const VBAO_PHASE_ATLAS_PHASES = 64 as const
export const VBAO_PHASE_ATLAS_COLUMNS = 8 as const
export const VBAO_PHASE_ATLAS_ROWS = VBAO_PHASE_ATLAS_PHASES / VBAO_PHASE_ATLAS_COLUMNS
export const VBAO_PHASE_STRIDE = 16 as const

export type VbaoSamplingScheme = typeof VBAO_SAMPLING_SCHEME

export interface VbaoPhaseSamplingInput {
  readonly pixel: readonly [number, number]
  readonly phaseIndex: number
}

export interface VbaoSamplingInput {
  readonly pixel: readonly [number, number]
  readonly viewport: readonly [number, number]
  readonly sliceIndex: number
  readonly sliceCount: number
  readonly sampleIndex: number
  readonly sampleCount: number
}

export interface VbaoPhaseChannels {
  readonly rotation: number
  readonly radialJitter: number
  readonly subsectorThreshold: number
  readonly polishRotation: number
}

function fract(value: number): number {
  return value - Math.floor(value)
}

function integerPixel(input: VbaoPhaseSamplingInput | VbaoSamplingInput): readonly [number, number] {
  return [Math.floor(input.pixel[0]), Math.floor(input.pixel[1])]
}

function resolvePhaseIndex(input: VbaoPhaseSamplingInput | VbaoSamplingInput): number {
  if ('phaseIndex' in input) return Math.floor(input.phaseIndex)

  return (
    Math.floor(input.sliceIndex) * VBAO_PHASE_STRIDE +
    Math.floor(input.sampleIndex)
  )
}

function hashUnit(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x1e35a7bd)
  h ^= Math.imul(y | 0, 0x8f1bbcdc)
  h ^= Math.imul(seed | 0, 0x94d049bb)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000
}

/**
 * Stable phase-atlas hash rotation for production VBAO.
 *
 * The inputs are intentionally frame-free: no temporal index, no runtime
 * schedule injection, and no debug sampling mode. Neighboring pixels and
 * slice/sample phases are hash-decorrelated instead of sharing one scalar base.
 */
export function sampleVbaoRotation(input: VbaoPhaseSamplingInput | VbaoSamplingInput): number {
  return sampleVbaoPhaseChannels(input).rotation
}

export function sampleVbaoRadialJitter(input: VbaoPhaseSamplingInput | VbaoSamplingInput): number {
  return sampleVbaoPhaseChannels(input).radialJitter
}

export function sampleVbaoSubsectorThreshold(
  input: VbaoPhaseSamplingInput | VbaoSamplingInput,
): number {
  return sampleVbaoPhaseChannels(input).subsectorThreshold
}

export function sampleVbaoPhaseChannels(
  input: VbaoPhaseSamplingInput | VbaoSamplingInput,
): VbaoPhaseChannels {
  const [x, y] = integerPixel(input)
  const phase = resolvePhaseIndex(input) & (VBAO_PHASE_ATLAS_PHASES - 1)
  const phaseX = phase % VBAO_PHASE_ATLAS_COLUMNS
  const phaseY = Math.floor(phase / VBAO_PHASE_ATLAS_COLUMNS)
  const phaseSeed = phaseX * 409 + phaseY * 811
  const sliceIndex = 'sliceIndex' in input ? input.sliceIndex : Math.floor(phase / VBAO_PHASE_STRIDE)
  const sampleIndex = 'sampleIndex' in input ? input.sampleIndex : phase % VBAO_PHASE_STRIDE

  const rotation = fract(
    hashUnit(x + phaseX * 131, y + phaseY * 197, 17 + phaseSeed) * 0.63 +
      hashUnit(x + sliceIndex * 131, y + sampleIndex * 197, 29 + phaseSeed) * 0.37 +
      sliceIndex * 0.438013370189827 +
      sampleIndex * 0.19947114020071635,
  )
  const radialJitter = fract(
    hashUnit(x + phaseX * 173, y + phaseY * 113, 53 + phaseSeed) * 0.71 +
      hashUnit(x + sampleIndex * 173, y + sliceIndex * 113, 71 + phaseSeed) * 0.29 +
      sliceIndex * 0.19947114020071635,
  )
  const subsectorThreshold = fract(
    hashUnit(x + phaseX * 59, y + phaseY * 149, 97 + phaseSeed) * 0.67 +
      hashUnit(x + sampleIndex * 31, y + sliceIndex * 47, 131 + phaseSeed) * 0.33,
  )
  const polishRotation = fract(
    hashUnit(x + phaseX * 191, y + phaseY * 223, 173 + phaseSeed) * 0.73 +
      rotation * 0.27,
  )

  return {
    rotation,
    radialJitter,
    subsectorThreshold,
    polishRotation,
  }
}

export function sampleVbaoStepJitter(input: VbaoSamplingInput): number {
  const base = sampleVbaoRadialJitter(input)
  const stepDecorrelator = input.sampleIndex * 0.7548776662466927
  const sliceDecorrelator = input.sliceIndex * 0.5698402909980532
  const jitter = fract(base + stepDecorrelator + sliceDecorrelator)

  return Math.max(1e-6, Math.min(0.999999, jitter))
}

/** x² near-biased radial spacing, paired with GT-VBAO CDF remap in the kernel. */
export function sampleVbaoStepFraction(input: VbaoSamplingInput): number {
  const sampleCount = Math.max(1, Math.floor(input.sampleCount))
  const sampleIndex = Math.max(0, Math.min(sampleCount - 1, Math.floor(input.sampleIndex)))
  const stepJitter = sampleVbaoStepJitter({
    ...input,
    sampleCount,
    sampleIndex,
  })
  const t = (sampleIndex + stepJitter) / sampleCount

  return t * t
}
