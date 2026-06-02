import { describe, expect, it } from 'vitest'
import {
  RAYCAST_AO_FIXTURES,
  evaluateRaycastAoReference,
  type RaycastAoFixtureId,
} from '../aoRaycastReference'
import {
  createAoReferenceReport,
  formatAoReferenceReportMarkdown,
  type AoReferenceObservation,
} from '../aoReferenceReport'

const fixtureById = Object.fromEntries(
  RAYCAST_AO_FIXTURES.map((fixture) => [fixture.id, fixture]),
) as Record<RaycastAoFixtureId, (typeof RAYCAST_AO_FIXTURES)[number]>

function exactObservation(fixtureId: RaycastAoFixtureId, algorithm: string): AoReferenceObservation {
  return {
    fixtureId,
    algorithm,
    accessibility: evaluateRaycastAoReference(fixtureById[fixtureId], 1024).accessibility,
    source: 'analytic-proxy',
  }
}

describe('AO reference report gate', () => {
  it('freezes ray-cast fixture references into report rows', () => {
    const report = createAoReferenceReport([], {
      generatedAt: '2026-06-01T00:00:00.000Z',
      sampleCount: 1024,
    })

    expect(report.rows.map((row) => row.fixtureId)).toEqual(
      RAYCAST_AO_FIXTURES.map((fixture) => fixture.id),
    )
    expect(report.summary.map((item) => item.algorithm)).toEqual([
      'canonical-vbao',
      'vbao',
      'gtao',
      'ssao',
      'n8ao',
    ])
    expect(report.summary.every((item) => item.verdict === 'missing')).toBe(true)
    expect(report.rows.find((row) => row.fixtureId === 'flat-plane-open')?.referenceAccessibility)
      .toBe(1)
    expect(report.rows.find((row) => row.fixtureId === 'two-wall-corner')?.referenceAccessibility)
      .toBeLessThan(0.8)
  })

  it('computes candidate errors and pass/warn/fail verdicts against the frozen reference', () => {
    const sphereReference = evaluateRaycastAoReference(fixtureById['sphere-contact'], 1024)
      .accessibility
    const observations: AoReferenceObservation[] = [
      exactObservation('flat-plane-open', 'vbao'),
      exactObservation('sphere-contact', 'vbao'),
      {
        fixtureId: 'sphere-contact',
        algorithm: 'n8ao',
        accessibility: sphereReference - 0.2,
        source: 'gpu-readback',
      },
    ]
    const report = createAoReferenceReport(observations, {
      generatedAt: '2026-06-01T00:00:00.000Z',
      sampleCount: 1024,
      thresholds: { warnAbsError: 0.05, failAbsError: 0.15 },
    })

    const sphereRow = report.rows.find((row) => row.fixtureId === 'sphere-contact')
    const vbaoCandidate = sphereRow?.candidates.find((candidate) => candidate.algorithm === 'vbao')
    const n8aoCandidate = sphereRow?.candidates.find((candidate) => candidate.algorithm === 'n8ao')

    expect(vbaoCandidate?.absError).toBe(0)
    expect(vbaoCandidate?.verdict).toBe('pass')
    expect(n8aoCandidate?.absError).toBeCloseTo(0.2, 12)
    expect(n8aoCandidate?.verdict).toBe('fail')
  })

  it('summarizes missing fixtures as warnings instead of pretending a candidate passed', () => {
    const report = createAoReferenceReport([exactObservation('flat-plane-open', 'vbao')], {
      generatedAt: '2026-06-01T00:00:00.000Z',
      sampleCount: 1024,
    })
    const summary = report.summary.find((item) => item.algorithm === 'vbao')

    expect(summary?.observedFixtureCount).toBe(1)
    expect(summary?.missingFixtureIds).toContain('thin-gap-separated-slabs')
    expect(summary?.verdict).toBe('warn')
  })

  it('formats a markdown report for EVIDENCE.md and benchmark artifacts', () => {
    const report = createAoReferenceReport(
      [
        exactObservation('flat-plane-open', 'vbao'),
        exactObservation('flat-plane-open', 'canonical-vbao'),
        exactObservation('flat-plane-open', 'gtao'),
      ],
      {
        generatedAt: '2026-06-01T00:00:00.000Z',
        sampleCount: 1024,
      },
    )
    const markdown = formatAoReferenceReportMarkdown(report)

    expect(markdown).toContain('# AO Reference Fixture Report')
    expect(markdown).toContain('| canonical-vbao | warn | 1 |')
    expect(markdown).toContain('| vbao | warn | 1 |')
    expect(markdown).toContain('| gtao | warn | 1 |')
    expect(markdown).toContain('| ssao | missing | 0 |')
    expect(markdown).toContain('| n8ao | missing | 0 |')
    expect(markdown).toContain('Missing expected candidate rows produce missing or warning summaries, not passes.')
  })
})
