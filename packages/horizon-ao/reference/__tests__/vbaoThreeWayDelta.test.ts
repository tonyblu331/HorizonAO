import { describe, expect, it } from 'vitest'

import {
  createThreeWayDeltaReport,
  formatThreeWayDeltaReportMarkdown,
  SS_AO_CAMERA_SET_ID,
  type ThreeWayDeltaReport,
} from '../vbaoThreeWayDelta'
import { createVbaoGroundTruthDeltaReport } from '../vbaoGroundTruthDelta'
import { RAYCAST_AO_FIXTURES } from '../aoRaycastReference'

// ─── Deep-equal baseline lock ─────────────────────────────────────────────────
// Captured by running createThreeWayDeltaReport({ generatedAt: 'fixed' }) with all
// tests green. Any change to fixture geometry, camera positions, sample count, or
// SS/GT/VBAO evaluation logic will cause this to fail loudly.
// DO NOT edit this constant without recapturing and documenting the change.
const BASELINE: ThreeWayDeltaReport = Object.freeze({
  generatedAt: '1970-01-01T00:00:00.000Z',
  slices: 4,
  truthSamples: 4096,
  cameraSetId: 'ssao-cam-v1',
  rows: [
    {
      fixtureId: 'flat-plane-open',
      gtAccessibility: 1,
      ssAchievableAccessibility: 1,
      vbaoAccessibility: 1,
      irreducibleDelta: 0,
      fixableDelta: 0,
      totalSignedDelta: 0,
    },
    {
      fixtureId: 'sphere-contact',
      gtAccessibility: 0.806640625,
      ssAchievableAccessibility: 0.954345703125,
      vbaoAccessibility: 0.8468746764232233,
      irreducibleDelta: -0.147705078125,
      fixableDelta: 0.10747102670177666,
      totalSignedDelta: -0.04023405142322334,
    },
    {
      fixtureId: 'box-contact',
      gtAccessibility: 0.81201171875,
      ssAchievableAccessibility: 0.81201171875,
      vbaoAccessibility: 0.8456708580912726,
      irreducibleDelta: 0,
      fixableDelta: -0.033659139341272626,
      totalSignedDelta: -0.033659139341272626,
    },
    {
      fixtureId: 'two-wall-corner',
      gtAccessibility: 0.571044921875,
      ssAchievableAccessibility: 0.971923828125,
      vbaoAccessibility: 0.7356983684129992,
      irreducibleDelta: -0.40087890625,
      fixableDelta: 0.23622545971200082,
      totalSignedDelta: -0.16465344653799918,
    },
    {
      fixtureId: 'broad-wall-contact',
      gtAccessibility: 0.6767578125,
      ssAchievableAccessibility: 0.6767578125,
      vbaoAccessibility: 0.7311694903545272,
      irreducibleDelta: 0,
      fixableDelta: -0.05441167785452716,
      totalSignedDelta: -0.05441167785452716,
    },
    {
      fixtureId: 'thin-gap-separated-slabs',
      gtAccessibility: 0.8095703125,
      ssAchievableAccessibility: 0.815673828125,
      vbaoAccessibility: 0.8456708580912726,
      irreducibleDelta: -0.006103515625,
      fixableDelta: -0.029997029966272626,
      totalSignedDelta: -0.036100545591272626,
    },
    {
      fixtureId: 'grazing-surface-wall',
      gtAccessibility: 0.600341796875,
      ssAchievableAccessibility: 0.600341796875,
      vbaoAccessibility: 0.5121541436317619,
      irreducibleDelta: 0,
      fixableDelta: 0.08818765324323807,
      totalSignedDelta: 0.08818765324323807,
    },
    {
      fixtureId: 'normal-sensitive-side-contact',
      gtAccessibility: 0.673583984375,
      ssAchievableAccessibility: 0.673583984375,
      vbaoAccessibility: 0.4568073494358597,
      irreducibleDelta: 0,
      fixableDelta: 0.2167766349391403,
      totalSignedDelta: 0.2167766349391403,
    },
    {
      fixtureId: 'far-object-outside-radius',
      gtAccessibility: 1,
      ssAchievableAccessibility: 1,
      vbaoAccessibility: 1,
      irreducibleDelta: 0,
      fixableDelta: 0,
      totalSignedDelta: 0,
    },
  ],
  irreducibleRmse: 0.14242266536346168,
  irreducibleMae: 0.06163194444444445,
  fixableRmse: 0.11884399259884294,
  fixableMae: 0.08519206908424759,
  totalRmse: 0.09938450903825943,
  maxFixableAbsDelta: 0.23622545971200082,
  irreducibleFraction: 2.053623497717459,
  verdict: 'baseline-captured',
})

// VIS_EPSILON: kept in sync with aoScreenSpaceReference.ts VIS_EPSILON for assertions
const VIS_EPSILON = 1e-3

describe('vbaoThreeWayDelta — row decomposition', () => {
  it('irreducibleDelta + fixableDelta == totalSignedDelta within float tolerance', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    for (const row of report.rows) {
      expect(
        row.irreducibleDelta + row.fixableDelta,
        `decomposition identity: ${row.fixtureId}`,
      ).toBeCloseTo(row.totalSignedDelta, 9)
    }
  })

  it('irreducibleDelta is finite and in [-1, VIS_EPSILON] for all fixtures', () => {
    // irreducibleDelta = gtAccessibility - ssAchievableAccessibility.
    // Because SS can only lose occlusion vs GT (ss >= gt), this is always <= 0.
    // The absolute value measures the irreducible gap; must be finite and in valid range.
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    for (const row of report.rows) {
      expect(Number.isFinite(row.irreducibleDelta), `irreducibleDelta finite: ${row.fixtureId}`).toBe(true)
      // irreducibleDelta <= VIS_EPSILON (SS is always at least as bright as GT within tolerance)
      expect(row.irreducibleDelta, `irreducibleDelta upper bound: ${row.fixtureId}`).toBeLessThanOrEqual(VIS_EPSILON)
      // Must be >= -1 (accessibility is in [0,1] so delta is in [-1, 1])
      expect(row.irreducibleDelta, `irreducibleDelta lower bound: ${row.fixtureId}`).toBeGreaterThanOrEqual(-1)
    }
  })

  it('fixableDelta is finite for all fixtures', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    for (const row of report.rows) {
      expect(Number.isFinite(row.fixableDelta), `fixableDelta finite: ${row.fixtureId}`).toBe(true)
    }
  })

  it('report has one row per fixture (9 total)', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    expect(report.rows).toHaveLength(RAYCAST_AO_FIXTURES.length)
  })
})

describe('vbaoThreeWayDelta — P1 reconciliation', () => {
  it('totalRmse matches createVbaoGroundTruthDeltaReport().rmse within 1e-6', () => {
    const threeWay = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    const p1 = createVbaoGroundTruthDeltaReport({ generatedAt: 'fixed' })
    expect(Math.abs(threeWay.totalRmse - p1.rmse)).toBeLessThan(1e-6)
  })

  it('per-fixture totalSignedDelta matches P1 signedDelta within 1e-9', () => {
    const threeWay = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    const p1 = createVbaoGroundTruthDeltaReport({ generatedAt: 'fixed' })
    const p1ById = new Map(p1.rows.map((r) => [r.fixtureId, r]))

    for (const row of threeWay.rows) {
      const p1Row = p1ById.get(row.fixtureId)
      expect(p1Row, `p1 row exists: ${row.fixtureId}`).toBeDefined()
      expect(row.totalSignedDelta, `totalSignedDelta reconciliation: ${row.fixtureId}`).toBeCloseTo(
        p1Row!.signedDelta,
        9,
      )
    }
  })
})

describe('vbaoThreeWayDelta — provenance fields', () => {
  it('cameraSetId matches SS_AO_CAMERA_SET_ID', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    expect(report.cameraSetId).toBe(SS_AO_CAMERA_SET_ID)
  })

  it('verdict is baseline-captured', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    expect(report.verdict).toBe('baseline-captured')
  })

  it('slices defaults to 4', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    expect(report.slices).toBe(4)
  })

  it('truthSamples defaults to 4096', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    expect(report.truthSamples).toBe(4096)
  })
})

describe('vbaoThreeWayDelta — irreducibleFraction', () => {
  it('irreducibleFraction == irreducibleRmse^2 / totalRmse^2 within 1e-9', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    const expected = (report.irreducibleRmse * report.irreducibleRmse) / (report.totalRmse * report.totalRmse)
    expect(Math.abs(report.irreducibleFraction - expected)).toBeLessThan(1e-9)
  })
})

describe('vbaoThreeWayDelta — deep-equal baseline lock (Phase 5)', () => {
  it('createThreeWayDeltaReport({ generatedAt: "fixed" }) deep-equals committed baseline', () => {
    const result = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    expect(result).toEqual(BASELINE)
  })
})

describe('vbaoThreeWayDelta — markdown formatter', () => {
  it('output contains verdict string', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    const md = formatThreeWayDeltaReportMarkdown(report)
    expect(md).toContain('baseline-captured')
  })

  it('output contains a fixture ID', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    const md = formatThreeWayDeltaReportMarkdown(report)
    expect(md).toContain('sphere-contact')
  })

  it('output contains a numeric RMSE value', () => {
    const report = createThreeWayDeltaReport({ generatedAt: 'fixed' })
    const md = formatThreeWayDeltaReportMarkdown(report)
    // totalRmse is ~0.099, expect something that looks like 0.0XXXXX
    expect(md).toMatch(/\d+\.\d{4,}/)
  })
})
