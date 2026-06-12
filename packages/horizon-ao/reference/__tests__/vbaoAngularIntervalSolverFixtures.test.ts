import { describe, expect, it } from 'vitest'
import { SECTOR_COUNT } from '../../src/vbaoConstants'
import {
  buildGtVbaoPointSampleMask,
  gtVbaoSliceLocalCdf,
  popcount32,
  type Vec3,
} from '../vbaoGtVbaoMath'
import {
  evaluateScalarVbaoReference,
  makeScalarVbaoSampleAtTheta,
  sectorPopcount,
  type ScalarVbaoSample,
  type ScalarVbaoThicknessPolicy,
} from '../vbaoReference'
import { evaluateVbaoReceiverConfidence } from '../vbaoReceiverConfidence'

type SolverTerm =
  | 'thickness-policy'
  | 'sector-confidence'
  | 'sector-boundary'
  | 'edge-aware-reconstruction'

const PIXEL: Vec3 = [0, 0, -1]
const NORMAL: Vec3 = [0, 0, 1]

function angularSamples(
  theta0: number,
  theta1: number,
  count: number,
  distance: number,
): (input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[] {
  return ({ sliceDir, viewDir }) =>
    Array.from({ length: count }, (_, index) => {
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

function maskForPolicy(
  thicknessPolicy: ScalarVbaoThicknessPolicy,
  sampleProvider: (input: { readonly sliceDir: Vec3; readonly viewDir: Vec3 }) => readonly ScalarVbaoSample[],
): number {
  return evaluateScalarVbaoReference({
    pixelPosition: PIXEL,
    normal: NORMAL,
    radius: 1,
    thickness: 0.3,
    slices: 1,
    thicknessPolicy,
    sampleProvider,
  }).sliceMasks[0] ?? 0
}

function intervalMaskStochasticReference(input: {
  readonly u0: number
  readonly u1: number
  readonly xi: number
}): number {
  const lo = Math.max(0, Math.min(1, Math.min(input.u0, input.u1)))
  const hi = Math.max(0, Math.min(1, Math.max(input.u0, input.u1)))
  const intervalSectors = (hi - lo) * SECTOR_COUNT
  if (intervalSectors <= 1e-5) return 0

  if (intervalSectors >= 1) {
    const k0 = Math.ceil(lo * SECTOR_COUNT - 0.5)
    const k1 = Math.floor(hi * SECTOR_COUNT - 0.5)
    let mask = 0
    for (let sector = Math.max(0, k0); sector <= Math.min(SECTOR_COUNT - 1, k1); sector++) {
      mask = (mask | (1 << sector)) >>> 0
    }
    return mask >>> 0
  }

  const thinSector = Math.max(
    0,
    Math.min(SECTOR_COUNT - 1, Math.floor((lo + hi) * 0.5 * SECTOR_COUNT)),
  )
  return input.xi < intervalSectors ? (1 << thinSector) >>> 0 : 0
}

function scalarEdgeCompatibility(input: {
  readonly centerPosition: Vec3
  readonly centerNormal: Vec3
  readonly tapPosition: Vec3
  readonly tapNormal: Vec3
  readonly radius: number
}): number {
  const normalAgreement = Math.max(0, Math.min(1, dot3(input.centerNormal, input.tapNormal)))
  const delta: Vec3 = [
    input.tapPosition[0] - input.centerPosition[0],
    input.tapPosition[1] - input.centerPosition[1],
    input.tapPosition[2] - input.centerPosition[2],
  ]
  const planeDistance = Math.abs(dot3(delta, input.centerNormal))
  const depthWeight = 2 ** ((-planeDistance * 24) / Math.max(input.radius, 1e-3))
  const normal2 = normalAgreement * normalAgreement
  const normal4 = normal2 * normal2
  const normalWeight = normal4 * normal4
  return depthWeight * normalWeight
}

function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

describe('VBAO angular interval solver fixture matrix', () => {
  it('tags thickness collapse as a thickness-policy fixture, not a reconstruction fixture', () => {
    const ownerTerm: SolverTerm = 'thickness-policy'
    const nearContact = angularSamples(-0.12, 0.12, 64, 0.035)
    const currentMask = maskForPolicy('current', nearContact)
    const adaptiveMask = maskForPolicy('adaptive-near-sample', nearContact)
    const minimumFloorMask = maskForPolicy('minimum-effective-floor', nearContact)

    expect(ownerTerm).toBe('thickness-policy')
    expect(sectorPopcount(adaptiveMask)).toBeGreaterThanOrEqual(sectorPopcount(currentMask))
    expect(sectorPopcount(minimumFloorMask)).toBeGreaterThanOrEqual(sectorPopcount(currentMask))
  })

  it('keeps thin-gap regression paired with broad-contact thickness gains', () => {
    const ownerTerm: SolverTerm = 'thickness-policy'
    const thinGap = angularSamples(-0.02, 0.02, 3, 0.035)
    const broadContact = angularSamples(-0.12, 0.12, 64, 0.035)
    const currentThin = sectorPopcount(maskForPolicy('current', thinGap))
    const currentBroad = sectorPopcount(maskForPolicy('current', broadContact))
    const candidateThin = sectorPopcount(maskForPolicy('minimum-effective-floor', thinGap))
    const candidateBroad = sectorPopcount(maskForPolicy('minimum-effective-floor', broadContact))

    expect(ownerTerm).toBe('thickness-policy')
    expect(candidateBroad).toBeGreaterThanOrEqual(currentBroad)
    expect(candidateThin).toBeGreaterThan(currentThin)
  })

  it('tags sector-boundary instability separately from thickness policy', () => {
    const ownerTerm: SolverTerm = 'sector-boundary'
    const boundaryU = 12 / SECTOR_COUNT
    const centerU = 12.5 / SECTOR_COUNT
    const boundaryTheta = Math.asin(boundaryU * 2 - 1)
    const centerTheta = Math.asin(centerU * 2 - 1)
    const epsilon = 1e-4
    const boundaryMask = buildGtVbaoPointSampleMask(
      boundaryTheta - epsilon,
      boundaryTheta + epsilon,
      0,
    )
    const centerMask = buildGtVbaoPointSampleMask(centerTheta - epsilon, centerTheta + epsilon, 0)

    expect(ownerTerm).toBe('sector-boundary')
    expect(popcount32(boundaryMask)).toBe(0)
    expect(popcount32(centerMask)).toBe(1)
  })

  it('classifies one-hit stochastic sectors as sector-confidence work', () => {
    const ownerTerm: SolverTerm = 'sector-confidence'
    const thinInterval = { u0: 0.45, u1: 0.45 + 0.4 / SECTOR_COUNT }
    const missed = intervalMaskStochasticReference({ ...thinInterval, xi: 0.9 })
    const hit = intervalMaskStochasticReference({ ...thinInterval, xi: 0.1 })

    expect(ownerTerm).toBe('sector-confidence')
    expect(popcount32(missed)).toBe(0)
    expect(popcount32(hit)).toBe(1)
    expect(evaluateVbaoReceiverConfidence({
      sliceMasks: [hit],
      sliceAcceptedSampleCounts: [1],
      sliceCandidateSampleCounts: [8],
    }).support).toBeCloseTo(0.125, 6)
  })

  it('keeps stable broad support distinct from weak one-hit support', () => {
    const ownerTerm: SolverTerm = 'sector-confidence'
    const stableMask = buildGtVbaoPointSampleMask(-0.45, 0.45, 0)
    const weakMask = intervalMaskStochasticReference({
      u0: gtVbaoSliceLocalCdf(-0.02, 0),
      u1: gtVbaoSliceLocalCdf(0.02, 0),
      xi: 0.1,
    })
    const stable = evaluateVbaoReceiverConfidence({
      sliceMasks: [stableMask],
      sliceAcceptedSampleCounts: [8],
      sliceCandidateSampleCounts: [8],
    })
    const weak = evaluateVbaoReceiverConfidence({
      sliceMasks: [weakMask],
      sliceAcceptedSampleCounts: [1],
      sliceCandidateSampleCounts: [8],
    })

    expect(ownerTerm).toBe('sector-confidence')
    expect(stable.support).toBeGreaterThan(weak.support)
    expect(stable.confidence).toBeGreaterThan(weak.confidence)
  })

  it('tags cross-edge mixing as edge-aware reconstruction work, not raw estimator work', () => {
    const ownerTerm: SolverTerm = 'edge-aware-reconstruction'
    const compatible = scalarEdgeCompatibility({
      centerPosition: [0, 0, -1],
      centerNormal: [0, 0, 1],
      tapPosition: [0.02, 0, -1.005],
      tapNormal: [0, 0, 1],
      radius: 1,
    })
    const depthEdge = scalarEdgeCompatibility({
      centerPosition: [0, 0, -1],
      centerNormal: [0, 0, 1],
      tapPosition: [0.02, 0, -1.35],
      tapNormal: [0, 0, 1],
      radius: 1,
    })
    const normalEdge = scalarEdgeCompatibility({
      centerPosition: [0, 0, -1],
      centerNormal: [0, 0, 1],
      tapPosition: [0.02, 0, -1.005],
      tapNormal: [0, 1, 0],
      radius: 1,
    })

    expect(ownerTerm).toBe('edge-aware-reconstruction')
    expect(compatible).toBeGreaterThan(0.8)
    expect(depthEdge).toBeLessThan(0.01)
    expect(normalEdge).toBe(0)
  })
})
