import {
  evaluateCanonicalVbaoReference,
  type CanonicalVbaoSample,
} from './canonicalVbaoReference'
import {
  evaluateScalarVbaoReference,
  type ScalarVbaoSample,
} from '../vbaoReference'
import type { Vec3 } from '../vbaoGtVbaoMath'

export type VbaoCanonicalDriftCaseId =
  | 'open'
  | 'thin-separated'
  | 'thick-contact'
  | 'perspective-thickness'

export type VbaoCanonicalDriftVerdict = 'pass' | 'warn' | 'fail'

export interface VbaoCanonicalDriftThresholds {
  readonly warnAbsDiff: number
  readonly failAbsDiff: number
}

export interface VbaoCanonicalDriftSample {
  readonly sideSign: 1 | -1
  readonly position: Vec3
}

export interface VbaoCanonicalDriftCase {
  readonly id: VbaoCanonicalDriftCaseId
  readonly description: string
  readonly pixelPosition: Vec3
  readonly viewDir: Vec3
  readonly normal: Vec3
  readonly normalAngle: number
  readonly radius: number
  readonly thickness: number
  readonly samples: readonly VbaoCanonicalDriftSample[]
}

export interface VbaoCanonicalDriftRow {
  readonly caseId: VbaoCanonicalDriftCaseId
  readonly description: string
  readonly canonicalAccessibility: number
  readonly productAccessibility: number
  readonly absDiff: number
  readonly verdict: VbaoCanonicalDriftVerdict
}

export interface VbaoCanonicalDriftReport {
  readonly generatedAt: string
  readonly basis: string
  readonly thresholds: VbaoCanonicalDriftThresholds
  readonly rows: readonly VbaoCanonicalDriftRow[]
  readonly summary: {
    readonly verdict: VbaoCanonicalDriftVerdict
    readonly mae: number
    readonly worstCaseId: VbaoCanonicalDriftCaseId
    readonly worstAbsDiff: number
  }
}

const PIXEL: Vec3 = [0, 0, -2]
const VIEW: Vec3 = [0, 0, 1]
const NORMAL: Vec3 = [0, 0, 1]
const SLICE_TANGENT: Vec3 = [0, 1, 0]

const DEFAULT_THRESHOLDS: VbaoCanonicalDriftThresholds = {
  warnAbsDiff: 0.03,
  failAbsDiff: 0.08,
}

function add3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function scale3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s]
}

function sampleAt(sideSign: 1 | -1, angleFromView: number, distance: number): VbaoCanonicalDriftSample {
  const direction = add3(
    scale3(VIEW, Math.cos(angleFromView)),
    scale3(SLICE_TANGENT, sideSign * Math.sin(angleFromView)),
  )
  return {
    sideSign,
    position: add3(PIXEL, scale3(direction, distance)),
  }
}

export const VBAO_CANONICAL_DRIFT_CASES = Object.freeze([
  {
    id: 'open',
    description: 'No samples; canonical and product lanes must remain fully open.',
    pixelPosition: PIXEL,
    viewDir: VIEW,
    normal: NORMAL,
    normalAngle: 0,
    radius: 1,
    thickness: 0.1,
    samples: [],
  },
  {
    id: 'thin-separated',
    description: 'Separated thin intervals; product changes must preserve canonical gap behavior.',
    pixelPosition: PIXEL,
    viewDir: VIEW,
    normal: NORMAL,
    normalAngle: 0,
    radius: 1,
    thickness: 0.06,
    samples: [
      sampleAt(1, 0.25, 0.7),
      sampleAt(1, 0.9, 0.7),
      sampleAt(-1, 0.25, 0.7),
      sampleAt(-1, 0.9, 0.7),
    ],
  },
  {
    id: 'thick-contact',
    description: 'Nearby thick blockers; product CDF and sample-local thickness should not wildly exceed canonical occlusion.',
    pixelPosition: PIXEL,
    viewDir: VIEW,
    normal: NORMAL,
    normalAngle: 0,
    radius: 1,
    thickness: 0.25,
    samples: [
      sampleAt(1, 0.35, 0.8),
      sampleAt(-1, 0.35, 0.8),
    ],
  },
  {
    id: 'perspective-thickness',
    description: 'Off-axis/nearer sample where product sample-local thickness intentionally diverges from canonical pixel-view thickness.',
    pixelPosition: PIXEL,
    viewDir: VIEW,
    normal: NORMAL,
    normalAngle: 0,
    radius: 1.2,
    thickness: 0.25,
    samples: [
      { sideSign: 1, position: [0, 0.7, -1.2] },
      { sideSign: -1, position: [0, -0.7, -1.2] },
    ],
  },
] as const satisfies readonly VbaoCanonicalDriftCase[])

function verdictForDiff(absDiff: number, thresholds: VbaoCanonicalDriftThresholds): VbaoCanonicalDriftVerdict {
  if (absDiff >= thresholds.failAbsDiff) return 'fail'
  if (absDiff >= thresholds.warnAbsDiff) return 'warn'
  return 'pass'
}

function samplesForSide(
  testCase: VbaoCanonicalDriftCase,
  sideSign: 1 | -1,
): readonly CanonicalVbaoSample[] & readonly ScalarVbaoSample[] {
  return testCase.samples
    .filter((sample) => sample.sideSign === sideSign)
    .map((sample) => ({ position: sample.position }))
}

export function evaluateVbaoCanonicalDriftCase(
  testCase: VbaoCanonicalDriftCase,
  thresholds: VbaoCanonicalDriftThresholds = DEFAULT_THRESHOLDS,
): VbaoCanonicalDriftRow {
  const canonical = evaluateCanonicalVbaoReference({
    pixelPosition: testCase.pixelPosition,
    viewDir: testCase.viewDir,
    normalAngle: testCase.normalAngle,
    radius: testCase.radius,
    thickness: testCase.thickness,
    sampleProvider: ({ sideSign }) => samplesForSide(testCase, sideSign),
  })
  const product = evaluateScalarVbaoReference({
    pixelPosition: testCase.pixelPosition,
    normal: testCase.normal,
    radius: testCase.radius,
    thickness: testCase.thickness,
    slices: 1,
    rotation: 0,
    sampleProvider: ({ sideSign }) => samplesForSide(testCase, sideSign),
  })
  const absDiff = Math.abs(product.accessibility - canonical.accessibility)

  return {
    caseId: testCase.id,
    description: testCase.description,
    canonicalAccessibility: canonical.accessibility,
    productAccessibility: product.accessibility,
    absDiff,
    verdict: verdictForDiff(absDiff, thresholds),
  }
}

export function createVbaoCanonicalDriftReport(options: {
  readonly generatedAt?: string
  readonly thresholds?: Partial<VbaoCanonicalDriftThresholds>
} = {}): VbaoCanonicalDriftReport {
  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...options.thresholds,
  }
  const rows = VBAO_CANONICAL_DRIFT_CASES.map((testCase) =>
    evaluateVbaoCanonicalDriftCase(testCase, thresholds),
  )
  const errors = rows.map((row) => row.absDiff)
  const mae = errors.reduce((sum, error) => sum + error, 0) / Math.max(1, errors.length)
  const worstIndex = errors.indexOf(Math.max(...errors))
  const worst = rows[worstIndex] ?? rows[0]!
  const hasFail = rows.some((row) => row.verdict === 'fail')
  const hasWarn = rows.some((row) => row.verdict === 'warn')

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    basis:
      'Canonical VBAO drift report: strict UpdateSectors/pixel-view-thickness/popcount lane compared against current product scalar VBAO corrections on identical synthetic samples.',
    thresholds,
    rows,
    summary: {
      verdict: hasFail ? 'fail' : hasWarn ? 'warn' : 'pass',
      mae,
      worstCaseId: worst.caseId,
      worstAbsDiff: worst.absDiff,
    },
  }
}

export function formatVbaoCanonicalDriftReportMarkdown(report: VbaoCanonicalDriftReport): string {
  const lines: string[] = []
  lines.push('# VBAO Canonical Drift Report')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(`Basis: ${report.basis}`)
  lines.push('')
  lines.push(
    `Summary: ${report.summary.verdict}; MAE ${report.summary.mae.toFixed(4)}, worst ${report.summary.worstCaseId} (${report.summary.worstAbsDiff.toFixed(4)}).`,
  )
  lines.push('')
  lines.push('| Case | Canonical | Product | Abs diff ↓ | Verdict |')
  lines.push('| --- | ---: | ---: | ---: | --- |')
  for (const row of report.rows) {
    lines.push(
      `| ${row.caseId} | ${row.canonicalAccessibility.toFixed(4)} | ${row.productAccessibility.toFixed(4)} | ${row.absDiff.toFixed(4)} | ${row.verdict} |`,
    )
  }
  lines.push('')
  lines.push('Notes:')
  lines.push('- This report measures drift, not visual superiority.')
  lines.push('- Warn/fail rows mean product corrections need reference justification before being called improvements.')

  return `${lines.join('\n')}\n`
}
