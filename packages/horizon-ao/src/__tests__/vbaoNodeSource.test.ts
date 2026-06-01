import { describe, expect, it } from 'vitest'
import source from '../VBAONode.ts?raw'
import noiseSource from '../vbaoNoise.ts?raw'
import samplingSource from '../vbaoSampling.ts?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'
import fullResPolishSource from '../VBAOFullResPolishNode.ts?raw'
import halfResCleanupSource from '../VBAOHalfResCleanupNode.ts?raw'
import resolveSource from '../VBAOResolveNode.ts?raw'
import museumSource from '../../../../apps/demo/src/scenes/MuseumScene.tsx?raw'
import aoCompareSource from '../../../../apps/demo/e2e/ao-compare.spec.ts?raw'
import benchmarkSource from '../../../../apps/demo/scripts/collect-ao-benchmark.mjs?raw'
import profilingBenchmarkHarnessSource from '../../../../apps/demo/scripts/profiling/benchmarkHarness.mjs?raw'
import profilingProductionReportSource from '../../../../apps/demo/scripts/profiling/productionReport.mjs?raw'
import profilingScreenshotMetricsSource from '../../../../apps/demo/scripts/profiling/screenshotMetrics.mjs?raw'

const runtimeSources = [museumSource, aoCompareSource, benchmarkSource].join('\n')

const forbiddenRuntimeResearchKnobs = [
  'custom-bilateral',
  'metadata-aware',
  'gtvbao++',
  'ssilvb-reference',
  'VbaoMetadataDebugView',
  'vbaoMetadataDebugView',
  'data-vbao-metadata-debug',
  'AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX',
  'AO_BENCHMARK_VBAO_FORMULA_ABLATION_MATRIX',
  'AO_BENCHMARK_VBAO_ADAPTIVE_RADIUS_MATRIX',
  'AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX',
  'AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX',
  'fixture-adaptive-v1',
  'vbaoPrefilter',
  'vbaoMetadataAwareScalar',
  'vbaoGtVbaoPlusPlusSmartDenoiserScalar',
  'vbaoMaskMetadataDebugScalars',
  'vbaoPaperReferencePopcount',
  'setVbaoDenoiseFilter',
  'setVbaoFormulaVariant',
  'setVbaoDebugView',
  'setVbaoDepthPrefilterPreset',
  'setVbaoDepthPrepPreset',
  'setVbaoSamplingSchedule',
  'setVbaoRadiusStressPreset',
]

describe('modernized VBAO production source contract', () => {
  it('keeps raw VBAO typechecked and free of benchmark APIs', () => {
    expect(source).not.toContain('@ts-nocheck')
    expect(source).not.toContain('setBenchmark')
    expect(source).not.toContain('benchmarkSamplingSchedule')
    expect(source).not.toContain('VBAO_SAMPLING_SCHEDULES')
    expect(source).not.toContain('GT-VBAO++ production')
    expect(source).not.toContain('VBAO Raw GT-VBAO++')
    expect(source).toContain('Visibility-bitmask ambient occlusion for Three.js TSL/WebGPU')
    expect(source).toContain("this.material.name = 'VBAO'")
    expect(source).toContain("quadMesh.name = 'VBAO'")
  })

  it('uses exactly one internal deterministic x²-biased sampling scheme', () => {
    expect(samplingSource).toContain('VBAO_SAMPLING_SCHEME')
    expect(samplingSource).toContain('phase-atlas-stable-hash')
    expect(samplingSource).toContain('VBAO_PHASE_ATLAS_PHASES = 64')
    expect(samplingSource).toContain('return t * t')
    expect(samplingSource).not.toContain('magic-square')
    expect(samplingSource).not.toContain('hilbert')
  })

  it('applies x² sample spacing in the live shader path', () => {
    expect(source).toContain('const stepT = float(j).add(stepJitter).div(sampleCount)')
    expect(source).toContain('const stepFrac = stepT.mul(stepT)')
    expect(source).toContain('const sampleNoiseTexel = sampleNoisePhase(i, j)')
    expect(source).toContain("const stepJitter = sampleNoiseTexel.y.toVar('stepJitter')")
    expect(source).not.toContain(
      'const stepFrac = float(j).add(stepJitter).div(float(this.samples))',
    )
    expect(source).not.toContain('radialBase')
  })

  it('uses a non-interpolated phase atlas noise texture to avoid visible tiled ramps', () => {
    expect(noiseSource).toContain('NearestFilter')
    expect(noiseSource).toContain('NoColorSpace')
    expect(noiseSource).toContain('VBAO_NOISE_TILE_SIZE = 64')
    expect(samplingSource).toContain('VBAO_PHASE_ATLAS_PHASES = 64')
    expect(samplingSource).toContain('VBAO_PHASE_ATLAS_COLUMNS = 8')
    expect(samplingSource).toContain('VBAO_PHASE_ATLAS_ROWS = VBAO_PHASE_ATLAS_PHASES / VBAO_PHASE_ATLAS_COLUMNS')
    expect(samplingSource).toContain('VBAO_PHASE_STRIDE = 16')
    expect(noiseSource).toContain('const atlasWidth = n * VBAO_PHASE_ATLAS_COLUMNS')
    expect(noiseSource).toContain('const atlasHeight = n * VBAO_PHASE_ATLAS_ROWS')
    expect(source).toContain('const phaseRaw = float(slice).mul(float(VBAO_PHASE_STRIDE)).add(float(sample))')
    expect(source).not.toContain('float(slice).mul(float(8)).add(float(sample))')
    expect(noiseSource).toContain('tex.magFilter = NearestFilter')
    expect(noiseSource).toContain('tex.minFilter = NearestFilter')
    expect(noiseSource).toContain('tex.generateMipmaps = false')
    expect(noiseSource).toContain('tex.colorSpace = NoColorSpace')
  })

  it('hoists phase atlas pixel coordinates out of the per-sample noise lookup', () => {
    expect(source).toContain("const vbaoPixel = floor(uvNode.mul(this.resolution)).toVar('vbaoPixel')")
    expect(source).toContain(".toVar('vbaoLocalPixel')")
    expect(source).toMatch(
      /const vbaoLocalPixel = vbaoPixel[\s\S]*?const sampleNoisePhase = \(slice: any, sample: any\) => \{/,
    )
    expect(source).toContain('const atlasPixel = vbaoLocalPixel.add')
    expect(source).not.toContain('const pixel = floor(uvNode.mul(this.resolution))')
    expect(source).not.toContain('const localPixel = pixel.sub')
  })

  it('shares the default phase atlas instead of allocating one texture per VBAONode', () => {
    expect(noiseSource).toContain('let sharedVbaoNoiseTexture: DataTexture | undefined')
    expect(noiseSource).toContain('export function getSharedVbaoNoiseTexture()')
    expect(noiseSource).toContain('sharedVbaoNoiseTexture ??= createVbaoNoiseTexture()')
    expect(source).toContain('this.noiseTexture = getSharedVbaoNoiseTexture()')
    expect(source).not.toContain('function generateSamplingNoise()')
    expect(source).not.toContain('this.noiseTexture.dispose()')
  })

  it('stores raw AO in half-float and nearest-filters the manual product resolve source', () => {
    expect(source).toContain('HalfFloatType')
    expect(source).toContain('type: HalfFloatType')
    expect(source).toContain('this.renderTarget.texture.magFilter = NearestFilter')
    expect(source).toContain('this.renderTarget.texture.minFilter = NearestFilter')
    expect(source).toContain('this.renderTarget.texture.generateMipmaps = false')
    expect(source).toContain('this.renderTarget.texture.colorSpace = NoColorSpace')
    expect(halfResCleanupSource).toContain('NearestFilter')
    expect(halfResCleanupSource).toContain('this.renderTarget.texture.magFilter = NearestFilter')
    expect(halfResCleanupSource).toContain('this.renderTarget.texture.minFilter = NearestFilter')
    expect(resolveSource).toContain('NearestFilter')
    expect(resolveSource).toContain('this.renderTarget.texture.magFilter = NearestFilter')
    expect(resolveSource).toContain('this.renderTarget.texture.minFilter = NearestFilter')
    expect(fullResPolishSource).toContain('NearestFilter')
    expect(fullResPolishSource).toContain('this.renderTarget.texture.magFilter = NearestFilter')
    expect(fullResPolishSource).toContain('this.renderTarget.texture.minFilter = NearestFilter')
  })

  it('maps both marched sides into one signed hemislice mask domain', () => {
    expect(source).toContain('const sampleDir = S_i.mul(sideSign)')
    expect(source).not.toContain('const S_side = S_i.mul(sideSign)')
    expect(source).not.toContain('dot(D_front, S_side)')
    expect(source).not.toContain('dot(D_back, S_side)')
    expect(source).toContain(
      'const uFront = (vbaoCosineMeasureNoAtan as any)(D_front, V, S_i, sinGamma, cosGamma)',
    )
    expect(source).toContain(
      'const uBack = (vbaoCosineMeasureNoAtan as any)(D_back, V, S_i, sinGamma, cosGamma)',
    )
    expect(source).not.toContain('const alphaFront = atan(dot(D_front, S_i), dot(D_front, V))')
    expect(source).not.toContain('const alphaBack = atan(dot(D_back, S_i), dot(D_back, V))')
  })

  it('computes side-invariant projection once outside the inner sample loop', () => {
    expect(source).toContain('const sampleScreenEnd = getScreenPosition(')
    expect(source).toMatch(
      /const sampleScreenEnd = getScreenPosition[\s\S]*?\(Loop as any\)\(\s*\{\s*start: int\(0\), end: sampleLoopEnd/,
    )
  })

  it('rejects non-local or wrong-side samples before writing visibility sectors', () => {
    expect(source).toContain("const sampleDelta = samplePos.sub(P).toVar('sampleDelta')")
    expect(source).toContain(
      "const sampleDist2 = dot(sampleDelta, sampleDelta).toVar('sampleDist2')",
    )
    expect(source).toContain("const sampleAlong = dot(sampleDelta, sampleDir).toVar('sampleAlong')")
    expect(source).toMatch(/const maxThickness = this\.radius\.mul\(float\(0\.30\)\)\.toVar\('vbaoMaxThickness'\)[\s\S]*?const maxValidRadius2 = maxValidRadius\.mul\(maxValidRadius\)\.toVar\('vbaoMaxValidRadius2'\)[\s\S]*?\(Loop as any\)\(\s*\{ start: int\(0\), end: sliceLoopEnd/)
    expect(source).toContain('sampleDist2.greaterThan(float(1e-8))')
    expect(source).toContain('sampleDist2.lessThanEqual(maxValidRadius2)')
    expect(source).not.toContain('sampleDist2.lessThanEqual(maxValidRadius.mul(maxValidRadius))')
    expect(source).toContain('sampleAlong.greaterThan(float(0))')
    expect(source).toMatch(
      /If\(\s*occludedMask\.notEqual\(bitNot\(uint\(0\)\)\),\s*\(\) => \{[\s\S]*?const validSampleMask = \(sampleValid as any\)\.select\(pointSampleMask, uint\(0\)\)/,
    )
    expect(source).toContain("const safeTexel = vec2(0.5).div(this.resolution).toVar('vbaoSafeTexel')")
    expect(source).toContain(").toVar('sampleSafeUv')")
    expect(source).toContain("toVar('vbaoSampleOnScreen')")
    expect(source).toContain("const sD = sampleDepth(sampleSafeUv).toVar('vbaoSampleDepth')")
    expect(source).toContain('const sampleValid = onScreen')
    expect(source).not.toContain('If(sampleValid')
  })

  it('clamps sample-local thickness by radius ratio before sample distance', () => {
    expect(source).toContain(
      "const sampleDist = sqrt(max(sampleDist2, float(1e-8))).toVar('sampleDist')",
    )
    expect(source).toContain(
      "const maxThickness = this.radius.mul(float(0.30)).toVar('vbaoMaxThickness')",
    )
    expect(source).toContain(
      "const baseThickness = min(this.thickness, maxThickness).toVar('vbaoBaseThickness')",
    )
    expect(source).toContain(
      "const effectiveThickness = min(baseThickness, sampleDist.mul(float(0.85))).toVar('effectiveThickness')",
    )
    expect(source).not.toContain(
      "const effectiveThickness = min(this.thickness, sampleDist.mul(float(0.85))).toVar('effectiveThickness')",
    )
    expect(source).toContain("const backDelta = samplePos")
    expect(source).toContain("const D_back = backDelta.div(backDist).toVar('D_back')")
    expect(source).not.toContain('samplePos.sub(sampleViewDir.mul(this.thickness)).sub(P)')
  })

  it('keeps projected-normal CDF framing but averages slices uniformly to reduce low-slice banding', () => {
    expect(source).toContain("const B_i = (normalize(cross(S_i as any, V as any) as any) as any).toVar('B_i')")
    expect(source).toContain('const NprojRaw = N.sub(B_i.mul(dot(N, B_i))).toVar')
    expect(source).toContain('const NprojLen = sqrt(max(dot(NprojRaw, NprojRaw), float(1e-8))).toVar')
    expect(source).toContain('const Nproj = NprojRaw.div(NprojLen).toVar')
    expect(source).toContain('const sinGamma = dot(Nproj, S_i).toVar')
    expect(source).toContain('const cosGamma = max(dot(Nproj, V), float(1e-5)).toVar')
    expect(source).toContain('weightedAccessibility.addAssign(sliceAccessibility)')
    expect(source).toContain('weightSum.addAssign(float(1))')
    expect(source).not.toContain(
      'weightedAccessibility.addAssign(sliceAccessibility.mul(NprojLen))',
    )
  })

  it('reduces cosine-measure sector masks by popcount without a second cosine loop', () => {
    expect(source).toContain('countOneBits(occludedMask)')
    expect(source).toContain('const intervalMaskStochasticFn = (Fn as any)')
    expect(source).toContain(
      "const intervalSectors = u1.sub(u0).mul(float(SECTOR_COUNT)).toVar('vbaoIntervalSectors')",
    )
    expect(source).toContain(
      "const thinSectorMask = shiftLeft(uint(1), uint(thinSectorIndex)).toVar('vbaoThinSectorMask')",
    )
    expect(source).toContain('const thinContribution = (xi.lessThan(intervalSectors) as any).select')
    expect(source).toContain('result.assign(thinContribution)')
    expect(source).toContain(
      'const pointSampleMask = (intervalMaskStochasticFn as any)(u0, u1, subsectorNoise)',
    )
    expect(source).toContain(
      "const subsectorNoise = sampleNoiseTexel.z.toVar('vbaoSubsectorNoise')",
    )
    expect(source).not.toContain('const numerator = float(0).toVar')
    expect(source).not.toContain('const denominator = float(0).toVar')
    expect(source).not.toContain('cosTheta')
    expect(source).not.toContain('sinTheta')
  })

  it('returns one final product AO node with lazy internal pass elision', () => {
    expect(source).toContain('private resolveNode?: VBAOResolveNode')
    expect(source).toContain('private halfCleanupNode?: VBAOHalfResCleanupNode')
    expect(source).toContain('private fullPolishNode?: VBAOFullResPolishNode')
    expect(source).toContain('private rebuildOutputGraph(): void')
    expect(source).toContain('private outputGraphCreated = false')
    expect(source).toContain('private currentOutputGraphKey(): string')
    expect(source).toContain('private assertOutputGraphStable(): void')
    expect(source).toContain('if (this.resolutionScale < 0.99)')
    expect(source).toContain('const cleanupStrength = this.lowResolutionCleanupStrength()')
    expect(source).toContain('const polishStrength = this.fullResolutionPolishStrength()')
    expect(source).toContain('softness and resolutionScale affect the pass graph')
    expect(source).toMatch(/this\.outputGraphCreated &&[\s\S]*next\.softness !== this\.softness\.value[\s\S]*next\.resolutionScale !== this\.resolutionScale/)
    expect(source).toMatch(/getTextureNode\(\): TextureNode \{\s*this\.assertOutputGraphStable\(\)\s*this\.rebuildOutputGraph\(\)[\s\S]*this\.outputGraphCreated = true/)
    expect(source).toMatch(/setSize\(width: number, height: number\): void \{\s*this\.assertOutputGraphStable\(\)/)
    expect(source).not.toContain('private readonly resolvedTextureNode')
    expect(source).not.toContain('private readonly resolveNode: VBAOResolveNode')
    expect(source).not.toContain('this.resolvedTextureNode = this.resolveNode.getTextureNode()')
    expect(source).toMatch(/getTextureNode\(\): TextureNode \{\s*this\.assertOutputGraphStable\(\)\s*this\.rebuildOutputGraph\(\)\s*this\.outputGraphCreated = true\s*return this\.outputTextureNode \?\? this\.textureNode\s*\}/)
    expect(source).toMatch(/getRawTextureNode\(\): TextureNode \{\s*return this\.textureNode\s*\}/)
    expect(source).not.toContain('getSampleTextureNode')
    expect(source).not.toContain('getRenderTarget')
    expect(source).not.toContain('return this.denoise ?')
    expect(indexSource).not.toContain('VBAOResolvedNodeOptions')
    expect(indexSource).not.toContain('VBAOResolveNode')
    expect(indexSource).not.toContain('VBAOFullResPolishNode')
    expect(indexSource).not.toContain('VBAOHalfResCleanupNode')
    expect(indexSource).not.toContain('VBAODenoiseNode')
    expect(indexSource).not.toContain('filterVbaoDenoisePixel')
    expect(indexSource).not.toContain('VbaoDenoiseFilterInput')
    expect(indexSource).not.toContain('VbaoDenoiseSample')
  })

  it('keeps raw node options free of denoise controls and fake radius control', () => {
    expect(fullResPolishSource).toContain('readonly enabled?: boolean')
    expect(fullResPolishSource).toContain('readonly strength?: number')
    expect(fullResPolishSource).not.toContain('readonly resolutionScale?: number')
    expect(optionsSource).toContain('readonly softness?: number')
    expect(optionsSource).toContain('readonly quality?: VBAOQualityPreset')
    expect(optionsSource).not.toContain('readonly denoise?: boolean')
    expect(optionsSource).not.toContain('denoiseStrength')
    expect(optionsSource).not.toContain('denoiseRadius')
    expect(optionsSource).not.toContain('samplingSchedule')
    expect(optionsSource).not.toContain('visibilityMode')
    expect(optionsSource).not.toContain('diagnosticField')
  })

  it('uses artist strength plus contrast, while preserving scale/intensity aliases', () => {
    expect(optionsSource).toContain('readonly strength?: number')
    expect(optionsSource).toContain('readonly contrast?: number')
    expect(source).toContain('strength: options.strength ?? options.intensity ?? fallback.strength')
    expect(source).toContain('contrast: options.contrast ?? options.scale ?? fallback.contrast')
    expect(source).toContain('const contrastedAo = pow(accessibility, this.contrast)')
    expect(source).toContain('return float(1).sub(float(1).sub(contrastedAo).mul(this.strength))')
    expect(source).not.toContain('return pow(accessibility, this.scale)')
  })

  it('keeps temporal-free reconstruction passes internal and edge-aware', () => {
    expect(resolveSource).toContain('class VBAOResolveNode')
    expect(resolveSource).toContain('JBU4')
    expect(resolveSource).not.toContain('inline cross raw cleanup')
    expect(resolveSource).not.toContain('vbaoResolveCleanupCrossAo')
    expect(resolveSource).not.toContain('cleanupCrossAo')
    expect(resolveSource).toContain('const tapAo = rawAo.sample(tapUv).r')
    expect(resolveSource).toContain('passTexture(this as never, this.renderTarget.texture)')
    expect(resolveSource).toContain('depthNode.sample')
    expect(resolveSource).toContain('normalNode.sample')
    expect(resolveSource).toContain('getViewPosition')
    expect(resolveSource).toContain('cameraProjectionMatrixInverse')
    expect(resolveSource).toContain('Loop')
    expect(resolveSource).toContain('vbaoResolveWeightedAo')
    expect(resolveSource).toContain('vbaoResolveTotalWeight')
    expect(resolveSource).not.toContain('frameIndex')
    expect(resolveSource).not.toContain('historyTexture')
    expect(resolveSource).not.toContain('reprojection')
    expect(resolveSource).not.toContain('this as unknown as TextureNode')
    expect(indexSource).not.toContain('VBAODenoiseNode')
    expect(indexSource).not.toContain('VBAOResolveNode')
    expect(indexSource).not.toContain('VBAOFullResPolishNode')
    expect(indexSource).not.toContain('VBAOHalfResCleanupNode')
    expect(fullResPolishSource).toContain('class VBAOFullResPolishNode')
    expect(fullResPolishSource).toContain('POISSON8')
    expect(fullResPolishSource).toContain('vbaoFullResPolishNoiseAngle')
    expect(fullResPolishSource).toContain('vbaoFullResPolishIgnNoise')
    expect(fullResPolishSource).toContain('0.06711056')
    expect(fullResPolishSource).toContain('0.00583715')
    expect(fullResPolishSource).not.toContain('fract(sin(dot(pixel')
    expect(fullResPolishSource).toContain('getViewPosition')
    expect(fullResPolishSource).toContain('planeDistance')
    expect(fullResPolishSource).toContain('clampedPolishAo')
    expect(fullResPolishSource).not.toContain('start: int(-2), end: int(3)')
    expect(fullResPolishSource).not.toContain('abs(centerDepth.sub(tapDepth))')
    expect(halfResCleanupSource).toContain('class VBAOHalfResCleanupNode')
    expect(halfResCleanupSource).toContain('HALF_RES_CLEANUP_OFFSETS')
    expect(halfResCleanupSource).toContain('centerAo.mul(float(4))')
    expect(halfResCleanupSource).toContain('totalWeight = float(4).toVar')
    expect(halfResCleanupSource).toContain('getViewPosition')
    expect(halfResCleanupSource).toContain('planeDistance')
    expect(halfResCleanupSource).not.toContain('start: int(-2), end: int(3)')
    expect(fullResPolishSource).toContain('passTexture(this as never, this.renderTarget.texture)')
    expect(halfResCleanupSource).toContain('passTexture(this as never, this.renderTarget.texture)')
    expect(fullResPolishSource).not.toContain('this as unknown as TextureNode')
    expect(halfResCleanupSource).not.toContain('this as unknown as TextureNode')
    expect(fullResPolishSource).not.toContain('export function filterVbaoDenoisePixel')
    expect(fullResPolishSource).not.toContain('radius?:')
    expect(fullResPolishSource).toContain('readonly radiusNode: Node')
    expect(fullResPolishSource).not.toContain('this.radius.value')
    expect(fullResPolishSource).toContain('clamp01(options.strength ?? 1)')
    expect(fullResPolishSource).toContain('clamp01(options.strength ?? this.strength)')
    expect(fullResPolishSource).not.toContain('frameIndex')
    expect(fullResPolishSource).not.toContain('historyTexture')
    expect(fullResPolishSource).not.toContain('reprojection')
  })

  it('reconstructs JBU fallback from the same manual four-tap AO footprint', () => {
    expect(resolveSource).toContain('vbaoResolveFallbackAo')
    expect(resolveSource).toContain('vbaoResolveFallbackWeight')
    expect(resolveSource).toContain('fallbackAo.addAssign(tapAo.mul(bilinearWeight))')
    expect(resolveSource).toContain('fallbackWeight.addAssign(bilinearWeight)')
    expect(resolveSource).toContain('const fallbackResolvedAo = fallbackAo.div(max(fallbackWeight, float(1e-6)))')
    expect(resolveSource).not.toContain('const fallbackAo = rawAo.sample(uvNode).r')
  })

  it('keeps default full-resolution polish to the near 8-tap kernel', () => {
    expect(fullResPolishSource).toContain('POISSON8.forEach')
    expect(fullResPolishSource).not.toContain('POISSON_WIDE_TAPS.forEach')
    expect(fullResPolishSource).not.toContain('tapIndex + POISSON8.length')
  })

  it('spends low-resolution softness on cleanup before full-resolution polish', () => {
    expect(source).toContain('private lowResolutionCleanupStrength(): number')
    expect(source).toContain('return this.resolutionScale < 0.99 ? this.softness.value : 0')
    expect(source).toContain('private fullResolutionPolishStrength(): number')
    expect(source).toContain('return Math.max(0, this.softness.value - 0.5) * 2')
    expect(source).toContain('const cleanupStrength = this.lowResolutionCleanupStrength()')
    expect(source).toContain('const polishStrength = this.fullResolutionPolishStrength()')
    expect(source).toContain('if (cleanupStrength > 0)')
    expect(source).toContain('if (polishStrength > 0)')
    expect(source).not.toMatch(/const wantsPolish = this\.softness\.value > 0[\s\S]*?if \(wantsPolish\)[\s\S]*?getOrCreateHalfCleanupNode[\s\S]*?if \(wantsPolish\)[\s\S]*?getOrCreateFullPolishNode/)
  })

  it('uses fixed hot-loop bounds for product quality presets', () => {
    expect(source).toContain('type VbaoRawLoopShape')
    expect(source).toContain('private rawLoopShape: VbaoRawLoopShape')
    expect(source).toContain('private resolveRawLoopShape(')
    expect(source).toMatch(/qualityName !== undefined &&\s*options\.slices === undefined &&\s*options\.samples === undefined/)
    expect(source).toContain('const sliceLoopEnd = this.rawLoopShape.fixed ? int(this.rawLoopShape.slices) : int(this.slices)')
    expect(source).toContain('const sampleLoopEnd = this.rawLoopShape.fixed ? int(this.rawLoopShape.samples) : int(this.samples)')
    expect(source).toContain('end: sliceLoopEnd')
    expect(source).toContain('end: sampleLoopEnd')
    expect(source).not.toContain('end: int(this.slices)')
    expect(source).not.toContain('end: int(this.samples)')
  })

  it('keeps runtime demo and benchmark paths free of old research candidates', () => {
    for (const forbidden of forbiddenRuntimeResearchKnobs) {
      expect(runtimeSources).not.toContain(forbidden)
    }
  })

  it('captures measurable AO image quality metrics, not only screenshots/timing', () => {
    expect(benchmarkSource).toContain('analyzeScreenshotQuality')
    expect(benchmarkSource).toContain('qualityMetrics')
    expect(benchmarkSource).toContain("const modes = ['off', 'gtao', 'ssao', 'vbao', 'n8ao']")
    expect(benchmarkSource).toContain("mode === 'n8ao' && !denoiseEnabled")
    expect(benchmarkSource).toContain("import { analyzeScreenshotQuality } from './profiling/screenshotMetrics.mjs'")
    expect(benchmarkSource).toContain('AO_BENCHMARK_BASE_URL')
    expect(benchmarkSource).toContain('AO_BENCHMARK_EXTERNAL_SERVER=1 requires AO_BENCHMARK_BASE_URL')
    expect(benchmarkSource).toContain(
      "import { assertWebGpu, launchBenchmarkBrowser, startBenchmarkServer, waitForBenchmark, waitForServer } from './profiling/benchmarkHarness.mjs'",
    )
    expect(profilingBenchmarkHarnessSource).toContain('export function startBenchmarkServer')
    expect(profilingBenchmarkHarnessSource).toContain('export async function waitForServer')
    expect(profilingBenchmarkHarnessSource).toContain('export async function launchBenchmarkBrowser')
    expect(profilingBenchmarkHarnessSource).toContain('export async function waitForBenchmark')
    expect(profilingBenchmarkHarnessSource).toContain('export async function assertWebGpu')
    expect(profilingBenchmarkHarnessSource).toContain('Vite exited before AO benchmark readiness')
    expect(profilingBenchmarkHarnessSource).toContain('await server.ready')
    expect(profilingBenchmarkHarnessSource).toContain("'--strictPort'")
    expect(benchmarkSource).toContain("import { classifyFailureLabels, writeProductionQualityReports } from './profiling/productionReport.mjs'")
    expect(benchmarkSource).toContain('failureLabels: classifyFailureLabels(row)')
    expect(profilingProductionReportSource).toContain('export const AO_FAILURE_LABELS')
    expect(profilingProductionReportSource).toContain('export function classifyFailureLabels')
    expect(profilingProductionReportSource).toContain("'noise'")
    expect(profilingProductionReportSource).toContain("'mud'")
    expect(profilingProductionReportSource).toContain("'halo'")
    expect(profilingProductionReportSource).toContain("'thin-gap'")
    expect(profilingProductionReportSource).toContain("'edge-bleed'")
    expect(profilingProductionReportSource).toContain("'scale-mismatch'")
    expect(profilingProductionReportSource).toContain("'false-curvature'")
    expect(profilingProductionReportSource).toContain("return ['noise', 'false-curvature', 'scale-mismatch']")
    expect(profilingProductionReportSource).toContain("return ['noise', 'edge-bleed']")
    expect(profilingProductionReportSource).toContain("labels.add('mud')")
    expect(profilingProductionReportSource).toContain("labels.add('thin-gap')")
    expect(profilingScreenshotMetricsSource).toContain('export async function analyzeScreenshotQuality')
    expect(profilingScreenshotMetricsSource).toContain('patternNoiseScore')
    expect(profilingScreenshotMetricsSource).toContain('stripeScore')
    expect(profilingScreenshotMetricsSource).toContain('horizontalStripeScore')
    expect(profilingScreenshotMetricsSource).toContain('verticalStripeScore')
    expect(profilingProductionReportSource).toContain('export async function writeProductionQualityReports')
    expect(profilingProductionReportSource).toContain('AO Production Screenshot Quality Summary')
    expect(profilingProductionReportSource).toContain('Pattern/noise ↓')
    expect(profilingProductionReportSource).toContain('Metric basis:')
  })

  it('records VBAO internal pass timing status without treating skipped passes as zero cost', () => {
    expect(benchmarkSource).toContain('function createVbaoPassTimingRows')
    expect(benchmarkSource).toContain("'skipped'")
    expect(benchmarkSource).toContain('gpuMs: null')
    expect(benchmarkSource).toContain('passTimings: createVbaoPassTimingRows')
    expect(profilingProductionReportSource).toContain('AO Production Pass Timing Status')
    expect(profilingProductionReportSource).toContain('Skipped passes are not zero-cost passes')
  })

  it('ships product-first quality presets without platform labels', () => {
    expect(source).toContain('VBAO_QUALITY_TIERS')
    expect(source).toContain('slices: options.slices ?? quality?.slices ?? fallback.slices')
    expect(source).toContain('samples: options.samples ?? quality?.samples ?? fallback.samples')
    expect(source).toContain(
      'resolutionScale: options.resolutionScale ?? quality?.resolutionScale ?? fallback.resolutionScale',
    )
    expect(source).not.toContain('slices: options.slices ?? fallback.slices')
    expect(source).not.toContain('samples: options.samples ?? fallback.samples')
    expect(optionsSource).toContain(
      'performance: { resolutionScale: 1.0, slices: 2, samples: 4, sectors: 32 }',
    )
    expect(optionsSource).not.toContain('mobile: {')
    expect(optionsSource).not.toContain('fast: {')
    expect(optionsSource).toContain(
      'balanced: { resolutionScale: 1.0, slices: 3, samples: 6, sectors: 32 }',
    )
    expect(optionsSource).toContain(
      'quality: { resolutionScale: 1.0, slices: 4, samples: 8, sectors: 32 }',
    )
    expect(optionsSource).toContain(
      'ultra: { resolutionScale: 1.0, slices: 4, samples: 10, sectors: 32 }',
    )
    expect(optionsSource).toContain('slices: { min: 1, max: 4 }')
    expect(optionsSource).toContain('samples: { min: 2, max: 16 }')
  })

  it('keeps Museum VBAO thickness in the product ratio band instead of the slabby stress value', () => {
    expect(museumSource).toContain('baseline: { radius: 0.35, thickness: 0.09 }')
    expect(museumSource).not.toContain('baseline: { radius: 0.35, thickness: 0.28 }')
  })

  it('wires Museum VBAO through the single product node, not public reconstruction passes', () => {
    expect(museumSource).not.toContain('VBAOHalfResCleanupNode')
    expect(museumSource).not.toContain('VBAOFullResPolishNode')
    expect(museumSource).not.toContain('VBAOResolveNode')
    expect(museumSource.match(/new VBAONode/g)?.length).toBe(1)
    expect(museumSource).toContain('const createVbaoPipelines = (fullResolution: boolean) =>')
    expect(museumSource).not.toContain('const vbaoHalfNode = new VBAONode')
    expect(museumSource).not.toContain('const vbaoFullNode = new VBAONode')
    expect(museumSource).toContain('resolutionScale: fullResolution ? 1.0 : 0.5')
    expect(museumSource).toContain('softness: 0.45')
    expect(museumSource).toContain('const activeVbaoPipelines = (fullResolutionVbao: boolean) =>')
    expect(museumSource).toContain('disposeActiveVbao()')
    expect(museumSource).not.toContain('pipelines.vbaoFull')
    expect(museumSource).not.toContain('pipelines.vbaoProduct')
    expect(museumSource).not.toContain('const vbaoFullRaw =')
    expect(museumSource).not.toContain('const vbaoHalfRaw =')
    expect(museumSource).not.toContain('const vbaoHalfCleanupNode = new VBAOHalfResCleanupNode')
    expect(museumSource).not.toContain('const vbaoHalfResolvedClean = new VBAOResolveNode')
    expect(museumSource).not.toContain('const vbaoFullPolishNode = new VBAOFullResPolishNode')
    expect(museumSource).not.toContain('const vbaoDenoised = denoise')
    expect(museumSource).not.toContain('vbaoNode.resolutionScale = 1.0')
    expect(museumSource).toContain('<span>Product output</span>')
    expect(museumSource).not.toContain('Extra denoise')
  })

  it('keeps Museum benchmarks explicit about VBAO full-res versus half-res rows', () => {
    expect(museumSource).not.toContain('high-sample')
    expect(benchmarkSource).toContain('const vbaoResolutionStates = [false, true]')
    expect(benchmarkSource).toContain('await setFullResolutionVbao(page, fullResolutionVbao)')
    expect(benchmarkSource).toContain('latest.fullResolutionVbao === fullResolutionVbao')
    expect(benchmarkSource).toContain("fullResolutionVbao ? 'full-res' : 'half-res'")
  })
})
