import { describe, expect, it } from 'vitest'
import {
  VBAO_PRODUCT_FIXTURE_IDS,
  createVbaoProductFixtureObservationReport,
  formatVbaoProductFixtureObservationReportMarkdown,
} from '../vbaoProductFixtureObservations'

describe('VBAO product fixture observations', () => {
  it('records product observations for the release quality fixture set', () => {
    const report = createVbaoProductFixtureObservationReport({
      generatedAt: '2026-06-02T00:00:00.000Z',
    })

    expect(report.verdict).toBe('observed')
    expect(report.missingFixtureIds).toEqual([])
    expect(report.observations.map((observation) => observation.fixtureId)).toEqual(
      VBAO_PRODUCT_FIXTURE_IDS,
    )
    expect(report.observations.find((row) => row.fixtureId === 'flat-plane')?.accessibility).toBe(
      1,
    )
    expect(
      report.observations.find((row) => row.fixtureId === 'full-hemisphere')?.accessibility,
    ).toBe(0)
    expect(
      report.observations.find((row) => row.fixtureId === 'two-wall-corner')?.accessibility,
    ).toBeGreaterThan(0)
    expect(
      report.observations.find((row) => row.fixtureId === 'thin-occluder')?.occupiedSectors,
    ).toBeLessThan(4)
  })

  it('reports missing observations as blockers, not passes', () => {
    const report = createVbaoProductFixtureObservationReport({
      generatedAt: '2026-06-02T00:00:00.000Z',
      observations: [],
    })

    expect(report.verdict).toBe('missing-reference-observation')
    expect(report.missingFixtureIds).toEqual(VBAO_PRODUCT_FIXTURE_IDS)
  })

  it('formats fixture observations for EVIDENCE.md', () => {
    const markdown = formatVbaoProductFixtureObservationReportMarkdown(
      createVbaoProductFixtureObservationReport({
        generatedAt: '2026-06-02T00:00:00.000Z',
      }),
    )

    expect(markdown).toContain('# VBAO Product Fixture Observations')
    expect(markdown).toContain('| flat-plane | 1.0000 | 0/32 | analytic-product-reference |')
    expect(markdown).toContain('| full-hemisphere | 0.0000 | 32/32 | analytic-product-reference |')
    expect(markdown).toContain('Missing product fixture observations are blockers, not passes.')
  })
})
