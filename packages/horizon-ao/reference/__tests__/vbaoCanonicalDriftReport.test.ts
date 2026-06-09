import { describe, expect, it } from 'vitest'
import {
  VBAO_CANONICAL_DRIFT_CASES,
  createVbaoCanonicalDriftReport,
  evaluateVbaoCanonicalDriftCase,
  formatVbaoCanonicalDriftReportMarkdown,
} from '../vbaoCanonicalDriftReport'

describe('VBAO canonical drift report', () => {
  it('freezes the canonical/product drift case set', () => {
    expect(VBAO_CANONICAL_DRIFT_CASES.map((testCase) => testCase.id)).toEqual([
      'open',
      'thin-separated',
      'thick-contact',
      'perspective-thickness',
      'grazing-normal',
    ])
  })

  it('keeps the open case aligned', () => {
    const row = evaluateVbaoCanonicalDriftCase(VBAO_CANONICAL_DRIFT_CASES[0]!)

    expect(row.caseId).toBe('open')
    expect(row.canonicalAccessibility).toBe(1)
    expect(row.productAccessibility).toBe(1)
    expect(row.absDiff).toBe(0)
    expect(row.verdict).toBe('pass')
  })

  it('surfaces intentional product drift instead of hiding it inside polish', () => {
    const report = createVbaoCanonicalDriftReport({
      generatedAt: '2026-06-01T00:00:00.000Z',
      thresholds: { warnAbsDiff: 0.01, failAbsDiff: 0.2 },
    })
    const thinSeparated = report.rows.find((row) => row.caseId === 'thin-separated')

    expect(thinSeparated?.absDiff).toBeGreaterThan(0)
    expect(thinSeparated?.verdict).not.toBe('pass')
    expect(report.summary.mae).toBeGreaterThan(0)
    expect(report.summary.worstCaseId).toBeDefined()
  })

  it('includes a non-axis-aligned fixture before slice-reduction changes', () => {
    const row = evaluateVbaoCanonicalDriftCase(
      VBAO_CANONICAL_DRIFT_CASES.find((testCase) => testCase.id === 'grazing-normal')!,
    )

    expect(row.caseId).toBe('grazing-normal')
    expect(row.description).toContain('Non-axis-aligned normal')
    expect(Number.isFinite(row.canonicalAccessibility)).toBe(true)
    expect(Number.isFinite(row.productAccessibility)).toBe(true)
    expect(row.canonicalAccessibility).toBeGreaterThan(0)
    expect(row.productAccessibility).toBeGreaterThan(0)
    expect(row.absDiff).toBe(0)
  })

  it('formats markdown for evidence review', () => {
    const report = createVbaoCanonicalDriftReport({
      generatedAt: '2026-06-01T00:00:00.000Z',
    })
    const markdown = formatVbaoCanonicalDriftReportMarkdown(report)

    expect(markdown).toContain('# VBAO Canonical Drift Report')
    expect(markdown).toContain('| Case | Canonical | Product | Abs diff ↓ | Verdict |')
    expect(markdown).toContain('perspective-thickness')
    expect(markdown).toContain('grazing-normal')
    expect(markdown).toContain('This report measures drift, not visual superiority.')
  })
})
