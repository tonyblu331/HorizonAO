import { describe, expect, it } from 'vitest'

import {
  createVbaoGroundTruthDeltaReport,
  evaluateVbaoRepresentationEstimate,
  formatVbaoGroundTruthDeltaReportMarkdown,
} from '../vbaoGroundTruthDelta'
import { RAYCAST_AO_FIXTURES } from '../aoRaycastReference'

describe('VBAO vs ground-truth representation delta', () => {
  it('is deterministic and well-formed across all fixtures', () => {
    const a = createVbaoGroundTruthDeltaReport({ generatedAt: 'fixed' })
    const b = createVbaoGroundTruthDeltaReport({ generatedAt: 'fixed' })

    expect(a).toEqual(b) // deterministic — safe as a committed regression anchor
    expect(a.verdict).toBe('baseline-captured')
    expect(a.rows).toHaveLength(RAYCAST_AO_FIXTURES.length)

    for (const row of a.rows) {
      expect(Number.isFinite(row.truthAccessibility)).toBe(true)
      expect(Number.isFinite(row.vbaoAccessibility)).toBe(true)
      expect(row.truthAccessibility).toBeGreaterThanOrEqual(0)
      expect(row.truthAccessibility).toBeLessThanOrEqual(1)
      expect(row.vbaoAccessibility).toBeGreaterThanOrEqual(0)
      expect(row.vbaoAccessibility).toBeLessThanOrEqual(1)
    }

    expect(Number.isFinite(a.rmse)).toBe(true)
    expect(Number.isFinite(a.mae)).toBe(true)
    expect(a.maxAbsDelta).toBeLessThan(0.5) // sanity: representation must track truth, not diverge wildly
  })

  it('matches truth for unoccluded fixtures (open plane, out-of-radius blocker)', () => {
    const report = createVbaoGroundTruthDeltaReport({ generatedAt: 'fixed' })
    const byId = new Map(report.rows.map((row) => [row.fixtureId, row]))

    const open = byId.get('flat-plane-open')
    expect(open?.truthAccessibility).toBeCloseTo(1, 5)
    expect(open?.vbaoAccessibility).toBeCloseTo(1, 5)
    expect(open?.absDelta).toBeCloseTo(0, 5)

    const farObject = byId.get('far-object-outside-radius')
    expect(farObject?.truthAccessibility).toBeCloseTo(1, 4)
    expect(farObject?.vbaoAccessibility).toBeCloseTo(1, 4)
  })

  it('reports lower accessibility for occluded contact than for the open plane', () => {
    const report = createVbaoGroundTruthDeltaReport({ generatedAt: 'fixed' })
    const byId = new Map(report.rows.map((row) => [row.fixtureId, row.truthAccessibility]))

    const open = byId.get('flat-plane-open') ?? 1
    for (const id of ['sphere-contact', 'box-contact', 'two-wall-corner', 'broad-wall-contact']) {
      expect(byId.get(id) ?? 1).toBeLessThan(open)
    }
  })

  it('estimate is view-independent and stable for a single fixture', () => {
    const fixture = RAYCAST_AO_FIXTURES.find((f) => f.id === 'two-wall-corner')!
    const first = evaluateVbaoRepresentationEstimate(fixture, 4)
    const second = evaluateVbaoRepresentationEstimate(fixture, 4)
    expect(first).toBe(second)
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(1)
  })

  it('renders a markdown report', () => {
    const md = formatVbaoGroundTruthDeltaReportMarkdown(
      createVbaoGroundTruthDeltaReport({ generatedAt: 'fixed' }),
    )
    expect(md).toContain('# VBAO vs Ground-Truth Representation Delta')
    expect(md).toContain('Verdict: baseline-captured')
    expect(md).toContain('| Fixture | Truth | VBAO repr |')
  })
})
