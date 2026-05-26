export const VBAO_SAMPLING_SCHEDULES = [
  'magic-square',
  'r2',
  'hilbert',
  'blue-noise',
] as const

export type VbaoSamplingSchedule = (typeof VBAO_SAMPLING_SCHEDULES)[number]

export interface VbaoSamplingInput {
  readonly pixel: readonly [number, number]
  readonly viewport: readonly [number, number]
  readonly sliceIndex: number
  readonly sliceCount: number
  readonly sampleIndex: number
  readonly sampleCount: number
}

const MAGIC_SQUARE_5 = Object.freeze([
  9, 3, 22, 16, 15,
  2, 21, 20, 14, 8,
  25, 19, 13, 7, 1,
  18, 12, 6, 5, 24,
  11, 10, 4, 23, 17,
] as const)

const BLUE_NOISE_TILE_8 = Object.freeze([
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
] as const)

function fract(v: number): number {
  return v - Math.floor(v)
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo
}

function integerPixel(input: VbaoSamplingInput): readonly [number, number] {
  return [Math.floor(input.pixel[0]), Math.floor(input.pixel[1])]
}

function rotationFromShaderPackedAngle(angle: number): number {
  return fract((Math.atan2(Math.sin(angle), Math.cos(angle)) + Math.PI) / (Math.PI * 2))
}

function magicSquareRotation(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)
  const tileX = positiveModulo(x, 5)
  const tileY = positiveModulo(y, 5)
  const value = MAGIC_SQUARE_5[tileY * 5 + tileX]!

  return rotationFromShaderPackedAngle((Math.PI * 2 * value) / MAGIC_SQUARE_5.length)
}

function magicSquareValue(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)
  const tileX = positiveModulo(x, 5)
  const tileY = positiveModulo(y, 5)

  return MAGIC_SQUARE_5[tileY * 5 + tileX]!
}

function r2Rotation(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)

  return fract(
    0.5 +
      x * 0.7548776662466927 +
      y * 0.5698402909980532 +
      input.sliceIndex * 0.438013370189827 +
      input.sampleIndex * 0.19947114020071635,
  )
}

function r2RadialJitter(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)

  return fract(
    0.5 +
      x * 0.5698402909980532 +
      y * 0.7548776662466927 +
      input.sliceIndex * 0.19947114020071635,
  )
}

function hilbertRotate(n: number, x: number, y: number, rx: number, ry: number): readonly [number, number] {
  if (ry !== 0) return [x, y]

  const nextX = rx === 1 ? n - 1 - x : x
  const nextY = rx === 1 ? n - 1 - y : y

  return [nextY, nextX]
}

function hilbertIndex(order: number, x: number, y: number): number {
  let index = 0
  let px = positiveModulo(x, order)
  let py = positiveModulo(y, order)

  for (let scale = order / 2; scale > 0; scale = Math.floor(scale / 2)) {
    const rx = (px & scale) > 0 ? 1 : 0
    const ry = (py & scale) > 0 ? 1 : 0
    index += scale * scale * ((3 * rx) ^ ry)
    ;[px, py] = hilbertRotate(scale, px, py, rx, ry)
  }

  return index
}

function hilbertRotation(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)
  const order = 16
  const index = hilbertIndex(order, x, y)

  return fract((index + 0.5) / (order * order) + input.sliceIndex / Math.max(1, input.sliceCount))
}

function hilbertRadialJitter(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)
  const order = 16
  const index = hilbertIndex(order, x, y)

  return fract((index + 0.5) / (order * order) + input.sliceIndex * 0.3819660112501051)
}

function blueNoiseRotation(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)
  const tileX = positiveModulo(x, 8)
  const tileY = positiveModulo(y, 8)
  const value = BLUE_NOISE_TILE_8[tileY * 8 + tileX]!

  return fract((value + 0.5) / BLUE_NOISE_TILE_8.length + input.sliceIndex * 0.073)
}

function blueNoiseValue(input: VbaoSamplingInput): number {
  const [x, y] = integerPixel(input)
  const tileX = positiveModulo(x, 8)
  const tileY = positiveModulo(y, 8)

  return BLUE_NOISE_TILE_8[tileY * 8 + tileX]!
}

export function sampleVbaoRotation(
  schedule: VbaoSamplingSchedule,
  input: VbaoSamplingInput,
): number {
  switch (schedule) {
    case 'magic-square':
      return magicSquareRotation(input)
    case 'r2':
      return r2Rotation(input)
    case 'hilbert':
      return hilbertRotation(input)
    case 'blue-noise':
      return blueNoiseRotation(input)
  }
}

export function sampleVbaoRadialJitter(
  schedule: VbaoSamplingSchedule,
  input: VbaoSamplingInput,
): number {
  switch (schedule) {
    case 'magic-square':
      return (magicSquareValue(input) - 0.5) / MAGIC_SQUARE_5.length
    case 'r2':
      return r2RadialJitter(input)
    case 'hilbert':
      return hilbertRadialJitter(input)
    case 'blue-noise':
      return fract((blueNoiseValue(input) + 0.5) / BLUE_NOISE_TILE_8.length + input.sliceIndex * 0.137)
  }
}

export function sampleVbaoStepJitter(
  schedule: VbaoSamplingSchedule,
  input: VbaoSamplingInput,
): number {
  const base = sampleVbaoRadialJitter(schedule, input)
  const stepDecorrelator = input.sampleIndex * 0.7548776662466927
  const sliceDecorrelator = input.sliceIndex * 0.5698402909980532
  const jitter = fract(base + stepDecorrelator + sliceDecorrelator)

  return Math.max(1e-6, Math.min(0.999999, jitter))
}

export function sampleVbaoStepFraction(
  schedule: VbaoSamplingSchedule,
  input: VbaoSamplingInput,
): number {
  const sampleCount = Math.max(1, Math.floor(input.sampleCount))
  const sampleIndex = Math.max(0, Math.min(sampleCount - 1, Math.floor(input.sampleIndex)))
  const stepJitter = sampleVbaoStepJitter(schedule, {
    ...input,
    sampleCount,
    sampleIndex,
  })

  return (sampleIndex + stepJitter) / sampleCount
}
