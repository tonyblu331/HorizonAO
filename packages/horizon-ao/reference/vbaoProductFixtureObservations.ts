import {
  REFERENCE_SECTOR_COUNT,
  REFERENCE_THETA_MIN,
  evaluateScalarVbaoReference,
  makeScalarVbaoSampleAtTheta,
  sectorPopcount,
  type ScalarVbaoSample,
  type Vec3,
} from './vbaoReference'

const PIXEL: Vec3 = [0, 0, -1]
const NORMAL: Vec3 = [0, 0, 1]

export const VBAO_PRODUCT_FIXTURE_IDS = [
  'flat-plane',
  'full-hemisphere',
  'two-wall-corner',
  'thin-occluder',
] as const

export type VbaoProductFixtureId = (typeof VBAO_PRODUCT_FIXTURE_IDS)[number]

export type VbaoProductFixtureVerdict = 'observed' | 'missing-reference-observation'

export interface VbaoProductFixtureObservation {
  readonly fixtureId: VbaoProductFixtureId
  readonly accessibility: number
  readonly occupiedSectors: number
  readonly source: 'analytic-product-reference'
  readonly note: string
}

export interface VbaoProductFixtureObservationReport {
  readonly generatedAt: string
  readonly observations: readonly VbaoProductFixtureObservation[]
  readonly missingFixtureIds: readonly VbaoProductFixtureId[]
  readonly verdict: VbaoProductFixtureVerdict
}

function angularSamples(
  theta0: number,
  theta1: number,
  count: number,
  distance = 0.9,
): (input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[] {
  return ({ sliceDir, viewDir }) =>
    Array.from({ length: Math.max(0, count) }, (_, index) => {
      const t = count <= 1 ? 0.5 : index / (count - 1)
      return makeScalarVbaoSampleAtTheta({
        pixelPosition: PIXEL,
        viewDir,
        sliceDir,
        theta: theta0 + (theta1 - theta0) * t,
        distance,
      })
    })
}

function combinedSamples(
  ...providers: readonly ((input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[])[]
): (input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[] {
  return (input) => providers.flatMap((provider) => provider(input))
}

function observeFixture(fixtureId: VbaoProductFixtureId): VbaoProductFixtureObservation {
  const result =
    fixtureId === 'flat-plane'
      ? evaluateScalarVbaoReference({
          pixelPosition: PIXEL,
          normal: NORMAL,
          radius: 1,
          thickness: 0.25,
          slices: 1,
          sampleProvider: () => [],
        })
      : fixtureId === 'full-hemisphere'
        ? evaluateScalarVbaoReference({
            pixelPosition: PIXEL,
            normal: NORMAL,
            radius: 1,
            thickness: 0.3,
            slices: 1,
            sampleProvider: angularSamples(REFERENCE_THETA_MIN + 0.001, Math.PI / 2 - 0.001, 256),
          })
        : fixtureId === 'two-wall-corner'
          ? evaluateScalarVbaoReference({
              pixelPosition: PIXEL,
              normal: NORMAL,
              radius: 1,
              thickness: 0.12,
              slices: 1,
              sampleProvider: combinedSamples(
                angularSamples(-1.3, -0.35, 96),
                angularSamples(0.35, 1.3, 96),
              ),
            })
          : evaluateScalarVbaoReference({
              pixelPosition: PIXEL,
              normal: NORMAL,
              radius: 1,
              thickness: 0.025,
              slices: 1,
              sampleProvider: angularSamples(-0.02, 0.02, 3, 0.7),
            })

  return {
    fixtureId,
    accessibility: result.accessibility,
    occupiedSectors: sectorPopcount(result.sliceMasks[0] ?? 0),
    source: 'analytic-product-reference',
    note: 'Product scalar VBAO observation using the same interval, validity, and cosine-reduction contracts as the live node.',
  }
}

export function createVbaoProductFixtureObservationReport(options: {
  readonly generatedAt?: string
  readonly observations?: readonly VbaoProductFixtureObservation[]
} = {}): VbaoProductFixtureObservationReport {
  const observations = options.observations ?? VBAO_PRODUCT_FIXTURE_IDS.map(observeFixture)
  const observedIds = new Set(observations.map((observation) => observation.fixtureId))
  const missingFixtureIds = VBAO_PRODUCT_FIXTURE_IDS.filter((fixtureId) => !observedIds.has(fixtureId))

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    observations,
    missingFixtureIds,
    verdict: missingFixtureIds.length === 0 ? 'observed' : 'missing-reference-observation',
  }
}

export function formatVbaoProductFixtureObservationReportMarkdown(
  report: VbaoProductFixtureObservationReport,
): string {
  const lines: string[] = []
  lines.push('# VBAO Product Fixture Observations')
  lines.push('')
  lines.push(`Generated: ${report.generatedAt}`)
  lines.push('')
  lines.push(`Verdict: ${report.verdict}`)
  lines.push('')
  lines.push('| Fixture | Accessibility | Occupied sectors | Source |')
  lines.push('| --- | ---: | ---: | --- |')

  for (const observation of report.observations) {
    lines.push(
      `| ${observation.fixtureId} | ${observation.accessibility.toFixed(4)} | ${observation.occupiedSectors}/${REFERENCE_SECTOR_COUNT} | ${observation.source} |`,
    )
  }

  for (const fixtureId of report.missingFixtureIds) {
    lines.push(`| ${fixtureId} | n/a | n/a | missing-reference-observation |`)
  }

  lines.push('')
  lines.push('Notes:')
  lines.push('- Missing product fixture observations are blockers, not passes.')
  lines.push('- These observations support product-quality claims; they do not replace screenshot evidence.')

  return `${lines.join('\n')}\n`
}
