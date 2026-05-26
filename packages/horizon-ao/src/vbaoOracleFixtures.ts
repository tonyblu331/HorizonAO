import type { Vec3 } from './vbaoReference'
import {
  classifyVbaoQuality,
  estimateHemisphereAccessibility,
  type VbaoQualityFailureLabel,
  type VbaoQualityClassificationInput,
} from './vbaoGroundTruth'

export const VBAO_ORACLE_FIXTURE_IDS = [
  'flat-open',
  'full-hemisphere-blocked',
  'two-wall-corner',
  'thin-occluder',
  'stair-step-negative',
  'museum-scale',
] as const

export type VbaoOracleFixtureId = (typeof VBAO_ORACLE_FIXTURE_IDS)[number]

export interface VbaoOracleFixtureMatrixOptions {
  readonly sampleCount?: number
}

export interface VbaoOracleFixtureDefinition {
  readonly id: VbaoOracleFixtureId
  readonly label: string
  readonly normal: Vec3
  readonly expectedRange: readonly [number, number]
  readonly occludes: (direction: Vec3, sampleIndex: number) => boolean
  readonly artifactMetrics?: Partial<VbaoQualityClassificationInput>
}

export interface VbaoOracleFixtureResult {
  readonly id: VbaoOracleFixtureId
  readonly label: string
  readonly sampleCount: number
  readonly accessibility: number
  readonly expectedMin: number
  readonly expectedMax: number
  readonly withinExpectedRange: boolean
  readonly accepted: boolean
  readonly failureLabels: readonly VbaoQualityFailureLabel[]
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function distanceOutsideRange(value: number, [min, max]: readonly [number, number]): number {
  if (value < min) return min - value
  if (value > max) return value - max
  return 0
}

function thinOccluder(direction: Vec3): boolean {
  const [x, y, z] = direction

  return y > 0.12 && Math.abs(x) < 0.045 && z < 0.96
}

function museumScaleOccluders(direction: Vec3): boolean {
  const [x, y, z] = direction
  const grazingBackWall = z < 0.34 && y > -0.2
  const centralPedestalAndSculpture = y > 0.14 && Math.abs(x) < 0.36 && z < 0.82
  const sideColumn = x > 0.46 && z < 0.92
  const foregroundBlock = y < -0.55 && Math.abs(x) < 0.5 && z < 0.42

  return grazingBackWall || centralPedestalAndSculpture || sideColumn || foregroundBlock
}

export const VBAO_ORACLE_FIXTURES: readonly VbaoOracleFixtureDefinition[] = Object.freeze([
  {
    id: 'flat-open',
    label: 'Flat plane / fully open hemisphere',
    normal: [0, 0, 1],
    expectedRange: [1, 1],
    occludes: () => false,
  },
  {
    id: 'full-hemisphere-blocked',
    label: 'Full hemisphere occlusion',
    normal: [0, 0, 1],
    expectedRange: [0, 0],
    occludes: () => true,
  },
  {
    id: 'two-wall-corner',
    label: 'Two perpendicular wall corner',
    normal: [0, 0, 1],
    expectedRange: [0.22, 0.28],
    occludes: ([x, y]) => x > 0 || y > 0,
  },
  {
    id: 'thin-occluder',
    label: 'Thin vertical occluder',
    normal: [0, 0, 1],
    expectedRange: [0.9, 0.99],
    occludes: thinOccluder,
  },
  {
    id: 'stair-step-negative',
    label: 'Stair-step / false-curvature negative control',
    normal: [0, 0, 1],
    expectedRange: [0.35, 0.65],
    occludes: ([, , z], sampleIndex) => z < 0.75 && Math.floor(sampleIndex / 128) % 2 === 0,
    artifactMetrics: {
      stairStepError: 0.2,
    },
  },
  {
    id: 'museum-scale',
    label: 'Museum-like mixed scale fixture',
    normal: [0, 0, 1],
    expectedRange: [0.45, 0.7],
    occludes: museumScaleOccluders,
  },
])

export function evaluateVbaoOracleFixtureMatrix(
  options: VbaoOracleFixtureMatrixOptions = {},
): readonly VbaoOracleFixtureResult[] {
  const sampleCount = Math.max(1, Math.floor(options.sampleCount ?? 4096))

  return VBAO_ORACLE_FIXTURES.map((fixture) => {
    const accessibility = estimateHemisphereAccessibility({
      normal: fixture.normal,
      sampleCount,
      occludes: fixture.occludes,
    })
    const absoluteError = distanceOutsideRange(accessibility, fixture.expectedRange)
    const failureLabels = classifyVbaoQuality({
      ...fixture.artifactMetrics,
      absoluteError,
    })
    const withinExpectedRange =
      accessibility >= fixture.expectedRange[0] && accessibility <= fixture.expectedRange[1]

    return {
      id: fixture.id,
      label: fixture.label,
      sampleCount,
      accessibility: clamp01(accessibility),
      expectedMin: fixture.expectedRange[0],
      expectedMax: fixture.expectedRange[1],
      withinExpectedRange,
      accepted: withinExpectedRange && failureLabels.length === 0,
      failureLabels,
    }
  })
}
