import { describe, expect, it } from 'vitest'

import { COSINE_WEIGHT_TOTAL } from '../vbaoKernelPrimitives'

describe('COSINE_WEIGHT_TOTAL — src constant', () => {
  it('constant is in the expected physical range (24 < x < 27)', () => {
    // Riemann sum of sqrt(1-sinBeta²) over 32 sectors ≈ 25.18 (spec §2)
    expect(COSINE_WEIGHT_TOTAL).toBeGreaterThan(24)
    expect(COSINE_WEIGHT_TOTAL).toBeLessThan(27)
  })

  it('constant is a finite positive number', () => {
    expect(Number.isFinite(COSINE_WEIGHT_TOTAL)).toBe(true)
    expect(COSINE_WEIGHT_TOTAL).toBeGreaterThan(0)
  })
})
