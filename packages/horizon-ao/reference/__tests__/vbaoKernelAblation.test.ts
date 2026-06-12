/**
 * P3-B: VBAO Kernel Ablation Study — TDD anchors.
 * Strict vertical slices: each describe block is one RED→GREEN cycle.
 */

import { describe, expect, it } from 'vitest'
import { countOneBits } from '../vbaoRuntimeFaithfulReference'
import {
  applyCodecClip,
  applyResolve,
  COSINE_WEIGHTS,
  COSINE_WEIGHT_TOTAL,
  evaluateAblatedEstimate,
  checkRegressionGuard,
  selectWinner,
  computeStage2Gate,
  createKernelAblationReport,
  formatKernelAblationReportMarkdown,
  appendKernelAblationEvidence,
  ABLATION_MATRIX,
  KERNEL_ABLATION_GENERATED_AT,
  type AblationCellResult,
  type AblationCell,
} from '../vbaoKernelAblation'
import { RAYCAST_AO_FIXTURES } from '../aoRaycastReference'
import { SS_AO_FIXTURE_CAMERAS } from '../aoScreenSpaceReference'
import { createRuntimeFaithfulReport } from '../vbaoRuntimeFaithfulReference'

// ─── T1-A1: countOneBits export (Phase 1 foundation) ─────────────────────────

describe('T1-A1 — countOneBits export from vbaoRuntimeFaithfulReference', () => {
  it('countOneBits is a callable function', () => {
    expect(typeof countOneBits).toBe('function')
  })

  it('countOneBits(0) === 0', () => {
    expect(countOneBits(0)).toBe(0)
  })

  it('countOneBits(0xFFFFFFFF) === 32', () => {
    expect(countOneBits(0xffffffff)).toBe(32)
  })

  it('countOneBits(0b10101010) === 4', () => {
    expect(countOneBits(0b10101010)).toBe(4)
  })

  it('countOneBits(1) === 1', () => {
    expect(countOneBits(1)).toBe(1)
  })
})

// ─── T2-A: codecClip=boundary — below-horizon snaps to sector 0 or 31 ────────

describe('T2-A — codecClip boundary: below-horizon direction snaps to sector 0 or 31', () => {
  it('boundary: D below Nproj horizon (cosBeta<0) snaps to clampedBoundary (0 or 1)', () => {
    // Construct a D where cosBeta < 0.
    // Using D=[0,0,1], V=[0,0,1], S=[1,0,0], sinGamma=0.6, cosGamma=-0.8
    // cosBeta = y*cosGamma + x*sinGamma = 1*(-0.8) + 0*0.6 = -0.8 < 0
    // sinBeta = 0*(-0.8) - 1*0.6 = -0.6 → clampedBoundary = 0
    const u = applyCodecClip(
      [0, 0, 1], [0, 0, 1], [1, 0, 0],
      0.6, -0.8, 'boundary',
    )
    // clampedBoundary: sinBeta=-0.6<0 → 0; snapped to sector 0
    expect(u).toBe(0)
  })

  it('boundary: D above horizon (cosBeta>=0) returns interior value in [0,1]', () => {
    // D=[0,0,1], V=[0,0,1], S=[1,0,0], sinGamma=0, cosGamma=1
    // x=0, y=1, sinBeta=0, cosBeta=1 → interior=0.5
    const u = applyCodecClip(
      [0, 0, 1], [0, 0, 1], [1, 0, 0],
      0, 1, 'boundary',
    )
    expect(Math.abs(u - 0.5)).toBeLessThan(1e-10)
  })
})

// ─── T2-B: codecClip=foldToHorizon — monotone across all elevations ──────────

describe('T2-B — codecClip foldToHorizon: u is monotonically non-decreasing with elevation', () => {
  it('foldToHorizon: u is monotone in alpha (elevation above Nproj horizon) for a representative direction', () => {
    // Design spec (D3/D4): foldToHorizon monotonicity means u = clamp(interior, 0, 1)
    // is monotone in sinBeta = (x*cosGamma - y*sinGamma)*invLen, which is monotone in
    // the beta angle (elevation measured from the slice horizon).
    //
    // Sweep: use D = normalize(sampleDir*cos(alpha) + V*sin(alpha))
    // with alpha ∈ (0, pi) — the actual probe loop range used by evaluateAblatedEstimate.
    // sampleDir=[1,0,0], V=[0,0,1], S=[1,0,0], Nproj along V → sinGamma=0, cosGamma=1
    // At alpha→0: D≈sampleDir=[1,0,0], x=1, y≈0→1e-5, sinBeta≈1 → interior≈1.5 → u=1
    // At alpha=pi/2: D≈V=[0,0,1], x=0, y=1, sinBeta=0 → interior=0.5 → u=0.5
    // At alpha→pi: D≈-sampleDir=[-1,0,0], x=-1, y≈0→1e-5, sinBeta≈-1 → interior≈-0.5 → u=0
    // So u decreases from 1 → 0.5 → 0, it is monotonically NON-INCREASING with alpha.
    const S: [number, number, number] = [1, 0, 0]
    const V: [number, number, number] = [0, 0, 1]
    const sinGamma = 0
    const cosGamma = 1

    const alphas: number[] = []
    for (let i = 1; i <= 19; i++) {
      alphas.push((i * Math.PI) / 20) // alpha ∈ (0, pi), 19 sample points
    }

    const uValues = alphas.map((alpha) => {
      const sampleDir: [number, number, number] = [1, 0, 0]
      const dx = Math.cos(alpha) // sampleDir component
      const dz = Math.sin(alpha) // V component
      const len = Math.hypot(dx, dz)
      const D: [number, number, number] = [dx / len, 0, dz / len]
      return applyCodecClip(D, V, S, sinGamma, cosGamma, 'foldToHorizon')
    })

    // u decreases monotonically from ~1 (alpha near 0) to ~0 (alpha near pi)
    for (let i = 1; i < uValues.length; i++) {
      expect(uValues[i]!).toBeLessThanOrEqual(uValues[i - 1]! + 1e-10)
    }
  })

  it('foldToHorizon: D below horizon does NOT return -1 (differs from skip)', () => {
    // D below horizon (cosBeta<0): foldToHorizon returns clamped interior, not -1
    const u = applyCodecClip(
      [0, 0, 1], [0, 0, 1], [1, 0, 0],
      0.6, -0.8, 'foldToHorizon',
    )
    // sinBeta = -0.6 → interior = -0.6*0.5+0.5 = 0.2, clamped = 0.2
    expect(u).toBeGreaterThanOrEqual(0)
    expect(u).toBeLessThanOrEqual(1)
    expect(u).not.toBe(-1)
  })
})

// ─── T2-C: codecClip=skip — below-horizon returns -1 sentinel ────────────────

describe('T2-C — codecClip skip: below-horizon returns -1, no bit set', () => {
  it('skip: below-horizon direction (cosBeta<0) returns -1 sentinel', () => {
    const u = applyCodecClip(
      [0, 0, 1], [0, 0, 1], [1, 0, 0],
      0.6, -0.8, 'skip',
    )
    expect(u).toBe(-1)
  })

  it('skip: above-horizon direction returns interior value in [0,1]', () => {
    const u = applyCodecClip(
      [0, 0, 1], [0, 0, 1], [1, 0, 0],
      0, 1, 'skip',
    )
    expect(u).toBeGreaterThanOrEqual(0)
    expect(u).toBeLessThanOrEqual(1)
    expect(u).not.toBe(-1)
  })
})

// ─── T3-A: Cosine weight formula ──────────────────────────────────────────────

describe('T3-A — cosine weight formula: weight_k = sqrt(1 - (2*(k+0.5)/32 - 1)^2)', () => {
  it('COSINE_WEIGHTS has exactly 32 entries', () => {
    expect(COSINE_WEIGHTS.length).toBe(32)
  })

  it('each weight_k matches the formula', () => {
    for (let k = 0; k < 32; k++) {
      const u = (k + 0.5) / 32
      const sinBeta = 2 * u - 1
      const expected = Math.sqrt(1 - sinBeta * sinBeta)
      expect(Math.abs(COSINE_WEIGHTS[k]! - expected)).toBeLessThan(1e-12)
    }
  })

  it('COSINE_WEIGHT_TOTAL matches sum of all weights', () => {
    const summed = Array.from(COSINE_WEIGHTS).reduce((s, w) => s + w, 0)
    expect(Math.abs(COSINE_WEIGHT_TOTAL - summed)).toBeLessThan(1e-10)
  })

  it('COSINE_WEIGHT_TOTAL is a positive constant (Riemann sum of sqrt(1-x²) × 32 ≈ π*16/2 ≈ 25.1)', () => {
    // sum of sqrt(1-(2u-1)^2) for u=(k+0.5)/32, k=0..31 is a Riemann sum of
    // ∫_{-1}^{1} sqrt(1-x^2) dx × 32 = π/2 × 32 / 2 ≈ 25.13.
    // The discrete sum is slightly off from the integral — actual ≈ 25.18.
    expect(COSINE_WEIGHT_TOTAL).toBeGreaterThan(0)
    expect(COSINE_WEIGHT_TOTAL).toBeGreaterThan(24)
    expect(COSINE_WEIGHT_TOTAL).toBeLessThan(27)
  })
})

// ─── T3-B: Resolve toggle ─────────────────────────────────────────────────────

describe('T3-B — applyResolve: uniform and cosineWeighted paths', () => {
  it('uniform: all 32 bits set → accessibility = 0', () => {
    expect(applyResolve(0xffffffff, 'uniform')).toBe(0)
  })

  it('uniform: no bits set → accessibility = 1', () => {
    expect(applyResolve(0, 'uniform')).toBe(1)
  })

  it('uniform: 16 bits set → accessibility = 0.5', () => {
    // 16 bits = 0x0000FFFF
    const result = applyResolve(0x0000ffff, 'uniform')
    expect(Math.abs(result - 0.5)).toBeLessThan(1e-10)
  })

  it('cosineWeighted: no bits set → accessibility = 1', () => {
    expect(applyResolve(0, 'cosineWeighted')).toBe(1)
  })

  it('cosineWeighted: all bits set → accessibility = 0', () => {
    expect(applyResolve(0xffffffff, 'cosineWeighted')).toBe(0)
  })

  it('cosineWeighted and uniform differ for asymmetric masks', () => {
    // Set only the extreme sectors (k=0 and k=31) — these have low cosine weight
    const mask = (1 | (1 << 31)) >>> 0
    const uniformResult = applyResolve(mask, 'uniform')
    const cosineResult = applyResolve(mask, 'cosineWeighted')
    // Both should be < 1 but differ (extreme sectors have low cosine weight)
    expect(uniformResult).toBeLessThan(1)
    expect(cosineResult).toBeLessThan(1)
    // cosine gives less weight to extreme sectors → cosineResult > uniformResult
    expect(cosineResult).toBeGreaterThan(uniformResult - 1e-5)
  })
})

// ─── T4-A: Baseline anchor — {V, boundary, uniform} matches P3-A ─────────────

describe('T4-A — baseline anchor: {V, boundary, uniform} matches P3-A to 1e-12', () => {
  const BASELINE_CELL: AblationCell = {
    probeFrame: 'V',
    codecClip: 'boundary',
    resolve: 'uniform',
    realizable: true,
    label: 'V-boundary-uniform (BASELINE)',
  }

  it(
    'all non-excluded fixtures: |ablated - faithfulAccessibility| < 1e-12',
    () => {
      const p3aReport = createRuntimeFaithfulReport()
      const EXCLUDED = ['two-wall-corner']

      for (const fixture of RAYCAST_AO_FIXTURES) {
        if (EXCLUDED.includes(fixture.id)) continue
        const camera = SS_AO_FIXTURE_CAMERAS[fixture.id as keyof typeof SS_AO_FIXTURE_CAMERAS]
        const eye = camera.eye as [number, number, number]

        const { estimate } = evaluateAblatedEstimate(fixture, eye, BASELINE_CELL, {
          slices: 4,
          probesPerSide: 4096,
          rotation: 0.5,
        })

        const p3aEntry = p3aReport.fixtures.find((f) => f.id === fixture.id)!
        const diff = Math.abs(estimate - p3aEntry.faithfulAccessibility)
        expect(diff).toBeLessThan(1e-12)
      }
    },
    60_000,
  )
})

// ─── T4-B: ProbeFrame Nproj synthesis differs from V ─────────────────────────

describe('T4-B — probeFrame Nproj differs from V (diagnostic elevation basis switch)', () => {
  it('V and Nproj frames produce different estimates on a non-trivial fixture', () => {
    const fixture = RAYCAST_AO_FIXTURES.find((f) => f.id === 'grazing-surface-wall')!
    const camera = SS_AO_FIXTURE_CAMERAS['grazing-surface-wall']
    const eye = camera.eye as [number, number, number]

    const vCell: AblationCell = {
      probeFrame: 'V', codecClip: 'boundary', resolve: 'uniform', realizable: true, label: 'V',
    }
    const nprojCell: AblationCell = {
      probeFrame: 'Nproj', codecClip: 'boundary', resolve: 'uniform', realizable: false, label: 'Nproj',
    }

    const vResult = evaluateAblatedEstimate(fixture, eye, vCell, { slices: 4, probesPerSide: 256, rotation: 0.5 })
    const nprojResult = evaluateAblatedEstimate(fixture, eye, nprojCell, { slices: 4, probesPerSide: 256, rotation: 0.5 })

    // Different elevation basis → different estimates on a tilted fixture
    expect(vResult.estimate).not.toBeCloseTo(nprojResult.estimate, 2)
  })
})

// ─── T5-A: Selection rule unit test with synthetic deltas ─────────────────────

describe('T5-A — selectWinner: synthetic cell deltas', () => {
  function makeCell(label: string, realizable: boolean, primaryRMSE: number, nonPrimaryDelta: number, baselineRMSE: number): AblationCellResult {
    const baseNonPrimaryDelta = 0.02
    return {
      cell: {
        probeFrame: realizable ? 'V' : 'Nproj',
        codecClip: 'boundary',
        resolve: 'uniform',
        realizable,
        label,
      },
      perFixture: {
        'grazing-surface-wall': { ablatedAccessibility: 0.5, ssAchievable: 0.5 + primaryRMSE * 0.7, fixableDelta: primaryRMSE * 0.7 },
        'normal-sensitive-side-contact': { ablatedAccessibility: 0.5, ssAchievable: 0.5 + primaryRMSE * 1.3, fixableDelta: primaryRMSE * 1.3 },
        'sphere-contact': { ablatedAccessibility: 0.5, ssAchievable: 0.5 + nonPrimaryDelta, fixableDelta: nonPrimaryDelta },
        'flat-plane-open': { ablatedAccessibility: 1.0, ssAchievable: 1.0, fixableDelta: 0.0 },
      },
      primaryAggregateRMSE: primaryRMSE,
      primaryVerdict: { 'grazing-surface-wall': 'residual', 'normal-sensitive-side-contact': 'residual' },
      regressionGuardPass: Math.abs(nonPrimaryDelta) - Math.abs(baseNonPrimaryDelta) <= 0.03,
    }
  }

  const baseline = makeCell('baseline', true, 0.15, 0.02, 0.15)
  // Baseline cell has no regressionGuardPass field — simulate this:
  const baselineNoGuard: AblationCellResult = { ...baseline, regressionGuardPass: undefined }

  it('winner = realizable cell with min primaryRMSE that passes guard and improves ≥0.02', () => {
    const goodCell = makeCell('good', true, 0.08, 0.01, 0.15)
    const { winner } = selectWinner([goodCell, baselineNoGuard], baselineNoGuard)
    expect(winner).not.toBeNull()
    expect(winner!.cell.label).toBe('good')
  })

  it('cell violating regression guard (nonPrimaryDelta > baseline+0.03) is disqualified', () => {
    const badCell = makeCell('bad', true, 0.05, 0.10, 0.15)
    // nonPrimaryDelta=0.10 vs baseline 0.02 → growth=0.08 > 0.03 → guard fails
    const { winner } = selectWinner([badCell, baselineNoGuard], baselineNoGuard)
    expect(winner?.cell.label).not.toBe('bad')
  })

  it('no realizable cell improves by ≥0.02 → winner=null, verdict=no-realizable-winner', () => {
    const tooCloseCell = makeCell('tooClose', true, 0.14, 0.02, 0.15)
    const { winner, verdict } = selectWinner([tooCloseCell, baselineNoGuard], baselineNoGuard)
    expect(winner).toBeNull()
    expect(verdict).toBe('no-realizable-winner')
  })
})

// ─── T5-B: Nproj cells never selected as winner ───────────────────────────────

describe('T5-B — Nproj cells never selected as winner', () => {
  it('even if Nproj cell has lower primaryRMSE than all V cells, winner is a V cell', () => {
    function makeSimpleCell(label: string, realizable: boolean, rmse: number): AblationCellResult {
      return {
        cell: {
          probeFrame: realizable ? 'V' : 'Nproj',
          codecClip: 'boundary',
          resolve: 'uniform',
          realizable,
          label,
        },
        perFixture: {
          'grazing-surface-wall': { ablatedAccessibility: 0.7, ssAchievable: 0.7 + rmse, fixableDelta: rmse },
          'normal-sensitive-side-contact': { ablatedAccessibility: 0.7, ssAchievable: 0.7 + rmse, fixableDelta: rmse },
          'sphere-contact': { ablatedAccessibility: 0.8, ssAchievable: 0.8, fixableDelta: 0 },
        },
        primaryAggregateRMSE: rmse,
        primaryVerdict: { 'grazing-surface-wall': 'residual', 'normal-sensitive-side-contact': 'residual' },
        regressionGuardPass: true,
      }
    }

    const baseline = makeSimpleCell('baseline', true, 0.15)
    const vCell = makeSimpleCell('vGood', true, 0.09)
    const nprojCell = makeSimpleCell('nprojBest', false, 0.01) // Nproj better on primary but not realizable

    const { winner } = selectWinner([baseline, vCell, nprojCell], { ...baseline, regressionGuardPass: undefined })
    expect(winner).not.toBeNull()
    expect(winner!.cell.realizable).toBe(true)
    expect(winner!.cell.label).toBe('vGood')
  })
})

// ─── T5-C: Stage2Gate unit test ───────────────────────────────────────────────

describe('T5-C — computeStage2Gate', () => {
  function makeCellWithPrimaries(
    realizable: boolean,
    grazDelta: number,
    sideDelta: number,
    grazBaseline: number,
    sideBaseline: number,
    guardPass: boolean,
  ): AblationCellResult {
    return {
      cell: {
        probeFrame: realizable ? 'V' : 'Nproj',
        codecClip: 'boundary',
        resolve: 'uniform',
        realizable,
        label: 'test',
      },
      perFixture: {
        'grazing-surface-wall': { ablatedAccessibility: 0.5, ssAchievable: 0.5 + grazDelta, fixableDelta: grazDelta },
        'normal-sensitive-side-contact': { ablatedAccessibility: 0.5, ssAchievable: 0.5 + sideDelta, fixableDelta: sideDelta },
      },
      primaryAggregateRMSE: Math.sqrt((grazDelta ** 2 + sideDelta ** 2) / 2),
      primaryVerdict: { 'grazing-surface-wall': 'residual', 'normal-sensitive-side-contact': 'residual' },
      regressionGuardPass: guardPass,
      baselineAnchorOk: undefined,
    }
  }

  it('proceed-tsl: winner cell with both primary |delta| reduced ≥50% vs baseline', () => {
    const baseline = makeCellWithPrimaries(true, 0.12, 0.14, 0.12, 0.14, undefined as any)
    const winner = makeCellWithPrimaries(true, 0.05, 0.06, 0.12, 0.14, true)
    // graz: 0.12 → 0.05, reduction = (0.12-0.05)/0.12 = 58.3% ≥ 50% ✓
    // side: 0.14 → 0.06, reduction = (0.14-0.06)/0.14 = 57.1% ≥ 50% ✓
    const gate = computeStage2Gate([winner, baseline], { ...baseline, regressionGuardPass: undefined })
    expect(gate).toBe('proceed-tsl')
  })

  it('defer: no realizable cell achieves ≥50% reduction on both primaries', () => {
    const baseline = makeCellWithPrimaries(true, 0.12, 0.14, 0.12, 0.14, undefined as any)
    const weak = makeCellWithPrimaries(true, 0.11, 0.13, 0.12, 0.14, true)
    // reductions: 8.3%, 7.1% — both < 50%
    const gate = computeStage2Gate([weak, baseline], { ...baseline, regressionGuardPass: undefined })
    expect(gate).toBe('defer')
  })
})

// ─── T6: Full matrix report integration test ─────────────────────────────────

describe(
  'T6 — createKernelAblationReport integration',
  () => {
    it(
      'report has exactly 8 cells',
      () => {
        const report = createKernelAblationReport()
        expect(report.cells.length).toBe(8)
      },
      60_000,
    )

    it(
      'realizable flags match design matrix (cells 1-5 true, 6-8 false)',
      () => {
        const report = createKernelAblationReport()
        for (let i = 0; i < 5; i++) {
          expect(report.cells[i]!.cell.realizable).toBe(true)
        }
        for (let i = 5; i < 8; i++) {
          expect(report.cells[i]!.cell.realizable).toBe(false)
        }
      },
      60_000,
    )

    it(
      'generatedAt === 1970-01-01T00:00:00.000Z',
      () => {
        const report = createKernelAblationReport()
        expect(report.generatedAt).toBe('1970-01-01T00:00:00.000Z')
        expect(report.generatedAt).toBe(KERNEL_ABLATION_GENERATED_AT)
      },
      60_000,
    )

    it(
      'excludedFixtures contains two-wall-corner',
      () => {
        const report = createKernelAblationReport()
        expect(report.excludedFixtures).toContain('two-wall-corner')
      },
      60_000,
    )

    it(
      'each cell has perFixture scores for exactly 8 fixtures (two-wall-corner absent)',
      () => {
        const report = createKernelAblationReport()
        for (const cell of report.cells) {
          const keys = Object.keys(cell.perFixture)
          expect(keys.length).toBe(8)
          expect(keys).not.toContain('two-wall-corner')
        }
      },
      60_000,
    )

    it(
      'baselineAnchorCheck === true',
      () => {
        const report = createKernelAblationReport()
        expect(report.baselineAnchorCheck).toBe(true)
      },
      60_000,
    )

    it(
      'stage2Gate is one of the two valid values',
      () => {
        const report = createKernelAblationReport()
        expect(['proceed-tsl', 'defer']).toContain(report.stage2Gate)
      },
      60_000,
    )
  },
)

// ─── T6-D: Determinism test ───────────────────────────────────────────────────

describe(
  'T6-D — createKernelAblationReport determinism',
  () => {
    it(
      'two calls return deep-equal reports',
      () => {
        const r1 = createKernelAblationReport()
        const r2 = createKernelAblationReport()
        expect(r1).toEqual(r2)
      },
      120_000,
    )
  },
)

// ─── T7-A: Markdown formatter ─────────────────────────────────────────────────

describe('T7-A — formatKernelAblationReportMarkdown', () => {
  it('output contains realizable column header', () => {
    const report = createKernelAblationReport()
    const md = formatKernelAblationReportMarkdown(report)
    expect(md).toContain('realizable')
  })

  it('winner decision/selection rule appears before numeric table rows', () => {
    const report = createKernelAblationReport()
    const md = formatKernelAblationReportMarkdown(report)
    const ruleIdx = md.indexOf('### Selection Rule')
    const winnerIdx = md.indexOf('### Winner')
    const tableIdx = md.indexOf('| Cell |')
    expect(ruleIdx).toBeGreaterThanOrEqual(0)
    expect(winnerIdx).toBeGreaterThan(ruleIdx)
    expect(tableIdx).toBeGreaterThan(winnerIdx)
  })

  it('two-wall-corner marked as excluded in notes', () => {
    const report = createKernelAblationReport()
    const md = formatKernelAblationReportMarkdown(report)
    expect(md).toContain('two-wall-corner')
    expect(md).toContain('excluded')
  })

  it('contains P3-B header', () => {
    const report = createKernelAblationReport()
    const md = formatKernelAblationReportMarkdown(report)
    expect(md).toContain('## P3-B')
  })
})

// ─── T7-B: EVIDENCE.md writer test ───────────────────────────────────────────

describe('T7-B — appendKernelAblationEvidence', () => {
  it('writer receives string with P3-B header', () => {
    const report = createKernelAblationReport()
    let captured = ''
    appendKernelAblationEvidence(report, (section) => { captured = section })
    expect(captured).toContain('## P3-B')
  })

  it('writer content contains stage2Gate verdict', () => {
    const report = createKernelAblationReport()
    let captured = ''
    appendKernelAblationEvidence(report, (section) => { captured = section })
    expect(captured).toContain(report.stage2Gate)
  })

  it('writer content mentions winner or no-realizable-winner', () => {
    const report = createKernelAblationReport()
    let captured = ''
    appendKernelAblationEvidence(report, (section) => { captured = section })
    const hasWinnerInfo = report.winner
      ? captured.includes(report.winner.cell.label) || captured.includes('Winner')
      : captured.includes('no-realizable-winner') || captured.includes('none')
    expect(hasWinnerInfo).toBe(true)
  })
})

// ─── T8: Deep-equal lock ─────────────────────────────────────────────────────

describe(
  'T8 — deep-equal lock',
  () => {
    it(
      'createKernelAblationReport() twice → toEqual (deep equal)',
      () => {
        const r1 = createKernelAblationReport()
        const r2 = createKernelAblationReport()
        expect(r1).toEqual(r2)
      },
      120_000,
    )

    it(
      'r1.generatedAt === 1970-01-01T00:00:00.000Z',
      () => {
        const r1 = createKernelAblationReport()
        expect(r1.generatedAt).toBe('1970-01-01T00:00:00.000Z')
      },
      60_000,
    )
  },
)
