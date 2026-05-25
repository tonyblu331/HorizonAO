export interface VbaoDepthHierarchyLevelInput {
  readonly sampleFootprintPixels: number
  readonly maxLevel: number
}

export function chooseVbaoDepthHierarchyLevel({
  sampleFootprintPixels,
  maxLevel,
}: VbaoDepthHierarchyLevelInput): number {
  const levelLimit = Math.max(0, Math.floor(maxLevel))
  if (sampleFootprintPixels === Number.POSITIVE_INFINITY) {
    return levelLimit
  }

  const finiteFootprint = Number.isFinite(sampleFootprintPixels) ? sampleFootprintPixels : 0
  const clampedFootprint = Math.max(1, finiteFootprint)
  const level = Math.floor(Math.log2(clampedFootprint))

  return Math.min(levelLimit, Math.max(0, level))
}

export interface VbaoRepresentativeDepthInput {
  readonly viewDepths: readonly number[]
  readonly farthestDepthTolerance: number
  readonly fallbackViewDepth: number
}

export interface VbaoRepresentativeDepthResult {
  readonly viewDepth: number
  readonly farthestViewDepth: number
  readonly supportCount: number
}

export function chooseVbaoRepresentativeDepth({
  viewDepths,
  farthestDepthTolerance,
  fallbackViewDepth,
}: VbaoRepresentativeDepthInput): VbaoRepresentativeDepthResult {
  const validDepths = viewDepths.filter((depth) => Number.isFinite(depth) && depth > 0)
  const fallback = Number.isFinite(fallbackViewDepth) && fallbackViewDepth > 0 ? fallbackViewDepth : 1

  if (validDepths.length === 0) {
    return {
      viewDepth: fallback,
      farthestViewDepth: fallback,
      supportCount: 0,
    }
  }

  const farthestViewDepth = Math.max(...validDepths)
  const tolerance = Math.max(0, farthestDepthTolerance)
  const supportedDepths = validDepths.filter((depth) => farthestViewDepth - depth <= tolerance)
  const supportTotal = supportedDepths.reduce((sum, depth) => sum + depth, 0)

  return {
    viewDepth: supportTotal / supportedDepths.length,
    farthestViewDepth,
    supportCount: supportedDepths.length,
  }
}
