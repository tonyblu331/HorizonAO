import { describe, expect, it } from 'vitest'
import source from '../VBAONode.ts?raw'

describe('VBAONode adaptive thickness TSL source contract', () => {
  it('imports the internal adaptive-thickness constants without exporting a public knob', () => {
    expect(source).toContain("from './vbaoAdaptiveThickness'")
    expect(source).not.toContain('adaptiveThickness?:')
  })

  it('uses an estimated adaptive thickness for the blocker back face', () => {
    expect(source).toContain('adaptiveThickness')
    expect(source).toContain('samplePos.sub(sampleViewDir.mul(adaptiveThickness)).sub(P)')
    expect(source).not.toContain('samplePos.sub(sampleViewDir.mul(this.thickness)).sub(P)')
  })

  it('uses a noise alpha radial scale so samples do not march a fixed screen lattice', () => {
    expect(source).toContain('radialScale')
    expect(source).toContain('noiseTexel.w')
    expect(source).toContain('float(j).add(1.0).div(float(this.samples)).mul(radialScale)')
  })

  it('keeps sampling schedules out of constructor options while allowing benchmark injection', () => {
    expect(source).toContain('setBenchmarkSamplingSchedule')
    expect(source).not.toContain('samplingSchedule?:')
  })
})
