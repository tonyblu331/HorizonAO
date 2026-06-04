import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AO_REQUIRED_REFERENCE_FIXTURE_IDS,
  createProductPromotionVerdictRows,
  createReferenceGateStatusRows,
  createRenderedProxyReferenceComparisonRows,
  writeProductionQualityReports,
} from './productionReport.mjs'

const completeEvidenceRow = {
  label: 'vbao product ao',
  status: 'complete',
  missing: [],
}

const passingThresholdRow = {
  label: 'vbao product ao',
  status: 'pass',
  blockers: [],
}

function completeReferenceObservations() {
  return AO_REQUIRED_REFERENCE_FIXTURE_IDS.map((fixtureId) => ({ fixtureId }))
}

function productRow(overrides = {}) {
  return {
    label: 'vbao product ao',
    mode: 'vbao',
    view: 'ao',
    denoise: true,
    fullResolutionVbao: true,
    referenceObservations: completeReferenceObservations(),
    failureLabels: ['none'],
    ...overrides,
  }
}

describe('production AO promotion verdicts', () => {
  it('requires every release fixture before a reference row is compared', () => {
    const rows = createReferenceGateStatusRows([
      productRow({
        referenceObservations: [{ fixtureId: 'flat-plane-open' }],
      }),
    ])

    expect(rows[0]?.status).toBe('missing-required-observation')
    expect(rows[0]?.missingRequiredFixtureIds).toContain('thin-gap-separated-slabs')
  })

  it('passes only complete default product rows without blocking labels', () => {
    const verdicts = createProductPromotionVerdictRows([productRow()], {
      evidenceArtifactRows: [completeEvidenceRow],
      thresholdGateRows: [passingThresholdRow],
    })

    expect(verdicts[0]).toEqual({
      label: 'vbao product ao',
      scene: 'n/a',
      resolution: 'n/a',
      view: 'ao',
      algorithm: 'vbao',
      output: 'product',
      verdict: 'pass',
      blockers: [],
    })
  })

  it('carries scene, resolution, view, algorithm, and output dimensions', () => {
    const verdicts = createProductPromotionVerdictRows(
      [
        productRow({
          scene: 'museum',
          resolution: { width: 1920, height: 1080 },
        }),
      ],
      {
        evidenceArtifactRows: [completeEvidenceRow],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]).toMatchObject({
      scene: 'museum',
      resolution: '1920x1080',
      view: 'ao',
      algorithm: 'vbao',
      output: 'product',
    })
  })

  it('marks missing artifacts or reference coverage as incomplete', () => {
    const verdicts = createProductPromotionVerdictRows(
      [
        productRow({
          referenceObservations: [{ fixtureId: 'flat-plane-open' }],
        }),
      ],
      {
        evidenceArtifactRows: [
          {
            label: 'vbao product ao',
            status: 'incomplete',
            missing: ['screenshotPath'],
          },
        ],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]?.verdict).toBe('incomplete')
    expect(verdicts[0]?.blockers).toContain('screenshotPath')
    expect(verdicts[0]?.blockers).toContain('missing-required-observation')
  })

  it('fails product rows with blocking failure labels', () => {
    const verdicts = createProductPromotionVerdictRows(
      [productRow({ failureLabels: ['noise', 'edge-bleed'] })],
      {
        evidenceArtifactRows: [completeEvidenceRow],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]?.verdict).toBe('fail')
    expect(verdicts[0]?.blockers).toContain('failureLabel.noise')
    expect(verdicts[0]?.blockers).toContain('failureLabel.edge-bleed')
  })

  it('keeps private evidence lanes candidate-only', () => {
    const verdicts = createProductPromotionVerdictRows(
      [productRow({ temporalMode: 'velocity-internal' })],
      {
        evidenceArtifactRows: [completeEvidenceRow],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]?.verdict).toBe('candidate-only')
  })

  it('does not treat n/a compute candidate sentinels as private lanes', () => {
    const verdicts = createProductPromotionVerdictRows(
      [
        productRow({
          computeCandidateLabel: 'n/a',
          latest: { vbaoComputeCandidateLabel: 'n/a' },
        }),
      ],
      {
        evidenceArtifactRows: [completeEvidenceRow],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]?.verdict).toBe('pass')
  })

  it('keeps benchmark-shaped cleanup and fused resolve rows candidate-only', () => {
    const verdicts = createProductPromotionVerdictRows(
      [
        productRow({ label: 'cleanup skip', cleanupMode: 'skip' }),
        productRow({ label: 'resolve polish fused', resolvePolishMode: 'fused' }),
      ],
      {
        evidenceArtifactRows: [
          { ...completeEvidenceRow, label: 'cleanup skip' },
          { ...completeEvidenceRow, label: 'resolve polish fused' },
        ],
        thresholdGateRows: [
          { ...passingThresholdRow, label: 'cleanup skip' },
          { ...passingThresholdRow, label: 'resolve polish fused' },
        ],
      },
    )

    expect(verdicts.map((row) => row.verdict)).toEqual(['candidate-only', 'candidate-only'])
  })

  it('keeps same-cost and spatial sample variants candidate-only', () => {
    const verdicts = createProductPromotionVerdictRows(
      [
        productRow({ label: 'same cost', sampleMode: 'same-cost-3x10' }),
        productRow({ label: 'spatial ultra', sampleMode: 'spatial-ultra' }),
      ],
      {
        evidenceArtifactRows: [
          { ...completeEvidenceRow, label: 'same cost' },
          { ...completeEvidenceRow, label: 'spatial ultra' },
        ],
        thresholdGateRows: [
          { ...passingThresholdRow, label: 'same cost' },
          { ...passingThresholdRow, label: 'spatial ultra' },
        ],
      },
    )

    expect(verdicts.map((row) => row.verdict)).toEqual(['candidate-only', 'candidate-only'])
  })

  it('includes VBAO raw-debug rows in the promotion matrix', () => {
    const verdicts = createProductPromotionVerdictRows(
      [productRow({ denoise: false })],
      {
        evidenceArtifactRows: [completeEvidenceRow],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]).toMatchObject({
      output: 'raw-debug',
      verdict: 'pass',
    })
  })

  it('does not pass product rows without an explicit threshold gate', () => {
    const verdicts = createProductPromotionVerdictRows([productRow()], {
      evidenceArtifactRows: [completeEvidenceRow],
    })

    expect(verdicts[0]?.verdict).toBe('incomplete')
    expect(verdicts[0]?.blockers).toContain('thresholdGate')
  })

  it('fails non-pass threshold rows with empty blockers when the threshold failed', () => {
    const verdicts = createProductPromotionVerdictRows([productRow()], {
      evidenceArtifactRows: [completeEvidenceRow],
      thresholdGateRows: [
        {
          label: 'vbao product ao',
          status: 'fail',
          blockers: [],
        },
      ],
    })

    expect(verdicts[0]?.verdict).toBe('fail')
    expect(verdicts[0]?.blockers).toContain('fail')
  })

  it('keeps non-default noise-source candidates candidate-only', () => {
    const verdicts = createProductPromotionVerdictRows(
      [productRow({ noiseSource: 'ign' })],
      {
        evidenceArtifactRows: [completeEvidenceRow],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]?.verdict).toBe('candidate-only')
  })

  it('includes beauty rows in the promotion matrix', () => {
    const verdicts = createProductPromotionVerdictRows(
      [productRow({ view: 'beauty' })],
      {
        evidenceArtifactRows: [completeEvidenceRow],
        thresholdGateRows: [passingThresholdRow],
      },
    )

    expect(verdicts[0]).toMatchObject({
      view: 'beauty',
      verdict: 'pass',
    })
  })

  it('writes derived promotion rows into JSON output', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'horizon-ao-production-report-'))
    try {
      const outputJson = path.join(tempDir, 'report.json')
      const outputMd = path.join(tempDir, 'report.md')

      await writeProductionQualityReports({
        outputJson,
        outputMd,
        report: {
          generatedAt: '2026-06-04T00:00:00.000Z',
          rows: [
            productRow({
              resolution: { width: 1920, height: 1080 },
              vbaoResolution: 'full',
              qualityMetrics: {
                patternNoiseScore: 0,
                stripeScore: 0,
                horizontalStripeScore: 0,
                verticalStripeScore: 0,
                directionalAnisotropy: 0,
                edgeBleedProxy: 0,
                thinGapPreservationProxy: 1,
              },
            }),
          ],
          evidenceArtifactRows: [completeEvidenceRow],
          thresholdGate: {
            productRows: [passingThresholdRow],
          },
        },
      })

      const report = JSON.parse(await readFile(outputJson, 'utf8'))
      expect(report.productPromotionRows[0]).toMatchObject({
        label: 'vbao product ao',
        verdict: 'pass',
      })
      expect(report.renderedProxyReferenceRows[0]).toMatchObject({
        label: 'vbao product ao',
        status: 'compared',
      })
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('blocks rendered proxy comparison when reference observations are missing', () => {
    const rows = createRenderedProxyReferenceComparisonRows([productRow()], {
      thinGeometryProxyRows: [
        {
          label: 'vbao product ao',
          view: 'ao',
          output: 'product',
          vbaoResolution: 'full-res',
          thinGapProxy: 0.1,
          edgeBleedProxy: 0.1,
          stripeScore: 0.1,
          failureLabels: ['none'],
          status: 'complete',
          missing: [],
        },
      ],
      referenceGateRows: [
        {
          label: 'vbao product ao',
          algorithm: 'vbao',
          output: 'product',
          observedFixtureCount: 0,
          missingRequiredFixtureIds: AO_REQUIRED_REFERENCE_FIXTURE_IDS,
          status: 'missing-reference-observation',
        },
      ],
    })

    expect(rows[0]).toMatchObject({
      status: 'blocked',
      proxyStatus: 'complete',
      referenceStatus: 'missing-reference-observation',
      observedFixtureCount: 0,
    })
    expect(rows[0]?.blockers).toContain('missing-reference-observation')
    expect(rows[0]?.blockers).toContain('fixture.thin-gap-separated-slabs')
  })

  it('compares rendered proxies only when required reference observations are present', () => {
    const rows = createRenderedProxyReferenceComparisonRows([productRow()], {
      thinGeometryProxyRows: [
        {
          label: 'vbao product ao',
          view: 'ao',
          output: 'product',
          vbaoResolution: 'full-res',
          thinGapProxy: 0.1,
          edgeBleedProxy: 0.1,
          stripeScore: 0.1,
          failureLabels: ['none'],
          status: 'complete',
          missing: [],
        },
      ],
      referenceGateRows: [
        {
          label: 'vbao product ao',
          algorithm: 'vbao',
          output: 'product',
          observedFixtureCount: AO_REQUIRED_REFERENCE_FIXTURE_IDS.length,
          missingRequiredFixtureIds: [],
          status: 'compared',
        },
      ],
    })

    expect(rows[0]).toMatchObject({
      status: 'compared',
      referenceStatus: 'compared',
      blockers: [],
    })
  })
})
