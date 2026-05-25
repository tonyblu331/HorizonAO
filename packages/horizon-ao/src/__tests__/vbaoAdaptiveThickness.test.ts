import { describe, expect, it } from 'vitest'
import {
  VBAO_ADAPTIVE_THICKNESS,
  resolveAdaptiveThicknessOptions,
} from '../vbaoAdaptiveThickness'

describe('VBAO adaptive thickness shader contract', () => {
  it('pins the internal constants used by the TSL port', () => {
    expect(VBAO_ADAPTIVE_THICKNESS).toEqual({
      minThickness: 0.02,
      thicknessScale: 10,
      continuityDepthTolerance: 0.08,
      continuityNormalDot: 0.95,
    })
  })

  it('uses the public thickness uniform only as the adaptive max cap', () => {
    expect(resolveAdaptiveThicknessOptions(0.25)).toEqual({
      minThickness: 0.02,
      maxThickness: 0.25,
      thicknessScale: 10,
      continuityDepthTolerance: 0.08,
      continuityNormalDot: 0.95,
    })
  })

  it('never returns a max cap below the internal minimum thickness', () => {
    expect(resolveAdaptiveThicknessOptions(0)).toEqual({
      minThickness: 0.02,
      maxThickness: 0.02,
      thicknessScale: 10,
      continuityDepthTolerance: 0.08,
      continuityNormalDot: 0.95,
    })
  })
})
