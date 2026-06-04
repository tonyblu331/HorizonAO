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
  it('selects comparable AO rows and rejects non-product non-VBAO rows', () => {
    const rows: AoProductionReferenceGateInputRow[] = [
      { label: 'vbao raw beauty', mode: 'vbao', view: 'beauty', denoise: false },
      {
        label: 'vbao raw ao',
        mode: 'vbao',
        view: 'ao',
        denoise: false,
        referenceObservations: [
          {
            fixtureId: 'flat-plane-open',
            accessibility: flatPlaneReference.accessibility,
            source: 'gpu-readback',
          },
        ],
      },
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
      'vbao raw ao',
      'vbao product ao',
      'gtao denoised ao',
      'n8ao filtered ao',
    ])
    expect(report.productRows.map((row) => row.status)).toEqual([
      'compared',
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
    const vbaoCandidate = sphereRow?.candidates.find(
      (candidate) => candidate.algorithm === 'vbao-product',
    )

    expect(vbaoCandidate?.absError).toBeCloseTo(0.25, 12)
    expect(vbaoCandidate?.verdict).toBe('fail')
    expect(
      report.raycastReport.summary.find((item) => item.algorithm === 'vbao-product')?.verdict,
    ).toBe('fail')
  })

  it('keeps raw and product VBAO fixture observations separate', () => {
    const report = createAoProductionReferenceGateReport(
      [
        {
          label: 'vbao raw ao',
          mode: 'vbao',
          view: 'ao',
          denoise: false,
          referenceObservations: [
            {
              fixtureId: 'sphere-contact',
              accessibility: sphereReference.accessibility - 0.02,
              source: 'gpu-readback',
            },
          ],
        },
        {
          label: 'vbao product ao',
          mode: 'vbao',
          view: 'ao',
          denoise: true,
          referenceObservations: [
            {
              fixtureId: 'sphere-contact',
              accessibility: sphereReference.accessibility - 0.2,
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

    expect(sphereRow?.candidates.map((candidate) => candidate.algorithm)).toEqual([
      'vbao-raw',
      'vbao-product',
    ])
    expect(report.raycastReport.summary.find((item) => item.algorithm === 'vbao-raw')?.verdict)
      .toBe('warn')
    expect(
      report.raycastReport.summary.find((item) => item.algorithm === 'vbao-product')?.verdict,
    ).toBe('fail')
  })

  it('keeps absent thin-slab product observations visible as missing coverage', () => {
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
              source: 'gpu-readback',
            },
          ],
        },
      ],
      {
        generatedAt: '2026-06-01T00:00:00.000Z',
        sampleCount: 1024,
      },
    )

    const vbaoSummary = report.raycastReport.summary.find(
      (item) => item.algorithm === 'vbao-product',
    )

    expect(report.productRows[0]?.status).toBe('compared')
    expect(vbaoSummary?.missingFixtureIds).toContain('thin-gap-separated-slabs')
    expect(vbaoSummary?.verdict).toBe('warn')
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
      'grazing-normal',
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
    expect(markdown).toContain('| vbao-product | warn | 1 |')
    expect(markdown).toContain('# AO Reference Fixture Report')
    expect(markdown).toContain('# VBAO Canonical Drift Report')
    expect(markdown).toContain(
      'Missing expected candidate rows produce missing or warning summaries',
    )
  })
})
