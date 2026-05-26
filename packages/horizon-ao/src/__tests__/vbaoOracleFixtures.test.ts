import { describe, expect, it } from 'vitest'
import {
  VBAO_ORACLE_FIXTURE_IDS,
  evaluateVbaoOracleFixtureMatrix,
} from '../vbaoOracleFixtures'
import indexSource from '../index.ts?raw'

describe('VBAO oracle fixture matrix', () => {
  it('keeps a stable production-readiness fixture set', () => {
    expect(VBAO_ORACLE_FIXTURE_IDS).toEqual([
      'flat-open',
      'full-hemisphere-blocked',
      'two-wall-corner',
      'thin-occluder',
      'stair-step-negative',
      'museum-scale',
    ])
  })

  it('evaluates analytic fixtures into expected accessibility ranges', () => {
    const matrix = evaluateVbaoOracleFixtureMatrix({ sampleCount: 4096 })
    const byId = Object.fromEntries(matrix.map((row) => [row.id, row]))

    expect(byId['flat-open']?.accessibility).toBe(1)
    expect(byId['flat-open']?.accepted).toBe(true)

    expect(byId['full-hemisphere-blocked']?.accessibility).toBe(0)
    expect(byId['full-hemisphere-blocked']?.accepted).toBe(true)

    expect(byId['two-wall-corner']?.accessibility).toBeGreaterThan(0.22)
    expect(byId['two-wall-corner']?.accessibility).toBeLessThan(0.28)
    expect(byId['two-wall-corner']?.accepted).toBe(true)

    expect(byId['thin-occluder']?.accessibility).toBeGreaterThan(0.9)
    expect(byId['thin-occluder']?.accessibility).toBeLessThan(0.99)
    expect(byId['thin-occluder']?.accepted).toBe(true)

    expect(byId['museum-scale']?.accessibility).toBeGreaterThan(0.45)
    expect(byId['museum-scale']?.accessibility).toBeLessThan(0.7)
    expect(byId['museum-scale']?.accepted).toBe(true)
  })

  it('keeps stair-step false curvature as a rejecting negative control', () => {
    const matrix = evaluateVbaoOracleFixtureMatrix({ sampleCount: 4096 })
    const stairStep = matrix.find((row) => row.id === 'stair-step-negative')

    expect(stairStep?.accepted).toBe(false)
    expect(stairStep?.failureLabels).toContain('false-curvature')
  })

  it('does not expose fixture helpers from the public package API', () => {
    expect(indexSource).not.toContain('vbaoOracleFixtures')
    expect(indexSource).not.toContain('VBAO_ORACLE_FIXTURE_IDS')
  })
})
