import { ClampToEdgeWrapping, DataTexture, NearestFilter, NoColorSpace } from 'three/webgpu'

import {
  VBAO_PHASE_ATLAS_COLUMNS,
  VBAO_PHASE_ATLAS_PHASES,
  VBAO_PHASE_ATLAS_ROWS,
} from '../../../../packages/horizon-ao/src/vbaoSampling'
import { VBAO_NOISE_TILE_SIZE } from '../../../../packages/horizon-ao/src/vbaoNoise'

export const VBAO_BENCHMARK_NOISE_SOURCES = [
  'phase-atlas-stable-hash',
  'phase-atlas-stable-hash-128',
  'ign',
  'ign-128',
  'static-stbn',
  'static-stbn-128',
  'hilbert-r2-lut',
  'fast-like',
] as const

export type VbaoBenchmarkNoiseSourceName = (typeof VBAO_BENCHMARK_NOISE_SOURCES)[number]
type VbaoBenchmarkBaseNoiseSource =
  | 'phase-atlas-stable-hash'
  | 'ign'
  | 'static-stbn'
  | 'hilbert-r2-lut'
  | 'fast-like'

const benchmarkNoiseTextures = new Map<VbaoBenchmarkNoiseSourceName, DataTexture>()

function fract(value: number): number {
  return value - Math.floor(value)
}

function hashUnit(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x1e35a7bd)
  h ^= Math.imul(y | 0, 0x8f1bbcdc)
  h ^= Math.imul(seed | 0, 0x94d049bb)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000
}

function ignUnit(x: number, y: number, seed: number): number {
  const seedX = seed * 37.0
  const seedY = seed * 17.0
  return fract(52.9829189 * fract(0.06711056 * (x + seedX) + 0.00583715 * (y + seedY)))
}

function morton8(x: number, y: number): number {
  let result = 0
  const xi = x & 0xff
  const yi = y & 0xff
  for (let bit = 0; bit < 8; bit++) {
    result |= ((xi >> bit) & 1) << (bit * 2)
    result |= ((yi >> bit) & 1) << (bit * 2 + 1)
  }
  return result
}

function staticStbnUnit(x: number, y: number, seed: number): number {
  const tileX = x & 63
  const tileY = y & 63
  const rank =
    (morton8(tileX ^ ((seed * 13) & 63), tileY ^ ((seed * 29) & 63)) ^ (seed * 0x9e37)) & 0xfff
  const dither = hashUnit(tileX, tileY, seed + 211) / 4096
  return fract(rank / 4096 + dither + seed * 0.6180339887498948)
}

function fastLikeUnit(x: number, y: number, seed: number): number {
  const tileX = x & 15
  const tileY = y & 15
  const lowDiscrepancy = fract(
    tileX * 0.7548776662466927 + tileY * 0.5698402909980532 + seed * 0.6180339887498948,
  )
  return fract(lowDiscrepancy + hashUnit(tileX, tileY, seed + 307) * 0.03125)
}

function hilbertR2LikeUnit(x: number, y: number, seed: number): number {
  const tileX = x & 63
  const tileY = y & 63
  const rank = morton8(tileX ^ ((seed * 11) & 63), tileY ^ ((seed * 17) & 63))
  const r2 = fract(rank * 0.7548776662466927 + seed * 0.5698402909980532)
  return fract(r2 + hashUnit(tileX, tileY, seed + 409) * 0.015625)
}

function baseNoiseSource(source: VbaoBenchmarkNoiseSourceName): VbaoBenchmarkBaseNoiseSource {
  switch (source) {
    case 'phase-atlas-stable-hash-128':
      return 'phase-atlas-stable-hash'
    case 'ign-128':
      return 'ign'
    case 'static-stbn-128':
      return 'static-stbn'
    default:
      return source
  }
}

function noiseTileSize(source: VbaoBenchmarkNoiseSourceName): number {
  return source.endsWith('-128') ? 128 : VBAO_NOISE_TILE_SIZE
}

function sampleBenchmarkUnit(
  source: VbaoBenchmarkNoiseSourceName,
  x: number,
  y: number,
  seed: number,
): number {
  switch (baseNoiseSource(source)) {
    case 'ign':
      return ignUnit(x, y, seed)
    case 'static-stbn':
      return staticStbnUnit(x, y, seed)
    case 'hilbert-r2-lut':
      return hilbertR2LikeUnit(x, y, seed)
    case 'fast-like':
      return fastLikeUnit(x, y, seed)
    case 'phase-atlas-stable-hash':
      return hashUnit(x, y, seed)
  }
}

function sampleBenchmarkPhaseChannels(
  source: VbaoBenchmarkNoiseSourceName,
  x: number,
  y: number,
  phase: number,
) {
  const phaseX = phase % VBAO_PHASE_ATLAS_COLUMNS
  const phaseY = Math.floor(phase / VBAO_PHASE_ATLAS_COLUMNS)
  const phaseSeed = phaseX * 409 + phaseY * 811
  const sliceIndex = Math.floor(phase / 16)
  const sampleIndex = phase % 16

  const rotation = fract(
    sampleBenchmarkUnit(source, x + phaseX * 131, y + phaseY * 197, 17 + phaseSeed) * 0.63 +
      sampleBenchmarkUnit(source, x + sliceIndex * 131, y + sampleIndex * 197, 29 + phaseSeed) *
        0.37 +
      sliceIndex * 0.438013370189827 +
      sampleIndex * 0.19947114020071635,
  )
  const radialJitter = fract(
    sampleBenchmarkUnit(source, x + phaseX * 173, y + phaseY * 113, 53 + phaseSeed) * 0.71 +
      sampleBenchmarkUnit(source, x + sampleIndex * 173, y + sliceIndex * 113, 71 + phaseSeed) *
        0.29 +
      sliceIndex * 0.19947114020071635,
  )
  const subsectorThreshold = fract(
    sampleBenchmarkUnit(source, x + phaseX * 59, y + phaseY * 149, 97 + phaseSeed) * 0.67 +
      sampleBenchmarkUnit(source, x + sampleIndex * 31, y + sliceIndex * 47, 131 + phaseSeed) *
        0.33,
  )
  const polishRotation = fract(
    sampleBenchmarkUnit(source, x + phaseX * 191, y + phaseY * 223, 173 + phaseSeed) * 0.73 +
      rotation * 0.27,
  )

  return { rotation, radialJitter, subsectorThreshold, polishRotation }
}

export function createVbaoBenchmarkNoiseTexture(
  noiseSource: VbaoBenchmarkNoiseSourceName,
): DataTexture {
  const existing = benchmarkNoiseTextures.get(noiseSource)
  if (existing !== undefined) return existing

  const n = noiseTileSize(noiseSource)
  const atlasWidth = n * VBAO_PHASE_ATLAS_COLUMNS
  const atlasHeight = n * VBAO_PHASE_ATLAS_ROWS
  const data = new Uint8Array(atlasWidth * atlasHeight * 4)

  for (let phase = 0; phase < VBAO_PHASE_ATLAS_PHASES; phase++) {
    const phaseX = phase % VBAO_PHASE_ATLAS_COLUMNS
    const phaseY = Math.floor(phase / VBAO_PHASE_ATLAS_COLUMNS)

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const atlasX = phaseX * n + x
        const atlasY = phaseY * n + y
        const i = atlasY * atlasWidth + atlasX
        const channels = sampleBenchmarkPhaseChannels(noiseSource, x, y, phase)

        data[i * 4 + 0] = Math.max(0, Math.min(254, Math.floor(channels.rotation * 255)))
        data[i * 4 + 1] = Math.max(0, Math.min(254, Math.floor(channels.radialJitter * 255)))
        data[i * 4 + 2] = Math.max(0, Math.min(254, Math.floor(channels.subsectorThreshold * 255)))
        data[i * 4 + 3] = Math.max(0, Math.min(254, Math.floor(channels.polishRotation * 255)))
      }
    }
  }

  const texture = new DataTexture(data, atlasWidth, atlasHeight)
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = NoColorSpace
  texture.name = `VBAO.BenchmarkNoise.${noiseSource}.${n}x${n}`
  texture.needsUpdate = true
  benchmarkNoiseTextures.set(noiseSource, texture)
  return texture
}
