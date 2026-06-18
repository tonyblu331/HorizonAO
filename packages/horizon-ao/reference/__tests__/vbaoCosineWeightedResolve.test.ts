import { describe, expect, it } from 'vitest'

import { applyResolve, COSINE_WEIGHT_TOTAL as REF_TOTAL } from '../vbaoKernelAblation'
import { COSINE_WEIGHT_TOTAL } from '../../src/vbaoKernelPrimitives'

// JS transcription of the TSL Fn arithmetic (structural isomorphism).
// This must be kept byte-for-byte identical to the Loop body in
// vbaoCosineWeightedResolveFn so the test proves GPU-CPU parity.
function cosineWeightedResolveJs(mask: number): number {
  let occludedWeight = 0
  for (let k = 0; k < 32; k++) {
    if ((mask >>> k) & 1) {
      const u = (k + 0.5) / 32
      const s = 2 * u - 1
      occludedWeight += Math.sqrt(Math.max(1 - s * s, 0))
    }
  }
  return 1 - occludedWeight / COSINE_WEIGHT_TOTAL
}

describe('COSINE_WEIGHT_TOTAL — src vs reference', () => {
  it('src constant equals reference constant to < 1e-12', () => {
    expect(Math.abs(COSINE_WEIGHT_TOTAL - REF_TOTAL)).toBeLessThan(1e-12)
  })
})

describe('cosineWeightedResolveJs — formula equivalence vs applyResolve', () => {
  const masks = [
    0x00000000,
    0xffffffff,
    0x55555555,
    0xaaaaaaaa,
    0x0000ffff,
    0xffff0000 >>> 0,
    0x00000001,
    0x00008000,
    0x80000000 >>> 0,
    0xdeadbeef >>> 0,
    0xcafebabe >>> 0,
    0x12345678,
  ]

  for (const m of masks) {
    it(`mask 0x${m.toString(16).padStart(8, '0')} matches applyResolve to < 1e-9`, () => {
      const jsResult = cosineWeightedResolveJs(m)
      const refResult = applyResolve(m, 'cosineWeighted')
      expect(Math.abs(jsResult - refResult)).toBeLessThan(1e-9)
    })
  }
})

describe('cosineWeightedResolveJs — edge assertions', () => {
  it('empty mask (0x00000000) returns exactly 1.0', () => {
    expect(cosineWeightedResolveJs(0x00000000)).toBe(1.0)
  })

  it('full mask (0xFFFFFFFF) returns approximately 0.0 (< 1e-9)', () => {
    expect(Math.abs(cosineWeightedResolveJs(0xffffffff))).toBeLessThan(1e-9)
  })

  it('0x0000FFFF resolves to ≈ 0.5 (< 1e-9 from 0.5)', () => {
    expect(Math.abs(cosineWeightedResolveJs(0x0000ffff) - 0.5)).toBeLessThan(1e-9)
  })

  it('0xFFFF0000 resolves to ≈ 0.5 (< 1e-9 from 0.5)', () => {
    expect(Math.abs(cosineWeightedResolveJs(0xffff0000 >>> 0) - 0.5)).toBeLessThan(1e-9)
  })

  it('0x0000FFFF and 0xFFFF0000 both match applyResolve to < 1e-9', () => {
    const lo = cosineWeightedResolveJs(0x0000ffff)
    const hi = cosineWeightedResolveJs(0xffff0000 >>> 0)
    expect(Math.abs(lo - applyResolve(0x0000ffff, 'cosineWeighted'))).toBeLessThan(1e-9)
    expect(Math.abs(hi - applyResolve(0xffff0000 >>> 0, 'cosineWeighted'))).toBeLessThan(1e-9)
  })
})
