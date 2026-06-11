/**
 * Shared TSL shader function factories for VBAO visibility-bitmask operations.
 *
 * These factories create shader functions with configurable name prefixes for
 * debugging and profiling. The core logic is identical across consumers; only
 * the GPU label names differ.
 */

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
  vec3,
} from 'three/tsl'

import { SECTOR_COUNT } from './vbaoConstants'

/**
 * Creates a shader function that generates a bitmask for sectors in range [k0, k1).
 *
 * @param prefix - Name prefix for GPU labels (e.g., 'vbao', 'vbaoReceiverConfidence')
 */
export function createMaskRangeFn(prefix: string) {
  return (Fn as any)(([k0_in, k1_in]: any[]) => {
    const lo = int(max(float(0), min(float(SECTOR_COUNT), float(k0_in))))
    const hi = int(max(float(0), min(float(SECTOR_COUNT), float(k1_in))))
    const count = hi.sub(lo)
    const result = uint(0).toVar(`${prefix}MaskRangeResult`)

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
    name: `${prefix}MaskRange`,
    type: 'uint',
    inputs: [
      { name: 'k0', type: 'int' },
      { name: 'k1', type: 'int' },
    ],
  })
}

/**
 * Creates a shader function that computes cosine-weighted visibility without atan.
 *
 * This is the core angular visibility measure used by VBAO. It projects a direction
 * D into the slice plane defined by basis vectors V and S, then computes the
 * cosine-weighted contribution based on the angle relative to the surface normal.
 *
 * @param prefix - Name prefix for GPU labels (e.g., 'vbao', 'vbaoReceiverConfidence')
 */
export function createCosineMeasureNoAtanFn(prefix: string) {
  return (Fn as any)(
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
    name: `${prefix}CosineMeasureNoAtan`,
    type: 'float',
    inputs: [
      { name: 'D', type: 'vec3' },
      { name: 'V', type: 'vec3' },
      { name: 'S', type: 'vec3' },
      { name: 'sinGamma', type: 'float' },
      { name: 'cosGamma', type: 'float' },
    ],
  })
}

/**
 * Creates a shader function that generates a stochastic interval mask.
 *
 * Given interval bounds [u0, u1] in normalized sector space and a random value xi,
 * this function either:
 * - For intervals >= 1 sector: generates a full bitmask via maskRangeFn
 * - For thin intervals (< 1 sector): stochastically selects a single sector based on xi
 *
 * @param prefix - Name prefix for GPU labels (e.g., 'vbao', 'vbaoReceiverConfidence')
 * @param maskRangeFn - The mask range function created by createMaskRangeFn with the same prefix
 */
export function createIntervalMaskStochasticFn(prefix: string, maskRangeFn: any) {
  return (Fn as any)(([u0_in, u1_in, xi_in]: any[]) => {
    const u0 = clamp(min(float(u0_in), float(u1_in)), float(0), float(1)).toVar(
      `${prefix}IntervalMaskU0`,
    )
    const u1 = clamp(max(float(u0_in), float(u1_in)), float(0), float(1)).toVar(
      `${prefix}IntervalMaskU1`,
    )
    const xi = clamp(float(xi_in), float(0), float(1)).toVar(`${prefix}IntervalMaskXi`)
    const intervalSectors = u1.sub(u0).mul(float(SECTOR_COUNT)).toVar(`${prefix}IntervalSectors`)
    const result = uint(0).toVar(`${prefix}IntervalMaskResult`)

    If(intervalSectors.greaterThan(float(1e-5)), () => {
      If(intervalSectors.greaterThanEqual(float(1)), () => {
        const k0 = int(ceil(u0.mul(float(SECTOR_COUNT)).sub(float(0.5))))
        const k1 = int(floor(u1.mul(float(SECTOR_COUNT)).sub(float(0.5))))
        result.assign((maskRangeFn as any)(k0, k1.add(int(1))))
      }).Else(() => {
        const thinSectorRaw = floor(u0.add(u1).mul(float(0.5 * SECTOR_COUNT)))
        const thinSectorIndex = int(
          max(float(0), min(float(SECTOR_COUNT - 1), thinSectorRaw)),
        ).toVar(`${prefix}ThinSectorIndex`)
        const thinSectorMask = shiftLeft(uint(1), uint(thinSectorIndex)).toVar(
          `${prefix}ThinSectorMask`,
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
    name: `${prefix}IntervalMaskStochastic`,
    type: 'uint',
    inputs: [
      { name: 'u0', type: 'float' },
      { name: 'u1', type: 'float' },
      { name: 'xi', type: 'float' },
    ],
  })
}
