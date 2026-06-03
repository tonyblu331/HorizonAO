import { describe, expect, it } from 'vitest'
import {
  AO_FAILURE_LABELS,
  VBAO_RECONSTRUCTION_STAGES,
  createEvidenceArtifactStatusRows,
  createReferenceGateStatusRows,
  createRenderedThinGeometryProxyRows,
  createVbaoReconstructionStageStatusRows,
  classifyFailureLabels,
} from '../../../../apps/demo/scripts/profiling/productionReport.mjs'

describe('VBAO profiling failure labels', () => {
  it('keeps the evidence label vocabulary explicit', () => {
    expect(AO_FAILURE_LABELS).toEqual([
      'none',
      'noise',
      'mud',
      'halo',
      'thin-gap',
      'edge-bleed',
      'ghosting',
      'disocclusion',
      'scale-mismatch',
      'false-curvature',
    ])
  })

  it('keeps the half-resolution reconstruction stage vocabulary explicit', () => {
    expect(VBAO_RECONSTRUCTION_STAGES).toEqual([
      'raw',
      'cleanup',
      'resolve',
      'polish',
      'final',
    ])
  })

  it('labels non-VBAO rows as no VBAO failure', () => {
    expect(classifyFailureLabels({ mode: 'gtao' })).toEqual(['none'])
  })

  it('rejects half-resolution VBAO product rows with scale artifacts', () => {
    expect(classifyFailureLabels({ mode: 'vbao', fullResolutionVbao: false })).toEqual([
      'noise',
      'false-curvature',
      'scale-mismatch',
    ])
  })

  it('labels full-resolution raw/product VBAO rows with current production artifacts', () => {
    expect(
      classifyFailureLabels({
        mode: 'vbao',
        fullResolutionVbao: true,
        denoise: false,
      }),
    ).toEqual(['noise', 'edge-bleed'])

    expect(
      classifyFailureLabels({
        mode: 'vbao',
        fullResolutionVbao: true,
        denoise: true,
        productOutputContract: 'VBAONode.getTextureNode() final product AO',
      }),
    ).toEqual(['noise', 'edge-bleed'])
  })

  it('keeps legacy denoised rows visibly rejected when old filter fields appear', () => {
    expect(
      classifyFailureLabels({
        mode: 'vbao',
        fullResolutionVbao: true,
        denoise: true,
        vbaoDenoiseFilter: 'legacy',
      }),
    ).toEqual(['noise', 'mud', 'thin-gap', 'edge-bleed'])
  })

  it('marks product AO rows without fixture observations as reference gate misses', () => {
    const rows = createReferenceGateStatusRows([
      { label: 'vbao raw beauty', mode: 'vbao', view: 'beauty', denoise: false },
      { label: 'vbao product ao', mode: 'vbao', view: 'ao', denoise: true },
      {
        label: 'gtao denoised ao',
        mode: 'gtao',
        view: 'ao',
        denoise: true,
        referenceObservations: [{ fixtureId: 'flat-plane-open' }],
      },
      { label: 'n8ao ao', mode: 'n8ao', view: 'ao', denoise: true },
    ])

    expect(rows).toEqual([
      {
        label: 'vbao product ao',
        algorithm: 'vbao',
        output: 'product',
        observedFixtureCount: 0,
        status: 'missing-reference-observation',
      },
      {
        label: 'gtao denoised ao',
        algorithm: 'gtao',
        output: 'denoised',
        observedFixtureCount: 1,
        status: 'compared',
      },
      {
        label: 'n8ao ao',
        algorithm: 'n8ao',
        output: 'internally-filtered',
        observedFixtureCount: 0,
        status: 'missing-reference-observation',
      },
    ])
  })

  it('summarizes rendered thin-geometry proxy rows without calling them reference proof', () => {
    const rows = createRenderedThinGeometryProxyRows([
      {
        label: 'vbao beauty',
        mode: 'vbao',
        view: 'beauty',
        denoise: true,
        fullResolutionVbao: true,
        vbaoResolution: 'full-res',
        failureLabels: ['noise', 'edge-bleed'],
        qualityMetrics: {
          thinGapPreservationProxy: 0.004,
          edgeBleedProxy: 0.02,
          stripeScore: 0.12,
        },
      },
      {
        label: 'vbao ao missing stripe',
        mode: 'vbao',
        view: 'ao',
        denoise: true,
        fullResolutionVbao: true,
        vbaoResolution: 'full-res',
        failureLabels: ['noise', 'thin-gap', 'mud'],
        qualityMetrics: {
          thinGapPreservationProxy: 0.001,
          edgeBleedProxy: 0.03,
        },
      },
      {
        label: 'gtao ignored',
        mode: 'gtao',
        view: 'ao',
        denoise: true,
      },
    ])

    expect(rows).toEqual([
      {
        label: 'vbao beauty',
        view: 'beauty',
        output: 'product',
        vbaoResolution: 'full-res',
        thinGapProxy: 0.004,
        edgeBleedProxy: 0.02,
        stripeScore: 0.12,
        failureLabels: ['noise', 'edge-bleed'],
        status: 'complete',
        missing: [],
      },
      {
        label: 'vbao ao missing stripe',
        view: 'ao',
        output: 'product',
        vbaoResolution: 'full-res',
        thinGapProxy: 0.001,
        edgeBleedProxy: 0.03,
        stripeScore: null,
        failureLabels: ['noise', 'thin-gap', 'mud'],
        status: 'incomplete',
        missing: ['qualityMetrics.stripeScore'],
      },
    ])
  })

  it('marks rows with missing screenshots or timing as incomplete evidence', () => {
    const rows = createEvidenceArtifactStatusRows([
      {
        label: 'vbao complete',
        mode: 'vbao',
        screenshotPath: 'artifacts/benchmarks/screenshots-ao-production/vbao.png',
        latest: { medianFrameMs: 1.25, p95FrameMs: 2.5 },
        passTimings: [
          { pass: 'raw', status: 'measured', gpuMs: 0.25 },
          { pass: 'total-product', status: 'derived', gpuMs: 0.25 },
        ],
      },
      {
        label: 'missing screenshot',
        mode: 'gtao',
        latest: { medianFrameMs: 1.25, p95FrameMs: 2.5 },
      },
      {
        label: 'missing frame timing',
        mode: 'ssao',
        screenshotPath: 'artifacts/benchmarks/screenshots-ao-production/ssao.png',
        latest: { medianFrameMs: 1.25 },
      },
      {
        label: 'missing pass timing',
        mode: 'vbao',
        screenshotPath: 'artifacts/benchmarks/screenshots-ao-production/vbao-missing.png',
        latest: { medianFrameMs: 1.25, p95FrameMs: 2.5 },
        passTimings: [{ pass: 'raw', status: 'missing', gpuMs: null }],
      },
      {
        label: 'half-res-reconstruction-gate missing reconstruction stages',
        mode: 'vbao',
        denoise: true,
        fullResolutionVbao: false,
        screenshotPath: 'artifacts/benchmarks/screenshots-ao-production/vbao-half-res.png',
        latest: { medianFrameMs: 1.25, p95FrameMs: 2.5 },
        passTimings: [
          { pass: 'raw', status: 'measured', gpuMs: 0.25 },
          { pass: 'cleanup', status: 'measured', gpuMs: 0.1 },
          { pass: 'resolve', status: 'measured', gpuMs: 0.12 },
          { pass: 'polish', status: 'skipped', gpuMs: null },
          { pass: 'total-product', status: 'derived', gpuMs: 0.47 },
        ],
        reconstructionStages: [{ stage: 'raw', failureLabels: ['noise'] }],
      },
    ])

    expect(rows).toEqual([
      {
        label: 'vbao complete',
        status: 'complete',
        missing: [],
      },
      {
        label: 'missing screenshot',
        status: 'incomplete',
        missing: ['screenshotPath'],
      },
      {
        label: 'missing frame timing',
        status: 'incomplete',
        missing: ['latest.p95FrameMs'],
      },
      {
        label: 'missing pass timing',
        status: 'incomplete',
        missing: ['passTimings.raw'],
      },
      {
        label: 'half-res-reconstruction-gate missing reconstruction stages',
        status: 'incomplete',
        missing: [
          'reconstructionStages.cleanup',
          'reconstructionStages.resolve',
          'reconstructionStages.polish',
          'reconstructionStages.final',
        ],
      },
    ])
  })

  it('does not require downstream pass timings for intermediate VBAO reconstruction stages', () => {
    const rows = createEvidenceArtifactStatusRows([
      {
        label: 'half-res raw stage',
        mode: 'vbao',
        denoise: true,
        fullResolutionVbao: false,
        vbaoReconstructionStage: 'raw',
        screenshotPath: 'artifacts/benchmarks/screenshots-ao-production/vbao-raw.png',
        latest: { medianFrameMs: 1.25, p95FrameMs: 2.5 },
        passTimings: [
          { pass: 'raw', status: 'measured', gpuMs: 0.25 },
          { pass: 'cleanup', status: 'missing', gpuMs: null },
          { pass: 'resolve', status: 'missing', gpuMs: null },
          { pass: 'polish', status: 'skipped', gpuMs: null },
          { pass: 'total-product', status: 'derived', gpuMs: 0.25 },
        ],
      },
      {
        label: 'half-res cleanup stage',
        mode: 'vbao',
        denoise: true,
        fullResolutionVbao: false,
        vbaoReconstructionStage: 'cleanup',
        screenshotPath: 'artifacts/benchmarks/screenshots-ao-production/vbao-cleanup.png',
        latest: { medianFrameMs: 1.25, p95FrameMs: 2.5 },
        passTimings: [
          { pass: 'raw', status: 'measured', gpuMs: 0.25 },
          { pass: 'cleanup', status: 'measured', gpuMs: 0.1 },
          { pass: 'resolve', status: 'missing', gpuMs: null },
          { pass: 'polish', status: 'skipped', gpuMs: null },
          { pass: 'total-product', status: 'derived', gpuMs: 0.35 },
        ],
      },
      {
        label: 'half-res raw stage unexpected downstream pass',
        mode: 'vbao',
        denoise: true,
        fullResolutionVbao: false,
        vbaoReconstructionStage: 'raw',
        screenshotPath: 'artifacts/benchmarks/screenshots-ao-production/vbao-raw-unexpected.png',
        latest: { medianFrameMs: 1.25, p95FrameMs: 2.5 },
        passTimings: [
          { pass: 'raw', status: 'measured', gpuMs: 0.25 },
          { pass: 'cleanup', status: 'unexpected', gpuMs: 0.1 },
          { pass: 'total-product', status: 'derived', gpuMs: 0.35 },
        ],
      },
    ])

    expect(rows).toEqual([
      {
        label: 'half-res raw stage',
        status: 'complete',
        missing: [],
      },
      {
        label: 'half-res cleanup stage',
        status: 'complete',
        missing: [],
      },
      {
        label: 'half-res raw stage unexpected downstream pass',
        status: 'incomplete',
        missing: ['passTimings.cleanup'],
      },
    ])
  })

  it('requires half-resolution product rows to provide every reconstruction stage label', () => {
    const rows = createVbaoReconstructionStageStatusRows([
      {
        label: 'half-res complete',
        mode: 'vbao',
        denoise: true,
        fullResolutionVbao: false,
        reconstructionStages: [
          { stage: 'raw', failureLabels: ['noise'] },
          { stage: 'cleanup', failureLabels: ['noise'] },
          { stage: 'resolve', failureLabels: ['noise', 'false-curvature'] },
          { stage: 'polish', failureLabels: ['noise', 'false-curvature'] },
          { stage: 'final', failureLabels: ['noise', 'false-curvature'] },
        ],
      },
      {
        label: 'half-res missing stages',
        mode: 'vbao',
        denoise: true,
        fullResolutionVbao: false,
        reconstructionStages: [{ stage: 'raw', failureLabels: ['noise'] }],
      },
      {
        label: 'full-res product',
        mode: 'vbao',
        denoise: true,
        fullResolutionVbao: true,
      },
    ])

    expect(rows).toEqual([
      {
        label: 'half-res complete',
        status: 'complete',
        missingStages: [],
        firstFailingStage: 'raw',
      },
      {
        label: 'half-res missing stages',
        status: 'incomplete',
        missingStages: ['cleanup', 'resolve', 'polish', 'final'],
        firstFailingStage: 'raw',
      },
    ])
  })
})
