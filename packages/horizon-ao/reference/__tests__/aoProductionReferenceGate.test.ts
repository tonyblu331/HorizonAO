import { describe, expect, it } from 'vitest'
import { RAYCAST_AO_FIXTURES, evaluateRaycastAoReference } from '../aoRaycastReference'
import {
  createAoProductionReferenceGateReport,
  formatAoProductionReferenceGateMarkdown,
  type AoProductionReferenceGateInputRow,
} from '../aoProductionReferenceGate'

const flatPlaneReference = evaluateRaycastAoReference(RAYCAST_AO_FIXTURES[0]!, 1024)
const sphereReference = evaluateRaycastAoReference(RAYCAST_AO_FIXTURES[1]!, 1024)

describe('AO production reference gate', () => {
  it('selects product AO rows for VBAO/GTAO/SSAO/N8AO and rejects non-product rows', () => {
    const rows: AoProductionReferenceGateInputRow[] = [
      { label: 'vbao raw beauty', mode: 'vbao', view: 'beauty', denoise: false },
      { label: 'ssao raw ao', mode: 'ssao', view: 'ao', denoise: false },
      {
        label: 'vbao product ao',
        mode: 'vbao',
        view: 'ao',
        denoise: true,
        referenceObservations: [
          {
            fixtureId: 'flat-plane-open',
            accessibility: flatPlaneReference.accessibility,
            source: 'gpu-readback',
          },
        ],
      },
      {
        label: 'gtao denoised ao',
        mode: 'gtao',
        view: 'ao',
        denoise: true,
        referenceObservations: [
          {
            fixtureId: 'flat-plane-open',
            accessibility: flatPlaneReference.accessibility,
            source: 'gpu-readback',
          },
        ],
      },
      {
        label: 'n8ao filtered ao',
        mode: 'n8ao',
        view: 'ao',
        denoise: true,
      },
    ]

    const report = createAoProductionReferenceGateReport(rows, {
      generatedAt: '2026-06-01T00:00:00.000Z',
      sampleCount: 1024,
    })

    expect(report.productRows.map((row) => row.label)).toEqual([
      'vbao product ao',
      'gtao denoised ao',
      'n8ao filtered ao',
    ])
    expect(report.productRows.map((row) => row.status)).toEqual([
      'compared',
      'compared',
      'missing-reference-observation',
    ])
    expect(report.raycastReport.summary.find((item) => item.algorithm === 'ssao')?.verdict).toBe(
      'missing',
    )
    expect(report.raycastReport.summary.find((item) => item.algorithm === 'n8ao')?.verdict).toBe(
      'missing',
    )
  })

  it('compares product observations against the ray-cast report', () => {
    const report = createAoProductionReferenceGateReport(
      [
        {
          label: 'vbao product ao',
          mode: 'vbao',
          view: 'ao',
          denoise: true,
          referenceObservations: [
            {
              fixtureId: 'sphere-contact',
              accessibility: sphereReference.accessibility - 0.25,
              source: 'gpu-readback',
            },
          ],
        },
      ],
      {
        generatedAt: '2026-06-01T00:00:00.000Z',
        sampleCount: 1024,
        raycastThresholds: { warnAbsError: 0.05, failAbsError: 0.15 },
      },
    )

    const sphereRow = report.raycastReport.rows.find((row) => row.fixtureId === 'sphere-contact')
    const vbaoCandidate = sphereRow?.candidates.find((candidate) => candidate.algorithm === 'vbao')

    expect(vbaoCandidate?.absError).toBeCloseTo(0.25, 12)
    expect(vbaoCandidate?.verdict).toBe('fail')
    expect(report.raycastReport.summary.find((item) => item.algorithm === 'vbao')?.verdict).toBe(
      'fail',
    )
  })

  it('includes the canonical/product VBAO drift report beside the ray-cast gate', () => {
    const report = createAoProductionReferenceGateReport([], {
      generatedAt: '2026-06-01T00:00:00.000Z',
    })

    expect(report.canonicalVbaoDriftReport.rows.map((row) => row.caseId)).toEqual([
      'open',
      'thin-separated',
      'thick-contact',
      'perspective-thickness',
    ])
    expect(report.canonicalVbaoDriftReport.summary.verdict).toBe('fail')
  })

  it('formats product coverage, ray-cast comparison, and canonical drift markdown', () => {
    const report = createAoProductionReferenceGateReport(
      [
        {
          label: 'vbao product ao',
          mode: 'vbao',
          view: 'ao',
          denoise: true,
          referenceObservations: [
            {
              fixtureId: 'flat-plane-open',
              accessibility: flatPlaneReference.accessibility,
            },
          ],
        },
      ],
      {
        generatedAt: '2026-06-01T00:00:00.000Z',
        sampleCount: 1024,
      },
    )
    const markdown = formatAoProductionReferenceGateMarkdown(report)

    expect(markdown).toContain('# AO Production Reference Gate')
    expect(markdown).toContain('| vbao product ao | vbao | product | 1 | compared |')
    expect(markdown).toContain('# AO Reference Fixture Report')
    expect(markdown).toContain('# VBAO Canonical Drift Report')
    expect(markdown).toContain(
      'Missing expected candidate rows produce missing or warning summaries',
    )
  })
})
