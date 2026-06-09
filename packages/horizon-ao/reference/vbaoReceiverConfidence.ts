import { SECTOR_COUNT } from '../src/vbaoConstants'
import { popcount32 } from './vbaoGtVbaoMath'

export interface VbaoReceiverConfidenceInput {
  readonly sliceMasks: readonly number[]
  readonly sliceAcceptedSampleCounts: readonly number[]
  readonly sliceCandidateSampleCounts: readonly number[]
}

export interface VbaoReceiverConfidenceResult {
  readonly confidence: number
  readonly support: number
  readonly sliceAgreement: number
  readonly meanAccessibility: number
  readonly accessibilityMeanAbsoluteDeviation: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function accessibilityFromMask(mask: number): number {
  return 1 - popcount32(mask) / SECTOR_COUNT
}

export function evaluateVbaoReceiverConfidence(
  input: VbaoReceiverConfidenceInput,
): VbaoReceiverConfidenceResult {
  const sliceCount = Math.min(
    input.sliceMasks.length,
    input.sliceAcceptedSampleCounts.length,
    input.sliceCandidateSampleCounts.length,
  )

  if (sliceCount === 0) {
    return Object.freeze({
      confidence: 0,
      support: 0,
      sliceAgreement: 0,
      meanAccessibility: 1,
      accessibilityMeanAbsoluteDeviation: 0,
    })
  }

  let acceptedSamples = 0
  let candidateSamples = 0
  const accessibilities: number[] = []

  for (let index = 0; index < sliceCount; index++) {
    const candidates = Math.max(0, input.sliceCandidateSampleCounts[index] ?? 0)
    const accepted = Math.max(0, input.sliceAcceptedSampleCounts[index] ?? 0)
    candidateSamples += candidates
    acceptedSamples += Math.min(accepted, candidates)
    accessibilities.push(accessibilityFromMask(input.sliceMasks[index] ?? 0))
  }

  const support = candidateSamples <= 0 ? 0 : clamp01(acceptedSamples / candidateSamples)
  const meanAccessibility =
    accessibilities.reduce((total, value) => total + value, 0) / accessibilities.length
  const accessibilityMeanAbsoluteDeviation =
    accessibilities.reduce((total, value) => total + Math.abs(value - meanAccessibility), 0) /
    accessibilities.length
  const sliceAgreement = clamp01(1 - accessibilityMeanAbsoluteDeviation / 0.5)
  const confidence = Math.sqrt(support * sliceAgreement)

  return Object.freeze({
    confidence,
    support,
    sliceAgreement,
    meanAccessibility,
    accessibilityMeanAbsoluteDeviation,
  })
}
