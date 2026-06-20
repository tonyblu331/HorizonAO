import { describe, expect, it } from 'vitest'
import mergedResolveSource from '../VBAOMergedResolveNode.ts?raw'
import indexSource from '../index.ts?raw'
import resolveSource from '../VBAOResolveNode.ts?raw'
import cleanupSource from '../VBAOHalfResCleanupNode.ts?raw'

/**
 * Source contract for the P4 merged-reconstruction prototype.
 *
 * The merged node folds the standalone half-res cleanup (3x3 edge-aware filter)
 * and JBU resolve (2x2 upsample) into ONE full-resolution pass so the two
 * reconstruction topologies can be A/B'd behind an evidence flag before either
 * is promoted. These assertions pin the design intent that makes the comparison
 * faithful: same EffectPass plumbing, same bilateral geometry weight, same
 * confidence-guided strength, and the two-endpoint (tight JBU / wide gather)
 * structure.
 */
describe('VBAO merged-resolve prototype source contract', () => {
  it('stays an internal, EffectPass-based, full-resolution single pass', () => {
    expect(mergedResolveSource).toContain('class VBAOMergedResolveNode extends VBAOEffectPass')
    expect(mergedResolveSource).toContain("super('VBAO.MergedResolve', 'VBAOMergedResolve')")
    // Internal-only, exactly like resolve/cleanup — never part of the public API.
    expect(indexSource).not.toContain('VBAOMergedResolveNode')
    expect(indexSource).not.toContain('MergedResolve')
    // Full-resolution: no resolutionScale-scaled setSize override (unlike cleanup).
    expect(mergedResolveSource).not.toContain('super.setSize(width * this.resolutionScale')
    expect(mergedResolveSource).not.toContain('new RenderTarget(')
    expect(mergedResolveSource).not.toContain('RendererUtils')
  })

  it('reproduces both reconstruction endpoints in one gather', () => {
    // Tight lobe = resolve's bilinear-quad JBU; wide lobe = cleanup's 3x3 smoothing.
    expect(mergedResolveSource).toContain("const tightAo = float(0).toVar('vbaoMergedResolveTightAo')")
    expect(mergedResolveSource).toContain("const wideAo = float(0).toVar('vbaoMergedResolveWideAo')")
    expect(mergedResolveSource).toContain(
      "const fallbackAo = float(0).toVar('vbaoMergedResolveFallbackAo')",
    )
    // 3x3 gather (-1..1 in each axis) centered on the nearest half-res texel.
    expect(mergedResolveSource).toContain('const centerTexel = floor(rawCoord.add(vec2(0.5)))')
    expect(mergedResolveSource).toMatch(/start: int\(-1\), end: int\(2\)[^}]*name: 'oy'/)
    expect(mergedResolveSource).toMatch(/start: int\(-1\), end: int\(2\)[^}]*name: 'ox'/)
    // Tight tent reproduces bilinear exactly; wide lobe adds a Gaussian falloff.
    expect(mergedResolveSource).toContain('float(1).sub(abs(offset.x))')
    expect(mergedResolveSource).toContain('const gaussianWeight = exp2(')
  })

  it('shares the bilateral geometry weight and confidence-guided strength', () => {
    // Same geometry weight helper the separate passes use — keeps the A/B fair.
    expect(mergedResolveSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(resolveSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(cleanupSource).toContain('computeVbaoBilateralGeometryWeight')
    // Same strength * (1 - confidence) modulation the cleanup pass used.
    expect(mergedResolveSource).toContain(
      'this.strengthUniform\n        .mul(float(1).sub(centerConfidence))',
    )
    expect(cleanupSource).toContain('this.strengthUniform\n        .mul(float(1).sub(centerConfidence))')
    // strength 0 -> tight JBU, strength 1 -> wide gather.
    expect(mergedResolveSource).toContain(
      'mix(tightResolvedAo, wideResolvedAo, confidenceGuidedStrength)',
    )
  })

  it('falls back to bilinear upsample on invalid center or collapsed geometry', () => {
    // Same fallback contract as VBAOResolveNode: bilinear upsample when the
    // geometry-weighted gather has no usable taps.
    expect(mergedResolveSource).toContain('centerValid\n        .and(tightWeight.greaterThan(float(1e-5)))')
    expect(mergedResolveSource).toContain('clamp(fallbackResolvedAo, float(0), float(1))')
    expect(mergedResolveSource).toContain('confidence === undefined ? float(1) : confidence.sample(uvNode).g')
  })
})
