import type { Node } from 'three/webgpu'
import {
  Fn,
  If,
  bitNot,
  ceil,
  clamp,
  dot,
  float,
  floor,
  int,
  max,
  min,
  shiftLeft,
  shiftRight,
  sqrt,
  uint,
  vec2,
  vec3,
} from 'three/tsl'

import { SECTOR_COUNT } from './vbaoConstants'
import { VBAO_NOISE_TILE_SIZE } from './vbaoNoise'
import {
  VBAO_PHASE_ATLAS_COLUMNS,
  VBAO_PHASE_ATLAS_PHASES,
  VBAO_PHASE_ATLAS_ROWS,
  VBAO_PHASE_STRIDE,
} from './vbaoSampling'

/**
 * Shared TSL primitives for the VBAO march.
 *
 * These are pure functions of their inputs — no node-specific uniforms are
 * captured — so the raw AO kernel and the diagnostic receiver-confidence
 * kernel reuse one named WGSL function set instead of compiling renamed
 * duplicates of the same code.
 */

/** Builds a contiguous sector bitmask covering sectors [k0, k1). */
export const vbaoMaskRangeFn = (Fn as any)(([k0_in, k1_in]: any[]) => {
  const lo = int(max(float(0), min(float(SECTOR_COUNT), float(k0_in))))
  const hi = int(max(float(0), min(float(SECTOR_COUNT), float(k1_in))))
  const count = hi.sub(lo)
  const result = uint(0).toVar('maskRangeResult')

  If(count.greaterThan(int(0)), () => {
    If(count.greaterThanEqual(int(SECTOR_COUNT)), () => {
      result.assign(bitNot(uint(0)))
    }).Else(() => {
      const ucount = uint(count)
      const ones = shiftRight(bitNot(uint(0)), uint(SECTOR_COUNT).sub(ucount))
      result.assign(shiftLeft(ones, uint(lo)))
    })
  })

  return result
}).setLayout({
  name: 'vbaoMaskRange',
  type: 'uint',
  inputs: [
    { name: 'k0', type: 'int' },
    { name: 'k1', type: 'int' },
  ],
})

/**
 * Cosine-measure CDF value of direction D in the slice basis (V, S) with the
 * slice-local normal elevation gamma, without an atan2.
 */
export const vbaoCosineMeasureNoAtan = (Fn as any)(
  ([D_in, V_in, S_in, sinGamma_in, cosGamma_in]: any[]) => {
    const D = vec3(D_in)
    const Vbasis = vec3(V_in)
    const Sbasis = vec3(S_in)
    const sinGamma = float(sinGamma_in)
    const cosGamma = float(cosGamma_in)
    const x = dot(D, Sbasis)
    const y = max(dot(D, Vbasis), float(1e-5))
    const invLen = float(1).div(sqrt(max(x.mul(x).add(y.mul(y)), float(1e-8))))
    const sinBeta = x.mul(cosGamma).sub(y.mul(sinGamma)).mul(invLen)
    const cosBeta = y.mul(cosGamma).add(x.mul(sinGamma)).mul(invLen)
    const interior = sinBeta.mul(float(0.5)).add(float(0.5))
    const clampedBoundary = sinBeta.greaterThanEqual(float(0)).select(float(1), float(0))
    return cosBeta.lessThan(float(0)).select(clampedBoundary, interior).clamp(0, 1)
  },
).setLayout({
  name: 'vbaoCosineMeasureNoAtan',
  type: 'float',
  inputs: [
    { name: 'D', type: 'vec3' },
    { name: 'V', type: 'vec3' },
    { name: 'S', type: 'vec3' },
    { name: 'sinGamma', type: 'float' },
    { name: 'cosGamma', type: 'float' },
  ],
})

/**
 * Sector bitmask for the CDF interval [u0, u1]. Intervals thinner than one
 * sector contribute a single bit stochastically (probability = arc fraction)
 * instead of always rounding to zero or a full sector.
 */
export const vbaoIntervalMaskStochasticFn = (Fn as any)(([u0_in, u1_in, xi_in]: any[]) => {
  const u0 = clamp(min(float(u0_in), float(u1_in)), float(0), float(1)).toVar(
    'vbaoIntervalMaskU0',
  )
  const u1 = clamp(max(float(u0_in), float(u1_in)), float(0), float(1)).toVar(
    'vbaoIntervalMaskU1',
  )
  const xi = clamp(float(xi_in), float(0), float(1)).toVar('vbaoIntervalMaskXi')
  const intervalSectors = u1.sub(u0).mul(float(SECTOR_COUNT)).toVar('vbaoIntervalSectors')
  const result = uint(0).toVar('vbaoIntervalMaskResult')

  If(intervalSectors.greaterThan(float(1e-5)), () => {
    If(intervalSectors.greaterThanEqual(float(1)), () => {
      const k0 = int(ceil(u0.mul(float(SECTOR_COUNT)).sub(float(0.5))))
      const k1 = int(floor(u1.mul(float(SECTOR_COUNT)).sub(float(0.5))))
      result.assign((vbaoMaskRangeFn as any)(k0, k1.add(int(1))))
    }).Else(() => {
      const thinSectorRaw = floor(u0.add(u1).mul(float(0.5 * SECTOR_COUNT)))
      const thinSectorIndex = int(
        max(float(0), min(float(SECTOR_COUNT - 1), thinSectorRaw)),
      ).toVar('vbaoThinSectorIndex')
      const thinSectorMask = shiftLeft(uint(1), uint(thinSectorIndex)).toVar(
        'vbaoThinSectorMask',
      )
      const thinContribution = (xi.lessThan(intervalSectors) as any).select(
        thinSectorMask,
        uint(0),
      )
      result.assign(thinContribution)
    })
  })

  return result
}).setLayout({
  name: 'vbaoIntervalMaskStochastic',
  type: 'uint',
  inputs: [
    { name: 'u0', type: 'float' },
    { name: 'u1', type: 'float' },
    { name: 'xi', type: 'float' },
  ],
})

export interface VbaoNoisePhaseSamplerOptions {
  /** Texture node over the shared phase-atlas noise texture. */
  readonly noiseNode: Node & { sample: (uvCoord: Node) => any }
  /** Screen UV node of the fragment being shaded. */
  readonly uvNode: Node
  /** Source (unscaled) resolution uniform, so half-res passes stay in source texel space. */
  readonly sourceResolution: Node
  /** Optional per-frame phase rotation uniform; omitted means a static phase. */
  readonly temporalPhaseOffset?: Node
}

/**
 * Creates a per-kernel `(slice, sample) -> noise texel` lookup into the phase
 * atlas. The tile-local pixel coordinate is hoisted out of the returned
 * closure so the per-sample work is only the phase-to-tile offset math.
 */
export function createVbaoNoisePhaseSampler(options: VbaoNoisePhaseSamplerOptions) {
  const noiseNode = options.noiseNode
  const uvNode = options.uvNode as any
  const sourceResolution = options.sourceResolution as any
  const temporalPhaseOffset = options.temporalPhaseOffset as any
  const vbaoRawNoisePixel = floor(uvNode.mul(sourceResolution))
  const vbaoLocalPixel = vbaoRawNoisePixel
    .sub(
      floor(vbaoRawNoisePixel.div(float(VBAO_NOISE_TILE_SIZE))).mul(
        float(VBAO_NOISE_TILE_SIZE),
      ),
    )
    .toVar('vbaoLocalPixel')
  const phaseOffset = temporalPhaseOffset ?? float(0)

  return (slice: any, sample: any) => {
    const phaseRaw = float(slice)
      .mul(float(VBAO_PHASE_STRIDE))
      .add(float(sample))
      .add(phaseOffset)
    const phase = phaseRaw.sub(
      floor(phaseRaw.div(float(VBAO_PHASE_ATLAS_PHASES))).mul(float(VBAO_PHASE_ATLAS_PHASES)),
    )
    const phaseY = floor(phase.div(float(VBAO_PHASE_ATLAS_COLUMNS)))
    const phaseX = phase.sub(phaseY.mul(float(VBAO_PHASE_ATLAS_COLUMNS)))
    const atlasPixel = vbaoLocalPixel.add(vec2(phaseX, phaseY).mul(float(VBAO_NOISE_TILE_SIZE)))
    const atlasUv = atlasPixel
      .add(vec2(0.5))
      .div(
        vec2(
          VBAO_NOISE_TILE_SIZE * VBAO_PHASE_ATLAS_COLUMNS,
          VBAO_NOISE_TILE_SIZE * VBAO_PHASE_ATLAS_ROWS,
        ),
      )
    return noiseNode.sample(atlasUv)
  }
}
