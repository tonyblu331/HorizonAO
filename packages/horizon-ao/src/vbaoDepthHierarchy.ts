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
