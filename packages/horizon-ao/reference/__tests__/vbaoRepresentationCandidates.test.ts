/**
 * P2 — VBAO Representation Study: candidate estimator tests.
 *
 * Follows strict TDD vertical slices:
 *   Phase 2: R0-angle cross-check
 *   Phase 3: cosine codec mapping units
 *   Phase 4: cosine bitmask estimator
 *   Phase 5: dense sweep estimator
 *   Phase 6: slice-axis variants
 *   Phase 7: study report shape + verdict
 *   Phase 8: R2-dense aggregate monotonicity
 *   Phase 9: deep-equal baseline lock
 */

import { describe, expect, it } from 'vitest'
import { RAYCAST_AO_FIXTURES } from '../aoRaycastReference'
import { evaluateVbaoRepresentationEstimate } from '../vbaoGroundTruthDelta'
import {
  cosineSectorCenterAlpha,
  cosineSectorIndex,
  computeMae,
  computeRmse,
  createAngleBitmaskEstimator,
  createCosineBitmaskEstimator,
  createDenseSweepEstimator,
  createRepresentationStudyReport,
  estimateSliceAxis,
  evaluateVerdict,
  formatRepresentationStudyReportMarkdown,
  REPRESENTATION_STUDY_GENERATED_AT,
  type RepresentationStudyReport,
} from '../vbaoRepresentationCandidates'

// ─── Phase 2: R0-angle cross-check ───────────────────────────────────────────

describe('createAngleBitmaskEstimator (R0-angle)', () => {
  it('delegates to evaluateVbaoRepresentationEstimate for all fixtures × slices', () => {
    const estimator = createAngleBitmaskEstimator(32)
    for (const fixture of RAYCAST_AO_FIXTURES) {
      for (const slices of [2, 4, 8] as const) {
        const expected = evaluateVbaoRepresentationEstimate(fixture, slices)
        const actual = estimator.evaluate(fixture, slices)
        expect(actual).toBe(expected)
      }
    }
  })

  it('exposes id, sectorCount, costNote', () => {
    const estimator = createAngleBitmaskEstimator(32)
    expect(estimator.id).toBe('R0-angle')
    expect(estimator.sectorCount).toBe(32)
    expect(estimator.costNote).toBeTruthy()
  })
})

// ─── Phase 3: cosine codec mapping unit tests ─────────────────────────────────

describe('cosineSectorIndex', () => {
  it('maps alpha=π to sector 0 (u→0)', () => {
    expect(cosineSectorIndex(Math.PI, 32)).toBe(0)
  })

  it('maps alpha=π/2 to sector 16 (u=0.5)', () => {
    expect(cosineSectorIndex(Math.PI / 2, 32)).toBe(16)
  })

  it('maps alpha=0 to sector 31 (u→1)', () => {
    expect(cosineSectorIndex(0, 32)).toBe(31)
  })
})

describe('cosineSectorCenterAlpha', () => {
  it('round-trips: for all k in [0,31], sector-center alpha maps back to k', () => {
    for (let k = 0; k < 32; k++) {
      const alpha = cosineSectorCenterAlpha(k, 32)
      const back = cosineSectorIndex(alpha, 32)
      expect(back).toBe(k)
    }
  })

  it('round-trips with 128 sectors', () => {
    for (let k = 0; k < 128; k++) {
      const alpha = cosineSectorCenterAlpha(k, 128)
      const back = cosineSectorIndex(alpha, 128)
      expect(back).toBe(k)
    }
  })
})

// ─── Phase 4: cosine bitmask estimator ────────────────────────────────────────

describe('createCosineBitmaskEstimator', () => {
  it('R0-cosine: id and sectorCount', () => {
    const est = createCosineBitmaskEstimator(32)
    expect(est.id).toBe('R0-cosine')
    expect(est.sectorCount).toBe(32)
  })

  it('R1-cosine-128: id and sectorCount', () => {
    const est = createCosineBitmaskEstimator(128)
    expect(est.id).toBe('R1-cosine-128')
    expect(est.sectorCount).toBe(128)
  })

  it('R0-cosine returns finite [0,1] for each fixture', () => {
    const est = createCosineBitmaskEstimator(32)
    for (const fixture of RAYCAST_AO_FIXTURES) {
      const result = est.evaluate(fixture, 4)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    }
  })

  it('R1-cosine-128 returns finite [0,1] for each fixture', () => {
    const est = createCosineBitmaskEstimator(128)
    for (const fixture of RAYCAST_AO_FIXTURES) {
      const result = est.evaluate(fixture, 4)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    }
  })
})

// ─── Phase 5: dense sweep estimator ──────────────────────────────────────────

describe('createDenseSweepEstimator', () => {
  it('R2-dense-sweep: id', () => {
    const est = createDenseSweepEstimator(4096)
    expect(est.id).toBe('R2-dense-sweep')
  })

  it('deterministic: calling twice returns identical values', () => {
    const est = createDenseSweepEstimator(4096)
    for (const fixture of RAYCAST_AO_FIXTURES) {
      const a = est.evaluate(fixture, 4)
      const b = est.evaluate(fixture, 4)
      expect(a).toBe(b)
    }
  })

  it('returns finite [0,1] for each fixture', () => {
    const est = createDenseSweepEstimator(4096)
    for (const fixture of RAYCAST_AO_FIXTURES) {
      const result = est.evaluate(fixture, 4)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(1)
    }
  })
})

// ─── Phase 6: slice-axis variants ────────────────────────────────────────────

describe('estimateSliceAxis', () => {
  it('returns finite accessibility for each fixture × sliceCount {2,4,8}', () => {
    for (const fixture of RAYCAST_AO_FIXTURES) {
      for (const sliceCount of [2, 4, 8]) {
        const result = estimateSliceAxis(fixture, sliceCount)
        expect(Number.isFinite(result)).toBe(true)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ─── Phase 7: study report shape and verdict ──────────────────────────────────

describe('createRepresentationStudyReport', () => {
  // Compute once for report shape tests
  let report: ReturnType<typeof createRepresentationStudyReport>

  it('returns exactly 7 candidates', () => {
    report = createRepresentationStudyReport()
    expect(report.candidates.length).toBe(7)
  })

  it('contains required top-level fields', () => {
    expect(report.primaryAggregate).toBeDefined()
    expect(report.secondaryAggregate).toBeDefined()
    expect(typeof report.secondaryAnnotation).toBe('string')
    expect(report.secondaryAnnotation.length).toBeGreaterThan(0)
    expect(Number.isFinite(report.faithfulnessDelta)).toBe(true)
    expect(report.decisionRuleThreshold).toBe(0.02)
    expect(['representation-bottleneck', 'not-bottleneck', 'marginal']).toContain(report.verdict)
  })

  it('generatedAt is the fixed constant', () => {
    expect(report.generatedAt).toBe(REPRESENTATION_STUDY_GENERATED_AT)
  })

  it('contains all 7 expected candidate IDs', () => {
    const ids = report.candidates.map((c) => c.estimatorId)
    expect(ids).toContain('R0-angle')
    expect(ids).toContain('R0-cosine')
    expect(ids).toContain('R1-cosine-128')
    expect(ids).toContain('R2-dense-sweep')
    expect(ids).toContain('slices-2')
    expect(ids).toContain('slices-4')
    expect(ids).toContain('slices-8')
  })
})

// Verdict rule unit tests (injected RMSE values)
describe('evaluateVerdict', () => {
  it('improvement 0.03 >= 0.02 threshold → representation-bottleneck', () => {
    expect(evaluateVerdict(0.07, 0.10, 0.02, 0.005)).toBe('representation-bottleneck')
  })

  it('improvement 0.001 < 0.005 margin → not-bottleneck', () => {
    expect(evaluateVerdict(0.099, 0.10, 0.02, 0.005)).toBe('not-bottleneck')
  })

  it('improvement 0.01 between margin and threshold → marginal', () => {
    expect(evaluateVerdict(0.09, 0.10, 0.02, 0.005)).toBe('marginal')
  })

  it('improvement exactly 0.02 = threshold → representation-bottleneck', () => {
    expect(evaluateVerdict(0.08, 0.10, 0.02, 0.005)).toBe('representation-bottleneck')
  })
})

// Two-wall-corner exclusion
describe('two-wall-corner fixture exclusion', () => {
  let report: RepresentationStudyReport

  it('primaryAggregate fixtureCount = 8 (excludes two-wall-corner)', () => {
    report = createRepresentationStudyReport()
    for (const agg of Object.values(report.primaryAggregate)) {
      expect(agg.fixtureCount).toBe(8)
    }
  })

  it('secondaryAggregate fixtureCount = 9 (all fixtures)', () => {
    for (const agg of Object.values(report.secondaryAggregate)) {
      expect(agg.fixtureCount).toBe(9)
    }
  })
})

// Markdown snapshot test
describe('formatRepresentationStudyReportMarkdown', () => {
  it('contains all candidate IDs and verdict string', () => {
    const report = createRepresentationStudyReport()
    const md = formatRepresentationStudyReportMarkdown(report)
    expect(md).toContain('R0-angle')
    expect(md).toContain('R0-cosine')
    expect(md).toContain('R1-cosine-128')
    expect(md).toContain('R2-dense-sweep')
    expect(md).toContain(report.verdict)
  })
})

// ─── Phase 8: R2-dense aggregate monotonicity ─────────────────────────────────

describe('R2-dense aggregate monotonicity', () => {
  const R2_EPSILON = 0.005

  it('R2-dense primaryRmse <= min(R0-cosine, R1-cosine-128) primaryRmse + R2_EPSILON', () => {
    const report = createRepresentationStudyReport()
    const r0cosineRmse = report.primaryAggregate['R0-cosine']!.rmse
    const r1cosineRmse = report.primaryAggregate['R1-cosine-128']!.rmse
    const r2denseRmse = report.primaryAggregate['R2-dense-sweep']!.rmse

    expect(r2denseRmse).toBeLessThanOrEqual(
      Math.min(r0cosineRmse, r1cosineRmse) + R2_EPSILON,
    )
  })
})

// ─── Phase 9: deep-equal baseline lock ───────────────────────────────────────

// BASELINE_REPORT is populated from the actual output of createRepresentationStudyReport()
// after the GREEN phase. Numbers must be verbatim from the actual run.

const BASELINE_REPORT: RepresentationStudyReport = {
  generatedAt: '1970-01-01T00:00:00.000Z',
  cameraSetId: 'ssao-cam-v1',
  candidates: [
    {
      estimatorId: 'R0-angle',
      slices: 4,
      perFixture: {
        'flat-plane-open': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
        'sphere-contact': { ssAchievable: 0.954345703125, estimate: 0.8468746764232233, fixableDelta: -0.10747102670177666 },
        'box-contact': { ssAchievable: 0.81201171875, estimate: 0.8456708580912726, fixableDelta: 0.033659139341272626 },
        'two-wall-corner': { ssAchievable: 0.971923828125, estimate: 0.7356983684129992, fixableDelta: -0.23622545971200082 },
        'broad-wall-contact': { ssAchievable: 0.6767578125, estimate: 0.7311694903545272, fixableDelta: 0.05441167785452716 },
        'thin-gap-separated-slabs': { ssAchievable: 0.815673828125, estimate: 0.8456708580912726, fixableDelta: 0.029997029966272626 },
        'grazing-surface-wall': { ssAchievable: 0.600341796875, estimate: 0.5121541436317619, fixableDelta: -0.08818765324323807 },
        'normal-sensitive-side-contact': { ssAchievable: 0.673583984375, estimate: 0.4568073494358597, fixableDelta: -0.2167766349391403 },
        'far-object-outside-radius': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
      },
      primaryRmse: 0.0944143681963704,
      primaryMae: 0.06631289525577844,
      secondaryRmse: 0.11884399259884294,
      secondaryMae: 0.08519206908424759,
    },
    {
      estimatorId: 'R0-cosine',
      slices: 4,
      perFixture: {
        'flat-plane-open': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
        'sphere-contact': { ssAchievable: 0.954345703125, estimate: 0.8663288703059369, fixableDelta: -0.08801683281906314 },
        'box-contact': { ssAchievable: 0.81201171875, estimate: 0.8663288703059369, fixableDelta: 0.05431715155593686 },
        'two-wall-corner': { ssAchievable: 0.971923828125, estimate: 0.7689532586876615, fixableDelta: -0.2029705694373385 },
        'broad-wall-contact': { ssAchievable: 0.6767578125, estimate: 0.797491110649706, fixableDelta: 0.12073329814970601 },
        'thin-gap-separated-slabs': { ssAchievable: 0.815673828125, estimate: 0.8844766293438308, fixableDelta: 0.06880280121883076 },
        'grazing-surface-wall': { ssAchievable: 0.600341796875, estimate: 0.4587736292005986, fixableDelta: -0.1415681676744014 },
        'normal-sensitive-side-contact': { ssAchievable: 0.673583984375, estimate: 0.36939703443927424, fixableDelta: -0.30418694993572576 },
        'far-object-outside-radius': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
      },
      primaryRmse: 0.13350042938142578,
      primaryMae: 0.097203150169208,
      secondaryRmse: 0.14289699834259714,
      secondaryMae: 0.10895508564344472,
    },
    {
      estimatorId: 'R1-cosine-128',
      slices: 4,
      perFixture: {
        'flat-plane-open': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
        'sphere-contact': { ssAchievable: 0.954345703125, estimate: 0.8664827576172842, fixableDelta: -0.08786294550771578 },
        'box-contact': { ssAchievable: 0.81201171875, estimate: 0.8710765088445616, fixableDelta: 0.05906479009456156 },
        'two-wall-corner': { ssAchievable: 0.971923828125, estimate: 0.7693072150024063, fixableDelta: -0.20261661312259371 },
        'broad-wall-contact': { ssAchievable: 0.6767578125, estimate: 0.7905077757705667, fixableDelta: 0.11374996327056675 },
        'thin-gap-separated-slabs': { ssAchievable: 0.815673828125, estimate: 0.8801635255406159, fixableDelta: 0.06448969741561594 },
        'grazing-surface-wall': { ssAchievable: 0.600341796875, estimate: 0.46017701016986295, fixableDelta: -0.14016478670513705 },
        'normal-sensitive-side-contact': { ssAchievable: 0.673583984375, estimate: 0.36832599272652755, fixableDelta: -0.30525799164847245 },
        'far-object-outside-radius': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
      },
      primaryRmse: 0.1328227817132545,
      primaryMae: 0.0963237718302587,
      secondaryRmse: 0.1422785306868365,
      secondaryMae: 0.10813408752940702,
    },
    {
      estimatorId: 'R2-dense-sweep',
      slices: 4,
      perFixture: {
        'flat-plane-open': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
        'sphere-contact': { ssAchievable: 0.954345703125, estimate: 0.8652335888091116, fixableDelta: -0.08911211431588839 },
        'box-contact': { ssAchievable: 0.81201171875, estimate: 0.8692381997141461, fixableDelta: 0.057226480964146065 },
        'two-wall-corner': { ssAchievable: 0.971923828125, estimate: 0.7732673702495603, fixableDelta: -0.19865645787543973 },
        'broad-wall-contact': { ssAchievable: 0.6767578125, estimate: 0.7919682151168361, fixableDelta: 0.11521040261683613 },
        'thin-gap-separated-slabs': { ssAchievable: 0.815673828125, estimate: 0.8799078064980783, fixableDelta: 0.06423397837307832 },
        'grazing-surface-wall': { ssAchievable: 0.600341796875, estimate: 0.46310791503645377, fixableDelta: -0.13723388183854623 },
        'normal-sensitive-side-contact': { ssAchievable: 0.673583984375, estimate: 0.369103277025589, fixableDelta: -0.304480707349411 },
        'far-object-outside-radius': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
      },
      primaryRmse: 0.13236168222083197,
      primaryMae: 0.09593719568223827,
      secondaryRmse: 0.14127251349322636,
      secondaryMae: 0.10735044703703843,
    },
    {
      estimatorId: 'slices-2',
      slices: 2,
      perFixture: {
        'flat-plane-open': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
        'sphere-contact': { ssAchievable: 0.954345703125, estimate: 0.9723832516908115, fixableDelta: 0.018037548565811523 },
        'box-contact': { ssAchievable: 0.81201171875, estimate: 1, fixableDelta: 0.18798828125 },
        'two-wall-corner': { ssAchievable: 0.971923828125, estimate: 0.7565383535309218, fixableDelta: -0.2153854745940782 },
        'broad-wall-contact': { ssAchievable: 0.6767578125, estimate: 0.7326577406118737, fixableDelta: 0.05589992811187372 },
        'thin-gap-separated-slabs': { ssAchievable: 0.815673828125, estimate: 0.8040400240118072, fixableDelta: -0.011633804113192814 },
        'grazing-surface-wall': { ssAchievable: 0.600341796875, estimate: 0.47015078161598467, fixableDelta: -0.13019101525901533 },
        'normal-sensitive-side-contact': { ssAchievable: 0.673583984375, estimate: 0.2790105249832602, fixableDelta: -0.3945734593917398 },
        'far-object-outside-radius': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
      },
      primaryRmse: 0.16262034379083234,
      primaryMae: 0.09979050458645415,
      secondaryRmse: 0.16929721149613525,
      secondaryMae: 0.11263439014285684,
    },
    {
      estimatorId: 'slices-4',
      slices: 4,
      perFixture: {
        'flat-plane-open': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
        'sphere-contact': { ssAchievable: 0.954345703125, estimate: 0.8663288703059369, fixableDelta: -0.08801683281906314 },
        'box-contact': { ssAchievable: 0.81201171875, estimate: 0.8663288703059369, fixableDelta: 0.05431715155593686 },
        'two-wall-corner': { ssAchievable: 0.971923828125, estimate: 0.7689532586876615, fixableDelta: -0.2029705694373385 },
        'broad-wall-contact': { ssAchievable: 0.6767578125, estimate: 0.797491110649706, fixableDelta: 0.12073329814970601 },
        'thin-gap-separated-slabs': { ssAchievable: 0.815673828125, estimate: 0.8844766293438308, fixableDelta: 0.06880280121883076 },
        'grazing-surface-wall': { ssAchievable: 0.600341796875, estimate: 0.4587736292005986, fixableDelta: -0.1415681676744014 },
        'normal-sensitive-side-contact': { ssAchievable: 0.673583984375, estimate: 0.36939703443927424, fixableDelta: -0.30418694993572576 },
        'far-object-outside-radius': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
      },
      primaryRmse: 0.13350042938142578,
      primaryMae: 0.097203150169208,
      secondaryRmse: 0.14289699834259714,
      secondaryMae: 0.10895508564344472,
    },
    {
      estimatorId: 'slices-8',
      slices: 8,
      perFixture: {
        'flat-plane-open': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
        'sphere-contact': { ssAchievable: 0.954345703125, estimate: 0.8685407324580956, fixableDelta: -0.0858049706669044 },
        'box-contact': { ssAchievable: 0.81201171875, estimate: 0.8754027498248838, fixableDelta: 0.06339103107488375 },
        'two-wall-corner': { ssAchievable: 0.971923828125, estimate: 0.7864966413497343, fixableDelta: -0.1854271867752657 },
        'broad-wall-contact': { ssAchievable: 0.6767578125, estimate: 0.7986886622009661, fixableDelta: 0.12193084970096613 },
        'thin-gap-separated-slabs': { ssAchievable: 0.815673828125, estimate: 0.9096517403782126, fixableDelta: 0.09397791225321261 },
        'grazing-surface-wall': { ssAchievable: 0.600341796875, estimate: 0.4633969361643496, fixableDelta: -0.13694486071065037 },
        'normal-sensitive-side-contact': { ssAchievable: 0.673583984375, estimate: 0.3627839057899832, fixableDelta: -0.3108000785850168 },
        'far-object-outside-radius': { ssAchievable: 1, estimate: 1, fixableDelta: 0 },
      },
      primaryRmse: 0.13712698477855725,
      primaryMae: 0.10160621287395426,
      secondaryRmse: 0.14329988804797467,
      secondaryMae: 0.11091965441854441,
    },
  ],
  faithfulnessDelta: 0.03908606118505538,
  primaryAggregate: {
    'R0-angle': { rmse: 0.0944143681963704, mae: 0.06631289525577844, fixtureCount: 8 },
    'R0-cosine': { rmse: 0.13350042938142578, mae: 0.097203150169208, fixtureCount: 8 },
    'R1-cosine-128': { rmse: 0.1328227817132545, mae: 0.0963237718302587, fixtureCount: 8 },
    'R2-dense-sweep': { rmse: 0.13236168222083197, mae: 0.09593719568223827, fixtureCount: 8 },
    'slices-2': { rmse: 0.16262034379083234, mae: 0.09979050458645415, fixtureCount: 8 },
    'slices-4': { rmse: 0.13350042938142578, mae: 0.097203150169208, fixtureCount: 8 },
    'slices-8': { rmse: 0.13712698477855725, mae: 0.10160621287395426, fixtureCount: 8 },
  },
  secondaryAggregate: {
    'R0-angle': { rmse: 0.11884399259884294, mae: 0.08519206908424759, fixtureCount: 9 },
    'R0-cosine': { rmse: 0.14289699834259714, mae: 0.10895508564344472, fixtureCount: 9 },
    'R1-cosine-128': { rmse: 0.1422785306868365, mae: 0.10813408752940702, fixtureCount: 9 },
    'R2-dense-sweep': { rmse: 0.14127251349322636, mae: 0.10735044703703843, fixtureCount: 9 },
    'slices-2': { rmse: 0.16929721149613525, mae: 0.11263439014285684, fixtureCount: 9 },
    'slices-4': { rmse: 0.14289699834259714, mae: 0.10895508564344472, fixtureCount: 9 },
    'slices-8': { rmse: 0.14329988804797467, mae: 0.11091965441854441, fixtureCount: 9 },
  },
  secondaryAnnotation:
    'two-wall-corner excluded from primary aggregate: its fixable delta reflects irreducible SS > GT camera geometry, not addressable quantization error',
  decisionRuleThreshold: 0.02,
  verdict: 'not-bottleneck',
}

// NOTE: The baseline is initially a skeleton — the deep-equal lock test below
// is written to be RED first, then GREEN after we capture the real output
// and replace BASELINE_REPORT above with the actual values.
// This follows the TDD 9.1/9.2 task sequence.
//
// After running createRepresentationStudyReport() and observing actual output,
// BASELINE_REPORT is replaced with the real snapshot. The test then turns GREEN.

describe('deep-equal baseline lock', () => {
  it('report matches locked baseline (regression lock)', () => {
    const actual = createRepresentationStudyReport()
    // This test will be RED until BASELINE_REPORT is replaced with captured values.
    // Run: pnpm vitest run --reporter=verbose to see actual output for capture.
    expect(actual).toEqual(BASELINE_REPORT)
  })
})
