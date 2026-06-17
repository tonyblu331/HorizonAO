import { describe, expect, it } from 'vitest'
import source from '../VBAONode.ts?raw'
import noiseSource from '../vbaoNoise.ts?raw'
import samplingSource from '../vbaoSampling.ts?raw'
import kernelPrimitivesSource from '../vbaoKernelPrimitives.ts?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'
import bilateralWeightSource from '../vbaoBilateralWeight.ts?raw'
import effectPassSource from '../VBAOEffectPass.ts?raw'
import fullResPolishSource from '../VBAOFullResPolishNode.ts?raw'
import halfResCleanupSource from '../VBAOHalfResCleanupNode.ts?raw'
import resolveSource from '../VBAOResolveNode.ts?raw'
import velocityTemporalSource from '../VBAOVelocityTemporalNode.ts?raw'
import receiverConfidenceSource from '../VBAOReceiverConfidenceNode.ts?raw'
import museumSource from '../../../../apps/demo/src/scenes/MuseumScene.tsx?raw'
import labSource from '../../../../apps/demo/src/scenes/VbaoLabScene.tsx?raw'
import aoPipelinesSource from '../../../../apps/demo/src/scenes/aoPipelines.ts?raw'
import aoCompareSource from '../../../../apps/demo/e2e/ao-compare.spec.ts?raw'
import benchmarkSource from '../../../../apps/demo/scripts/collect-ao-benchmark.mjs?raw'
import temporalGateSource from '../../../../apps/demo/scripts/verify-vbao-temporal-gate.mjs?raw'
import shaderInspectionSource from '../../../../apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs?raw'
import gpuReadbackSource from '../../../../apps/demo/scripts/collect-ao-gpu-readback-baseline.mjs?raw'
import profilingBenchmarkHarnessSource from '../../../../apps/demo/scripts/profiling/benchmarkHarness.mjs?raw'
import profilingProductionReportSource from '../../../../apps/demo/scripts/profiling/productionReport.mjs?raw'
import profilingScreenshotMetricsSource from '../../../../apps/demo/scripts/profiling/screenshotMetrics.mjs?raw'
import benchmarkNoiseSource from '../../../../apps/demo/src/scenes/vbaoBenchmarkNoise.ts?raw'
import computeCandidateSource from '../../../../apps/demo/src/scenes/vbaoComputeCandidate.ts?raw'
import readmeSource from '../../../../README.md?raw'

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
    expect(source).not.toContain('GT-VBAO++')
    expect(source).not.toContain('GT-VBAO++ production')
    expect(source).not.toContain('VBAO Raw GT-VBAO++')
    expect(optionsSource).not.toContain('1 cycle on WebGPU')
    expect(optionsSource).not.toContain('~12 ALU ops')
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

  it('keeps directional visibility reference out of public options and exports', () => {
    expect(indexSource).not.toContain('reconstructDirectionalVisibility')
    expect(indexSource).not.toContain('DirectionalVisibility')
    expect(indexSource).not.toContain('bentNormal')
    expect(indexSource).not.toContain('visibilityBuckets')

    expect(optionsSource).not.toContain('directional')
    expect(optionsSource).not.toContain('bentNormal')
    expect(optionsSource).not.toContain('visibilityBuckets')
  })

  it('keeps README product claims scalar, release-blocked, and slice-weight truthful', () => {
    expect(readmeSource).toContain('The current release-readiness verdict is **incomplete**, not production-ready.')
    expect(readmeSource).toContain('AO scalar only in v1')
    expect(readmeSource).toContain('no GI, no bent normals, no denoise without evidence')
    expect(readmeSource).toContain('Final accessibility is accumulated with projected-normal slice weights')
    expect(readmeSource).not.toContain('Almost path traced')
    expect(readmeSource).not.toContain('public temporal')
    expect(readmeSource).not.toContain('public directional')
  })

  it('uses a non-interpolated phase atlas noise texture to avoid visible tiled ramps', () => {
    expect(noiseSource).toContain('NearestFilter')
    expect(noiseSource).toContain('NoColorSpace')
    expect(noiseSource).toContain('VBAO_NOISE_TILE_SIZE = 64')
    expect(samplingSource).toContain('VBAO_PHASE_ATLAS_PHASES = 64')
    expect(samplingSource).toContain('VBAO_PHASE_ATLAS_COLUMNS = 8')
    expect(samplingSource).toContain(
      'VBAO_PHASE_ATLAS_ROWS = VBAO_PHASE_ATLAS_PHASES / VBAO_PHASE_ATLAS_COLUMNS',
    )
    expect(samplingSource).toContain('VBAO_PHASE_STRIDE = 16')
    expect(noiseSource).toContain('const atlasWidth = n * VBAO_PHASE_ATLAS_COLUMNS')
    expect(noiseSource).toContain('const atlasHeight = n * VBAO_PHASE_ATLAS_ROWS')
    expect(kernelPrimitivesSource).toMatch(
      /const phaseRaw = float\(slice\)[\s\S]*?\.mul\(float\(VBAO_PHASE_STRIDE\)\)[\s\S]*?\.add\(float\(sample\)\)/,
    )
    expect(kernelPrimitivesSource).not.toContain('float(slice).mul(float(8)).add(float(sample))')
    expect(noiseSource).toContain('tex.magFilter = NearestFilter')
    expect(noiseSource).toContain('tex.minFilter = NearestFilter')
    expect(noiseSource).toContain('tex.generateMipmaps = false')
    expect(noiseSource).toContain('tex.colorSpace = NoColorSpace')
    expect(samplingSource).not.toContain('VBAO_NOISE_SOURCE_CANDIDATES')
    expect(samplingSource).not.toContain("'ign'")
    expect(samplingSource).not.toContain("'static-stbn'")
    expect(samplingSource).not.toContain("'fast-like'")
    expect(source).not.toContain('VbaoNoiseSource')
    expect(source).not.toContain('internalOptions.benchmark?.noiseSource')
    expect(source).toContain('benchmark?: { readonly noiseTexture?: DataTexture }')
    expect(source).toContain('internalOptions.benchmark?.noiseTexture ?? getSharedVbaoNoiseTexture()')
    expect(benchmarkNoiseSource).toContain('VBAO_BENCHMARK_NOISE_SOURCES')
    expect(benchmarkNoiseSource).toContain('createVbaoBenchmarkNoiseTexture')
    expect(benchmarkNoiseSource).toContain("'ign'")
    expect(benchmarkNoiseSource).toContain("'ign-128'")
    expect(benchmarkNoiseSource).toContain("'static-stbn'")
    expect(benchmarkNoiseSource).toContain("'static-stbn-128'")
    expect(benchmarkNoiseSource).toContain("'phase-atlas-stable-hash-128'")
    expect(benchmarkNoiseSource).toContain("'hilbert-r2-lut'")
    expect(benchmarkNoiseSource).toContain("'fast-like'")
    expect(source).not.toContain('__benchmarkNoiseSource')
    expect(optionsSource).not.toContain('__benchmarkNoiseSource')
  })

  it('hoists phase atlas pixel coordinates out of the per-sample noise lookup', () => {
    expect(kernelPrimitivesSource).toContain(
      'const vbaoRawNoisePixel = floor(uvNode.mul(sourceResolution))',
    )
    expect(kernelPrimitivesSource).toContain(".toVar('vbaoLocalPixel')")
    expect(kernelPrimitivesSource).not.toContain("toVar('vbaoRawNoisePixel')")
    expect(kernelPrimitivesSource).toMatch(
      /const vbaoLocalPixel = vbaoRawNoisePixel[\s\S]*?return \(slice: any, sample: any\) => \{/,
    )
    expect(kernelPrimitivesSource).toContain('const atlasPixel = vbaoLocalPixel.add')
    expect(source).toContain('const sampleNoisePhase = createVbaoNoisePhaseSampler({')
    expect(source).not.toContain("toVar('vbaoPixel')")
    expect(source).not.toContain('const pixel = floor(uvNode.mul(this.resolution))')
    expect(source).not.toContain('const localPixel = pixel.sub')
  })

  it('keeps half-resolution raw sampling in source texture coordinates', () => {
    expect(source).toContain('readonly sourceResolution = uniform(new Vector2())')
    expect(source).toMatch(
      /this\.sourceResolution\.value\.set\(width, height\)[\s\S]*?this\.resolution\.value\.set\(scaledWidth, scaledHeight\)/,
    )
    expect(source).toContain('sourceResolution: this.sourceResolution')
    expect(source).toContain(
      "const safeTexel = vec2(0.5).div(this.sourceResolution).toVar('vbaoSafeTexel')",
    )
    expect(source).not.toContain(
      "const safeTexel = vec2(0.5).div(this.resolution).toVar('vbaoSafeTexel')",
    )
  })

  it('shares the default phase atlas instead of allocating one texture per VBAONode', () => {
    expect(noiseSource).toContain('let sharedVbaoNoiseTexture: DataTexture | undefined')
    expect(noiseSource).toContain('export function getSharedVbaoNoiseTexture')
    expect(noiseSource).toContain('sharedVbaoNoiseTexture ??= createVbaoNoiseTexture()')
    expect(source).toContain('getSharedVbaoNoiseTexture()')
    expect(source).not.toContain('function generateSamplingNoise()')
    expect(source).not.toContain('this.noiseTexture.dispose()')
  })

  it('stores raw receiver estimate in half-float and nearest-filters reconstruction sources', () => {
    expect(source).toContain('HalfFloatType')
    expect(source).toContain('type: HalfFloatType')
    expect(source).toContain('private readonly rawEstimateTarget = new RenderTarget')
    expect(source).toContain("this.rawEstimateTarget.texture.name = 'VBAO.Raw'")
    expect(source).toContain('this.rawEstimateTarget.texture.magFilter = NearestFilter')
    expect(source).toContain('this.rawEstimateTarget.texture.minFilter = NearestFilter')
    expect(source).toContain('this.rawEstimateTarget.texture.generateMipmaps = false')
    expect(source).toContain('this.rawEstimateTarget.texture.colorSpace = NoColorSpace')
    expect(source).toContain('passTexture(this as never, this.rawEstimateTarget.texture)')
    // Resolve + cleanup share fullscreen-pass plumbing (render target, NearestFilter,
    // renderer-state save/restore) via VBAOEffectPass instead of owning it per node.
    expect(halfResCleanupSource).toContain('extends VBAOEffectPass')
    expect(halfResCleanupSource).not.toContain('new RenderTarget(')
    expect(halfResCleanupSource).not.toContain('RendererUtils')
    expect(resolveSource).toContain('extends VBAOEffectPass')
    expect(resolveSource).not.toContain('new RenderTarget(')
    expect(resolveSource).not.toContain('RendererUtils')
    expect(effectPassSource).toContain('NearestFilter')
    expect(effectPassSource).toContain('this.renderTarget.texture.magFilter = NearestFilter')
    expect(effectPassSource).toContain('this.renderTarget.texture.minFilter = NearestFilter')
  })

  it('maps both marched sides into one signed hemislice mask domain', () => {
    expect(source).toContain('const sampleDir = S_i.mul(sideSign)')
    expect(source).not.toContain('const S_side = S_i.mul(sideSign)')
    expect(source).not.toContain('dot(D_front, S_side)')
    expect(source).not.toContain('dot(D_back, S_side)')
    expect(source).toMatch(
      /const uFront = \(vbaoCosineMeasureNoAtan as any\)\([\s\S]*?D_front,[\s\S]*?V,[\s\S]*?S_i,[\s\S]*?sinGamma,[\s\S]*?cosGamma,[\s\S]*?\)/,
    )
    expect(source).toMatch(
      /const uBack = \(vbaoCosineMeasureNoAtan as any\)\([\s\S]*?D_back,[\s\S]*?V,[\s\S]*?S_i,[\s\S]*?sinGamma,[\s\S]*?cosGamma,[\s\S]*?\)/,
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
    expect(optionsSource).toContain('VBAO_CONTACT_THICKNESS_RADIUS_RATIO')
    expect(source).toMatch(
      /const maxThickness = this\.radius[\s\S]*?\.mul\(float\(VBAO_CONTACT_THICKNESS_RADIUS_RATIO\)\)[\s\S]*?\.toVar\('vbaoMaxThickness'\)[\s\S]*?const maxValidRadius2 = maxValidRadius\.mul\(maxValidRadius\)\.toVar\('vbaoMaxValidRadius2'\)[\s\S]*?\(Loop as any\)\(\s*\{ start: int\(0\), end: sliceLoopEnd/,
    )
    expect(source).toContain('sampleDist2.greaterThan(float(1e-8))')
    expect(source).toContain('sampleDist2.lessThanEqual(maxValidRadius2)')
    expect(source).not.toContain('sampleDist2.lessThanEqual(maxValidRadius.mul(maxValidRadius))')
    expect(source).toContain('sampleAlong.greaterThan(float(0))')
    expect(source).toMatch(
      /If\(\s*occludedMask\.notEqual\(bitNot\(uint\(0\)\)\),\s*\(\) => \{[\s\S]*?const validSampleMask = \(sampleValid as any\)\.select\(pointSampleMask, uint\(0\)\)/,
    )
    expect(source).toContain(
      "const safeTexel = vec2(0.5).div(this.sourceResolution).toVar('vbaoSafeTexel')",
    )
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
    expect(optionsSource).toContain('VBAO_CONTACT_THICKNESS_RADIUS_RATIO')
    expect(optionsSource).toContain('VBAO_NEAR_SAMPLE_THICKNESS_RATIO')
    expect(source).toContain('float(VBAO_CONTACT_THICKNESS_RADIUS_RATIO)')
    expect(source).toContain('float(VBAO_NEAR_SAMPLE_THICKNESS_RATIO)')
    expect(source).toMatch(
      /const baseThickness = min\([\s\S]*?this\.thickness,[\s\S]*?maxThickness[\s\S]*?\)\.toVar\('vbaoBaseThickness'\)/,
    )
    expect(source).toMatch(
      /const effectiveThickness = min\([\s\S]*?baseThickness,[\s\S]*?sampleDist\.mul\(float\(VBAO_NEAR_SAMPLE_THICKNESS_RATIO\)\),[\s\S]*?\)\.toVar\('effectiveThickness'\)/,
    )
    expect(source).not.toContain(
      "const effectiveThickness = min(this.thickness, sampleDist.mul(float(VBAO_NEAR_SAMPLE_THICKNESS_RATIO))).toVar('effectiveThickness')",
    )
    expect(source).toContain('const backDelta = samplePos')
    expect(source).toContain("const D_back = backDelta.div(backDist).toVar('D_back')")
    expect(source).not.toContain('samplePos.sub(sampleViewDir.mul(this.thickness)).sub(P)')
  })

  it('weights post-CDF slice accessibility by projected-normal length', () => {
    expect(source).toContain(
      "const B_i = (normalize(cross(S_i as any, V as any) as any) as any).toVar('B_i')",
    )
    expect(source).toContain('const NprojRaw = N.sub(B_i.mul(dot(N, B_i))).toVar')
    expect(source).toContain(
      'const NprojLen = sqrt(max(dot(NprojRaw, NprojRaw), float(1e-8))).toVar',
    )
    expect(source).toContain('const Nproj = NprojRaw.div(NprojLen).toVar')
    expect(source).toContain('const sinGamma = dot(Nproj, S_i).toVar')
    expect(source).toContain('const cosGamma = max(dot(Nproj, V), float(1e-5)).toVar')
    expect(source).toContain('weightedAccessibility.addAssign(sliceAccessibility.mul(NprojLen))')
    expect(source).toContain('weightSum.addAssign(NprojLen)')
    expect(source).not.toContain('weightSum.addAssign(float(1))')
  })

  it('reduces cosine-measure sector masks by cosine-weighted resolve without a second cosine loop', () => {
    expect(source).toContain("(cosineWeightedResolveFn as any)(occludedMask).toVar('sliceAccessibility')")
    expect(source).not.toContain('countOneBits(occludedMask)')
    // Diagnostic resolve site (VBAOReceiverConfidenceNode) must use the same Fn — locks W-1.
    expect(receiverConfidenceSource).toContain(
      "(cosineWeightedResolveFn as any)(occludedMask).toVar('vbaoReceiverConfidenceSliceAccessibility')",
    )
    expect(receiverConfidenceSource).not.toContain('countOneBits(occludedMask)')
    expect(kernelPrimitivesSource).toContain('export const vbaoCosineWeightedResolveFn = (Fn as any)')
    expect(kernelPrimitivesSource).toContain('bitAnd(shiftRight(mask, uint(k)), uint(1))')
    expect(kernelPrimitivesSource).toContain('return float(1).sub(occludedWeight.div(float(COSINE_WEIGHT_TOTAL)))')
    expect(kernelPrimitivesSource).toContain('export const vbaoIntervalMaskStochasticFn = (Fn as any)')
    expect(kernelPrimitivesSource).toContain(
      "const intervalSectors = u1.sub(u0).mul(float(SECTOR_COUNT)).toVar('vbaoIntervalSectors')",
    )
    expect(kernelPrimitivesSource).toContain('vbaoThinSectorMask')
    expect(kernelPrimitivesSource).toContain(
      'const thinContribution = (xi.lessThan(intervalSectors) as any).select',
    )
    expect(kernelPrimitivesSource).toContain('result.assign(thinContribution)')
    expect(source).toMatch(
      /const pointSampleMask = \(intervalMaskStochasticFn as any\)\([\s\S]*?u0,[\s\S]*?u1,[\s\S]*?subsectorNoise,[\s\S]*?\)/,
    )
    expect(source).toContain(
      "const subsectorNoise = sampleNoiseTexel.z.toVar('vbaoSubsectorNoise')",
    )
    expect(source).not.toContain('const numerator = float(0).toVar')
    expect(source).not.toContain('const denominator = float(0).toVar')
    expect(source).not.toContain('cosTheta')
    expect(source).not.toContain('sinTheta')
  })

  it('returns one receiver product AO node with lazy internal reconstruction elision', () => {
    expect(source).toContain('private resolveNode?: VBAOResolveNode')
    expect(source).toContain('private halfCleanupNode?: VBAOHalfResCleanupNode')
    expect(source).toContain('private fullPolishNode?: VBAOFullResPolishNode')
    expect(source).toContain('private rebuildReceiverProductGraph(): void')
    expect(source).toContain('private receiverProductGraphCreated = false')
    expect(source).toContain('private currentReceiverProductGraphKey(): string')
    expect(source).toContain('private assertReceiverProductGraphStable(): void')
    expect(source).toContain('private productAoTextureNode?: TextureNode')
    expect(source).toContain('private readonly rawEstimateTextureNode: TextureNode')
    expect(source).toContain('if (this.resolutionScale < 0.99)')
    expect(source).toContain('const cleanupStrength = this.lowResolutionCleanupStrength()')
    expect(source).toContain('const polishStrength = this.fullResolutionPolishStrength()')
    expect(source).toContain('softness and resolutionScale affect the pass graph')
    expect(source).toMatch(
      /this\.receiverProductGraphCreated &&[\s\S]*next\.softness !== this\.softness\.value[\s\S]*next\.resolutionScale !== this\.resolutionScale/,
    )
    expect(source).toMatch(
      /getTextureNode\(\): TextureNode \{\s*this\.assertReceiverProductGraphStable\(\)\s*this\.rebuildReceiverProductGraph\(\)[\s\S]*this\.receiverProductGraphCreated = true/,
    )
    expect(source).toMatch(
      /setSize\(width: number, height: number\): void \{\s*this\.assertReceiverProductGraphStable\(\)/,
    )
    expect(source).not.toContain('private readonly resolvedTextureNode')
    expect(source).not.toContain('private readonly resolveNode: VBAOResolveNode')
    expect(source).not.toContain('this.resolvedTextureNode = this.resolveNode.getTextureNode()')
    expect(source).not.toContain('private outputTextureNode?: TextureNode')
    expect(source).not.toContain('private outputGraphCreated = false')
    expect(source).not.toContain('private currentOutputGraphKey(): string')
    expect(source).toMatch(
      /getTextureNode\(\): TextureNode \{\s*this\.assertReceiverProductGraphStable\(\)\s*this\.rebuildReceiverProductGraph\(\)\s*this\.receiverProductGraphCreated = true\s*return this\.productAoTextureNode \?\? this\.rawEstimateTextureNode\s*\}/,
    )
    expect(source).toMatch(
      /getRawTextureNode\(\): TextureNode \{\s*return this\.rawEstimateTextureNode\s*\}/,
    )
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

  it('keeps default VBAO temporal-free while allowing host phase animation only', () => {
    expect(source).toContain("type VbaoInternalTemporalMode = 'off' | 'host'")
    expect(source).toContain("readonly temporalMode?: VbaoInternalTemporalMode | 'velocity-internal'")
    expect(source).toContain('function resolveInternalTemporalMode(')
    expect(source).toContain("return mode === 'host' ? 'host' : 'off'")
    expect(source).toContain('this.temporalMode = resolveInternalTemporalMode(internalOptions.temporalMode)')
    expect(source).toContain('private readonly temporalPhaseOffset = uniform(0)')
    expect(source).toContain("if (this.temporalMode === 'host')")
    expect(source).toContain(
      '(this.temporalPhaseOffset.value + 1) % VBAO_PHASE_ATLAS_PHASES',
    )
    expect(source).toContain('temporalPhaseOffset: this.temporalPhaseOffset')
    expect(kernelPrimitivesSource).toMatch(
      /const phaseRaw = float\(slice\)[\s\S]*?\.add\(float\(sample\)\)[\s\S]*?\.add\(phaseOffset\)/,
    )
    expect(source).not.toContain("if (this.temporalMode === 'internal')")
    expect(source).not.toContain('getOrCreateTemporalAccumulationNode')
    expect(source).not.toContain('VBAOTemporalAccumulationNode')
    expect(source).not.toContain('previousViewProjection')
    expect(optionsSource).not.toContain('temporal')
    expect(indexSource).not.toContain('temporal')
    expect(indexSource).not.toContain('VBAOTemporalAccumulationNode')
    expect(museumSource).toContain("type VbaoTemporalMode = 'off' | 'host' | 'velocity-internal'")
    expect(museumSource).toContain('function getRequestedVbaoTemporalMode()')
    expect(museumSource).toContain("if (requested === 'velocity-internal') return 'velocity-internal'")
    expect(museumSource).toContain("return requested === 'host' ? 'host' : 'off'")
    expect(museumSource).toContain("prePass.getPreviousTextureNode('depth')")
    expect(museumSource).toContain("prePass.getPreviousTextureNode('output')")
    expect(museumSource).toContain('new VBAOVelocityTemporalNode(')
    expect(museumSource).toContain('vbaoTemporalMode: usesVbao ? vbaoTemporalMode : ')
    expect(museumSource).toContain('temporalMode: vbaoTemporalMode')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_TEMPORAL_MODE')
    expect(benchmarkSource).toContain('AO_BENCHMARK_OUTPUT_JSON')
    expect(benchmarkSource).toContain('AO_BENCHMARK_OUTPUT_MD')
    expect(benchmarkSource).toContain('resolveRepoOutputPath')
    expect(benchmarkSource).toContain('AO_BENCHMARK_MODES')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VIEWS')
    expect(benchmarkSource).toContain('AO_BENCHMARK_DENOISE_STATES')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_RESOLUTION_STATES')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_HOST_TAA')
    expect(benchmarkSource).toContain("if (vbaoTemporalMode !== 'off')")
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoTemporalMode', vbaoTemporalMode)")
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoHostTaa', 'traa')")
    expect(benchmarkSource).toContain('latest.vbaoTemporalMode === temporalMode')
    expect(benchmarkSource).toContain('latest.vbaoHostTaaMode === hostTaaMode')
    expect(benchmarkSource).toContain("temporalMode: mode === 'vbao' ? vbaoTemporalMode : 'n/a'")
    expect(benchmarkSource).toContain('hostTaaMode: mode === ')
    expect(benchmarkSource).toContain(
      '${vbaoSampleMode}${temporalLabel}${hostTaaLabel}${cleanupLabel}${gateReceiverConfidenceLabel}${softnessLabel}-${vbaoResolutionLabel}',
    )
    expect(museumSource).toContain("type VbaoHostTaaMode = 'off' | 'traa'")
    expect(museumSource).toContain('function getRequestedVbaoHostTaaMode()')
    expect(museumSource).toContain("return requested === 'traa' ? 'traa' : 'off'")
    expect(museumSource).toContain('vbaoHostTaaMode: usesVbao ? vbaoHostTaaMode : ')
    expect(museumSource).toContain('import { traa }')
    expect(museumSource).toContain("vbaoTemporalMode === 'host' && vbaoHostTaaMode === 'traa'")
    expect(temporalGateSource).toContain('VBAO_TEMPORAL_HOST_TAA_JSON')
    expect(temporalGateSource).toContain('VBAO_TEMPORAL_VELOCITY_JSON')
    expect(temporalGateSource).toContain('VBAO_TEMPORAL_MOTION_JSON')
    expect(temporalGateSource).toContain("const MOTION_EVIDENCE_KINDS = new Set(['camera-motion', 'object-motion', 'disocclusion'])")
    expect(temporalGateSource).toContain('const REQUIRED_MOTION_EVIDENCE_KINDS = [...MOTION_EVIDENCE_KINDS]')
    expect(temporalGateSource).toContain('function hasMotionEvidenceKind(row)')
    expect(temporalGateSource).toContain('function hasMotionEvidenceSource(row)')
    expect(temporalGateSource).toContain('hostTaaEvidence')
    expect(temporalGateSource).not.toContain('internalPrototypeAllowed')
    expect(temporalGateSource).toContain('hostEvidenceComplete &&')
    expect(temporalGateSource).toContain('sameCostAlternativeEvidence &&')
    expect(temporalGateSource).toContain('internalTemporalAllowed: internalTemporalPassesPromotion')
    expect(temporalGateSource).not.toContain("'prototype-only'")
    expect(temporalGateSource).toContain('materialPatternWin')
    expect(temporalGateSource).toContain('stripeRegression')
    expect(temporalGateSource).toContain('VBAO_TEMPORAL_ALTERNATIVE_JSON')
    expect(temporalGateSource).toContain('sameCostAlternativeEvidence')
    expect(temporalGateSource).toContain('async function explicitEvidencePathsAreTrackedAndClean(reports)')
    expect(temporalGateSource).toContain("gitSucceeds(['ls-files', '--error-unmatch', '--', gitPath])")
    expect(temporalGateSource).toContain("gitSucceeds(['diff', '--quiet', '--', gitPath])")
    expect(temporalGateSource).toContain("gitSucceeds(['diff', '--cached', '--quiet', '--', gitPath])")
    expect(temporalGateSource).toContain('.map((row) => row.screenshotPath)')
    expect(temporalGateSource).toContain('.map(resolveEvidencePath)')
    expect(temporalGateSource).toContain('cleanCheckout: cleanCheckoutReproducible')
    expect(temporalGateSource).toContain('motionDisocclusionEvidence')
    expect(temporalGateSource).toContain('hasMotionEvidenceKind(row)')
    expect(temporalGateSource).toContain('hasMotionEvidenceSource(row)')
    expect(temporalGateSource).toContain('function motionEvidenceKey(row)')
    expect(temporalGateSource).toContain('function motionEvidenceKindKey(row, kind = row.motionEvidenceKind)')
    expect(temporalGateSource).toContain('const motionByKindKey = new Map')
    expect(temporalGateSource).toContain('const missingMotionRows = productOffRows')
    expect(temporalGateSource).toContain('!motionByKindKey.has(motionEvidenceKindKey(row, kind))')
    expect(temporalGateSource).toContain('const observedMotionEvidenceKinds =')
    expect(temporalGateSource).toContain('const missingMotionEvidenceKinds = REQUIRED_MOTION_EVIDENCE_KINDS.filter')
    expect(temporalGateSource).toContain('const motionEvidenceCompleteForReview =')
    expect(temporalGateSource).toContain('internalTemporalEvidence')
    expect(temporalGateSource).toContain('internalTemporalPassesPromotion')
    expect(temporalGateSource).toContain('const velocityTemporalEvidence =')
    expect(temporalGateSource).toContain('const internalTemporalEvidence = velocityTemporalEvidence')
    expect(temporalGateSource).toContain('const internalTemporalPassesPromotion =')
    expect(temporalGateSource).toContain('velocityTemporalEvidence &&\n  resetEvidenceComplete &&\n  motionDisocclusionEvidence')
    expect(benchmarkSource).toContain('Private VBAOVelocityTemporalNode wrapped ${vbaoBaseProductOutputContract}')
    expect(museumSource).toContain('type VBAOVelocityTemporalDiagnostics')
    expect(museumSource).toContain('getVbaoTemporalDiagnostics')
    expect(museumSource).toContain('vbaoTemporalDiagnostics:')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_MOTION_EVIDENCE_KIND')
    expect(benchmarkSource).toContain("motionEvidenceSource")
    expect(temporalGateSource).toContain('function temporalDiagnosticsComplete(row)')
    expect(temporalGateSource).toContain("diagnostics.renderTargetName === 'VBAO.VelocityTemporalDiagnostics'")
    expect(temporalGateSource).toContain('missingVelocityDiagnosticsRows')
    expect(temporalGateSource).toContain(
      'const hostTaaLaneComplete =\n  hostEvidenceComplete && hostTaaEvidence && sameCostAlternativeEvidence',
    )
    expect(temporalGateSource).toContain(
      'const velocityLaneComplete =\n  hostEvidenceComplete &&\n  velocityTemporalEvidence &&\n  resetEvidenceComplete &&\n  motionEvidenceCompleteForReview &&\n  sameCostAlternativeEvidence',
    )
    expect(temporalGateSource).toContain('createExistingScreenshotPathSet')
    expect(temporalGateSource).toContain('qualityMetricsComplete')
    expect(temporalGateSource).toContain('passTimingComplete')
    expect(temporalGateSource).toContain('BLOCKING_FAILURE_LABELS')
    expect(temporalGateSource).toContain('hasInternalBlockingFailureLabels')
    expect(temporalGateSource).toContain("rawPass?.status !== 'measured' || !finiteNumber(rawPass.gpuMs)")
    expect(temporalGateSource).toContain('Velocity-backed internal temporal evidence:')
    expect(temporalGateSource).toContain('Velocity motion evidence complete:')
    expect(temporalGateSource).toContain('Velocity motion/disocclusion gate clean:')
    expect(temporalGateSource).toContain('VBAO_TEMPORAL_REQUIRE_CANDIDATE')
    expect(temporalGateSource).toContain('process.exitCode = 1')
    expect(temporalGateSource).toContain('Host TAA/TRAA evidence:')
    expect(temporalGateSource).toContain('Same-cost non-temporal alternative evidence:')
    expect(temporalGateSource).toContain('async function isTrackedCleanGitInput(filePath)')
    expect(temporalGateSource).toContain("gitSucceeds(['ls-files', '--error-unmatch', '--', gitPath])")
    expect(temporalGateSource).toContain("gitSucceeds(['diff', '--quiet', '--', gitPath])")
    expect(temporalGateSource).toContain("gitSucceeds(['diff', '--cached', '--quiet', '--', gitPath])")
    expect(temporalGateSource).toContain('cleanCheckout: cleanCheckoutReproducible')
    expect(temporalGateSource).not.toContain(
      'Default *-latest benchmark inputs are local generated artifacts ignored by git',
    )
  })

  it('keeps removed internal temporal accumulation out of core exports and internals', () => {
    expect(source).not.toContain('temporalAccumulationNode')
    expect(source).not.toContain('private getInternalTemporalDiagnostics()')
    expect(indexSource).not.toContain('VBAOTemporalAccumulationNode')
    expect(indexSource).not.toContain('VBAOVelocityTemporalNode')
    expect(indexSource).not.toContain('getInternalTemporalDiagnostics')
    expect(optionsSource).not.toContain('historyWeight')
    expect(optionsSource).not.toContain('temporal')
  })

  it('keeps velocity-backed temporal private, velocity-driven, and guide-history-owned by the host', () => {
    expect(velocityTemporalSource).toContain('export class VBAOVelocityTemporalNode')
    expect(velocityTemporalSource).toContain('readonly velocityNode: SampleableNode')
    expect(velocityTemporalSource).toContain('readonly previousDepthNode: SampleableNode')
    expect(velocityTemporalSource).toContain('readonly previousNormalNode: SampleableNode')
    expect(velocityTemporalSource).toContain('.mul(vec2(0.5, -0.5))')
    expect(velocityTemporalSource).toContain('const historyUv = uvNode.sub(velocityUv)')
    expect(velocityTemporalSource).toContain('this.resetHistory.lessThan(float(0.5))')
    expect(velocityTemporalSource).toContain('const clampedHistoryAo = clamp(historyAo, minAo, maxAo)')
    expect(velocityTemporalSource).toContain('VBAOVelocityTemporalDiagnostics')
    expect(velocityTemporalSource).toContain("renderTargetName: this.diagnosticsRenderTarget.texture.name")
    expect(velocityTemporalSource).toContain("reset: 1")
    expect(velocityTemporalSource).toContain("viewport: 2")
    expect(velocityTemporalSource).toContain("depth: 4")
    expect(velocityTemporalSource).toContain("normal: 8")
    expect(velocityTemporalSource).toContain("velocity: 16")
    expect(velocityTemporalSource).toContain("clampHistoryRange: 32")
    expect(velocityTemporalSource).toContain('reasonBits.addAssign(float(32))')
    expect(velocityTemporalSource).toContain('renderer.copyTextureToTexture')
    expect(velocityTemporalSource).not.toContain('previousViewProjection')
    expect(velocityTemporalSource).not.toContain('previousDepthRenderTarget')
    expect(velocityTemporalSource).not.toContain('previousNormalRenderTarget')
  })

  it('lets the Lab benchmark capture raw and product VBAO outputs explicitly', () => {
    expect(aoPipelinesSource).toContain('render: (mode: AoMode, viewMode: AoViewMode, productOutput?: boolean) => void')
    expect(aoPipelinesSource).toContain('const vbaoTex = vbaoNode.getTextureNode()')
    expect(aoPipelinesSource).toContain('const vbaoRawTex = vbaoNode.getRawTextureNode()')
    expect(aoPipelinesSource).toContain('createSsaoScalar')
    expect(aoPipelinesSource).not.toContain('SSAOPass')
    expect(museumSource).toContain('ssaoRawScalar')
    expect(museumSource).not.toContain('displayCompressedAoScalar')
    expect(aoPipelinesSource).toContain('if (productOutput) vbaoAoPipeline.render()')
    expect(aoPipelinesSource).toContain('else vbaoRawAoPipeline.render()')
    expect(aoPipelinesSource).toContain('if (productOutput) vbaoPipeline.render()')
    expect(aoPipelinesSource).toContain('else vbaoRawPipeline.render()')
    expect(labSource).toContain('let productOutput = true')
    expect(labSource).toContain('function createLabOutputToggle')
    expect(labSource).toContain('input type="checkbox" data-denoise')
    expect(labSource).toContain('denoiseEnabled: productOutput')
    expect(labSource).toContain('aoPipelines?.render(activeAo, activeView, productOutput)')
    expect(benchmarkSource).toContain('const sceneDenoiseStates = denoiseStates')
    expect(benchmarkSource).not.toContain("const sceneDenoiseStates = scene === 'lab' ? [true] : denoiseStates")
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

  it('uses artist strength plus advanced contrast, while preserving scale/intensity aliases', () => {
    expect(optionsSource).toContain('readonly strength?: number')
    expect(optionsSource).toContain('readonly contrast?: number')
    expect(optionsSource).toContain('readonly advanced?: {')
    expect(optionsSource).toContain('readonly contrast?: number')
    expect(source).toContain('strength: options.strength ?? legacy.intensity ?? fallback.strength')
    expect(source).toContain(
      'contrast: advanced.contrast ?? legacy.contrast ?? legacy.scale ?? fallback.contrast',
    )
    expect(source).toContain('const contrastedAo = pow(accessibility, this.contrast)')
    // AO is now the R channel of the folded RG raw output (R=AO, G=confidence).
    expect(source).toContain('float(1).sub(contrastedAo).mul(this.strength)')
    expect(source).not.toContain('return pow(accessibility, this.scale)')
  })

  it('keeps temporal-free reconstruction passes internal and edge-aware', () => {
    expect(resolveSource).toContain('class VBAOResolveNode')
    expect(resolveSource).toContain('JBU4')
    expect(resolveSource).not.toContain('inline cross raw cleanup')
    expect(resolveSource).not.toContain('vbaoResolveCleanupCrossAo')
    expect(resolveSource).not.toContain('cleanupCrossAo')
    expect(resolveSource).toContain('const tapAo = rawAo.sample(tapUv).r')
    expect(resolveSource).toContain('return this.getPassTextureNode()')
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
    expect(fullResPolishSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(fullResPolishSource).toContain('clampedPolishAo')
    expect(fullResPolishSource).toContain('readonly confidenceNode?: TextureNode')
    expect(fullResPolishSource).toContain('vbaoFullResPolishCenterConfidence')
    expect(fullResPolishSource).toContain('vbaoFullResPolishConfidenceGuidedStrength')
    expect(fullResPolishSource).not.toContain('start: int(-2), end: int(3)')
    expect(fullResPolishSource).not.toContain('abs(centerDepth.sub(tapDepth))')
    expect(halfResCleanupSource).toContain('class VBAOHalfResCleanupNode')
    expect(halfResCleanupSource).toContain('HALF_RES_CLEANUP_OFFSETS')
    expect(halfResCleanupSource).toContain('centerAo.mul(float(4))')
    expect(halfResCleanupSource).toContain('totalWeight = float(4).toVar')
    expect(halfResCleanupSource).toContain('getViewPosition')
    expect(halfResCleanupSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(halfResCleanupSource).toContain('readonly confidenceNode?: TextureNode')
    expect(halfResCleanupSource).toContain('vbaoHalfResCleanupCenterConfidence')
    expect(halfResCleanupSource).toContain('vbaoHalfResCleanupConfidenceGuidedStrength')
    expect(halfResCleanupSource).not.toContain('start: int(-2), end: int(3)')
    expect(effectPassSource).toContain('passTexture(this as never, this.renderTarget.texture)')
    expect(halfResCleanupSource).toContain('return this.getPassTextureNode()')
    expect(fullResPolishSource).not.toContain('this as unknown as TextureNode')
    expect(halfResCleanupSource).not.toContain('this as unknown as TextureNode')
    expect(halfResCleanupSource).not.toContain('if (!this.enabled) return this.rawAoNode')
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
    expect(resolveSource).toContain(
      'const fallbackResolvedAo = fallbackAo.div(max(fallbackWeight, float(1e-6)))',
    )
    expect(resolveSource).not.toContain('const fallbackAo = rawAo.sample(uvNode).r')
  })

  it('centralizes bilateral geometry weighting across reconstruction passes', () => {
    expect(bilateralWeightSource).toContain('function computeVbaoBilateralGeometryWeight')
    expect(bilateralWeightSource).toContain('const normalAgreement = clamp(dot(centerNormal, tapNormal), float(0), float(1))')
    expect(bilateralWeightSource).toContain('const planeDistance = abs(dot(tapPosition.sub(centerPosition), centerNormal))')
    expect(bilateralWeightSource).toContain('const depthWeight = exp2(')
    expect(bilateralWeightSource).toContain('mul(float(24))')
    expect(bilateralWeightSource).toContain('const normalWeight = normal4.mul(normal4)')
    expect(resolveSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(halfResCleanupSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(fullResPolishSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(resolveSource).not.toContain('const normalAgreement =')
    expect(halfResCleanupSource).not.toContain('const normalAgreement =')
    expect(fullResPolishSource).not.toContain('const normalAgreement =')
  })

  it('keeps deprecated aliases out of the public options type but accepted as runtime shims', () => {
    // Public surface is exactly quality | radius | contact | strength | softness | advanced.
    expect(optionsSource).toMatch(
      /export interface VBAONodeOptions \{\s*readonly quality\?: VBAOQualityPreset\s*readonly radius\?: number\s*readonly contact\?: number\s*readonly strength\?: number\s*readonly softness\?: number\s*readonly advanced\?: \{/,
    )
    // Legacy flat aliases live in an internal shim type that never reaches the entrypoint.
    // The regex pins the full shim membership so an alias can't silently drop out.
    expect(optionsSource).toMatch(
      /export interface VbaoDeprecatedOptionAliases \{[^}]*readonly preset\?: VBAOQualityPreset[^}]*readonly thickness\?: number[^}]*readonly contrast\?: number[^}]*readonly scale\?: number[^}]*readonly intensity\?: number[^}]*readonly slices\?: number[^}]*readonly samples\?: number[^}]*readonly resolutionScale\?: number[^}]*\}/,
    )
    expect(indexSource).not.toContain('VbaoDeprecatedOptionAliases')
    expect(source).toContain(
      'const legacy = options as VBAONodeOptions & VbaoDeprecatedOptionAliases',
    )
  })

  it('provides a shared internal effect pass without changing render-target contracts', () => {
    expect(effectPassSource).toContain("class VBAOEffectPass extends TempNode<'float'>")
    expect(effectPassSource).toContain('new RenderTarget(1, 1')
    expect(effectPassSource).toContain('format: RedFormat')
    expect(effectPassSource).toContain('type: HalfFloatType')
    expect(effectPassSource).toContain('this.renderTarget.texture.magFilter = NearestFilter')
    expect(effectPassSource).toContain('this.renderTarget.texture.minFilter = NearestFilter')
    expect(effectPassSource).toContain('this.renderTarget.texture.colorSpace = NoColorSpace')
    expect(effectPassSource).toContain('passTexture(this as never, this.renderTarget.texture)')
    expect(effectPassSource).toContain('RendererUtils.resetRendererState')
    expect(effectPassSource).toContain('RendererUtils.restoreRendererState')
    expect(effectPassSource).toContain('this.renderTarget.setSize')
    expect(effectPassSource).toContain('this.renderTarget.dispose()')
    expect(fullResPolishSource).toContain('extends VBAOEffectPass')
    expect(fullResPolishSource).not.toContain('new RenderTarget(1, 1')
    expect(fullResPolishSource).not.toContain('RendererUtils.resetRendererState')
    expect(indexSource).not.toContain('VBAOEffectPass')
    // Renderer state is per-instance everywhere: a module-level slot lets two
    // simultaneous instances corrupt each other's save/restore every frame.
    expect(source).toContain(
      'private rendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined',
    )
    expect(source).not.toContain('let rendererState')
    expect(receiverConfidenceSource).toContain(
      'private rendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined',
    )
    expect(receiverConfidenceSource).not.toContain('let receiverConfidenceRendererState')
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
    expect(source).not.toMatch(
      /const wantsPolish = this\.softness\.value > 0[\s\S]*?if \(wantsPolish\)[\s\S]*?getOrCreateHalfCleanupNode[\s\S]*?if \(wantsPolish\)[\s\S]*?getOrCreateFullPolishNode/,
    )
  })

  it('uses fixed hot-loop bounds for all raw AO loop shapes', () => {
    expect(source).toContain('type VbaoRawLoopShape')
    expect(source).toContain('private rawLoopShape: VbaoRawLoopShape')
    expect(source).toContain('private resolveRawLoopShape(')
    expect(source).toContain('const sliceLoopEnd = int(this.rawLoopShape.slices)')
    expect(source).toContain('const sampleLoopEnd = int(this.rawLoopShape.samples)')
    expect(source).toContain('const sliceCount = float(this.rawLoopShape.slices)')
    expect(source).toContain('const sampleCount = float(this.rawLoopShape.samples)')
    expect(source).toContain('end: sliceLoopEnd')
    expect(source).toContain('end: sampleLoopEnd')
    expect(source).not.toContain('rawLoopShape.fixed')
    expect(source).not.toContain(': int(this.slices)')
    expect(source).not.toContain(': int(this.samples)')
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
    expect(benchmarkSource).toContain(
      "const modes = parseCsvEnv('AO_BENCHMARK_MODES', ['off', 'gtao', 'ssao', 'vbao', 'n8ao'])",
    )
    expect(benchmarkSource).toContain("mode === 'n8ao' && !denoiseEnabled")
    expect(benchmarkSource).toContain(
      "import { analyzeScreenshotQuality } from './profiling/screenshotMetrics.mjs'",
    )
    expect(benchmarkSource).toContain('AO_BENCHMARK_BASE_URL')
    expect(benchmarkSource).toContain(
      'AO_BENCHMARK_EXTERNAL_SERVER=1 requires AO_BENCHMARK_BASE_URL',
    )
    expect(benchmarkSource).toContain("from './profiling/benchmarkHarness.mjs'")
    expect(benchmarkSource).toContain('assertWebGpu')
    expect(benchmarkSource).toContain('launchBenchmarkBrowser')
    expect(profilingBenchmarkHarnessSource).toContain('export function startBenchmarkServer')
    expect(profilingBenchmarkHarnessSource).toContain('export async function waitForServer')
    expect(profilingBenchmarkHarnessSource).toContain(
      'export async function launchBenchmarkBrowser',
    )
    expect(profilingBenchmarkHarnessSource).toContain('export async function waitForBenchmark')
    expect(profilingBenchmarkHarnessSource).toContain('export async function assertWebGpu')
    expect(profilingBenchmarkHarnessSource).toContain('Vite exited before AO benchmark readiness')
    expect(profilingBenchmarkHarnessSource).toContain('await server.ready')
    expect(profilingBenchmarkHarnessSource).toContain("'--strictPort'")
    expect(benchmarkSource).toContain("from './profiling/productionReport.mjs'")
    expect(benchmarkSource).toContain('classifyFailureLabels')
    expect(benchmarkSource).toContain('writeProductionQualityReports')
    expect(benchmarkSource).toContain('const failureLabels = classifyFailureLabels(row)')
    expect(profilingProductionReportSource).toContain('export const AO_FAILURE_LABELS')
    expect(profilingProductionReportSource).toContain('export function classifyFailureLabels')
    expect(profilingProductionReportSource).toContain("'noise'")
    expect(profilingProductionReportSource).toContain("'mud'")
    expect(profilingProductionReportSource).toContain("'halo'")
    expect(profilingProductionReportSource).toContain("'thin-gap'")
    expect(profilingProductionReportSource).toContain("'edge-bleed'")
    expect(profilingProductionReportSource).toContain("'ghosting'")
    expect(profilingProductionReportSource).toContain("'disocclusion'")
    expect(profilingProductionReportSource).toContain("'scale-mismatch'")
    expect(profilingProductionReportSource).toContain("'false-curvature'")
    expect(profilingProductionReportSource).toContain("return ['noise']")
    expect(profilingProductionReportSource).toContain("return ['noise', 'edge-bleed']")
    expect(profilingProductionReportSource).toContain("labels.add('mud')")
    expect(profilingProductionReportSource).toContain("labels.add('thin-gap')")
    expect(profilingScreenshotMetricsSource).toContain(
      'export async function analyzeScreenshotQuality',
    )
    expect(profilingScreenshotMetricsSource).toContain('patternNoiseScore')
    expect(profilingScreenshotMetricsSource).toContain('stripeScore')
    expect(profilingScreenshotMetricsSource).toContain('horizontalStripeScore')
    expect(profilingScreenshotMetricsSource).toContain('verticalStripeScore')
    expect(profilingScreenshotMetricsSource).toContain('edgeBleedProxy')
    expect(profilingScreenshotMetricsSource).toContain('thinGapPreservationProxy')
    expect(profilingProductionReportSource).toContain(
      'export async function writeProductionQualityReports',
    )
    expect(profilingProductionReportSource).toContain('AO Production Screenshot Quality Summary')
    expect(profilingProductionReportSource).toContain('Pattern/noise ↓')
    expect(profilingProductionReportSource).toContain('Metric basis:')
  })

  it('records VBAO internal pass timing status without treating skipped passes as zero cost', () => {
    expect(benchmarkSource).toContain('function createVbaoPassTimingRows')
    expect(benchmarkSource).toContain('collectAoGpuPassTimings')
    expect(benchmarkSource).toContain("'measured'")
    expect(benchmarkSource).toContain("'derived'")
    expect(benchmarkSource).toContain("'skipped'")
    expect(benchmarkSource).not.toContain("if (label === 'VBAO.TemporalAccumulation') return 'temporal'")
    expect(benchmarkSource).not.toContain("if (label === 'VBAO.TemporalPreviousDepth') return 'temporal-depth'")
    expect(benchmarkSource).not.toContain("if (label === 'VBAO.TemporalPreviousNormal') return 'temporal-normal'")
    expect(benchmarkSource).not.toContain("const temporalEnabled = productOutput && vbaoTemporalMode === 'internal'")
    expect(benchmarkSource).not.toContain('temporalGuideEnabled')
    expect(benchmarkSource).not.toContain("'temporal-depth'")
    expect(benchmarkSource).not.toContain("'temporal-normal'")
    expect(benchmarkSource).toContain("if (label === 'VBAO.VelocityTemporal') return 'temporal'")
    expect(benchmarkSource).toContain(
      "if (label === 'VBAO.VelocityTemporalDiagnostics') return 'diagnostics'",
    )
    expect(benchmarkSource).toContain("if (label === 'VBAO.ReceiverConfidence') return 'confidence'")
    expect(benchmarkSource).not.toContain("if (label === 'VBAO.ResolvePolish') return 'resolve-polish'")
    expect(benchmarkSource).toContain("const temporalEnabled = productOutput && !diagnosticOutput && temporalMode === 'velocity-internal'")
    expect(benchmarkSource).toContain('const diagnosticsEnabled = temporalEnabled')
    expect(benchmarkSource).toContain("pass: 'confidence'")
    expect(benchmarkSource).toContain("pass: 'temporal'")
    expect(benchmarkSource).toContain("pass: 'diagnostics'")
    expect(benchmarkSource).toContain("if (!enabled) return measuredByPass.has(pass) ? 'unexpected' : 'skipped'")
    expect(benchmarkSource).toContain('resolveGpuPassTimings')
    expect(benchmarkSource).toContain("['missing', 'unexpected'].includes(passTiming.status)")
    expect(benchmarkSource).toMatch(/passTimings:[\s\S]*createVbaoPassTimingRows\(/)
    expect(profilingProductionReportSource).toContain('AO Production Pass Timing Status')
    expect(profilingProductionReportSource).toContain(
      '| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |',
    )
    expect(profilingProductionReportSource).toContain("row.hostTaaMode ?? 'n/a'")
    expect(profilingProductionReportSource).toContain('Skipped passes are not zero-cost passes')
  })

  it('keeps compute/readback candidates private and schema-visible', () => {
    expect(optionsSource).not.toContain('compute')
    expect(optionsSource).not.toContain('storageTarget')
    expect(indexSource).not.toContain('ComputeNode')
    expect(indexSource).not.toContain('VBAOCompute')
    expect(source).not.toContain('renderer.compute')
    expect(computeCandidateSource).toContain('VBAO_COMPUTE_CANDIDATE_LABEL')
    expect(computeCandidateSource).toContain('sector-confidence-smoke')
    expect(computeCandidateSource).toContain('VBAO_COMPUTE_CANDIDATE_TARGET_FORMAT')
    expect(computeCandidateSource).toContain('targetFormat: VBAO_COMPUTE_CANDIDATE_TARGET_FORMAT')
    expect(computeCandidateSource).toContain('targetLifetime: VBAO_COMPUTE_CANDIDATE_TARGET_LIFETIME')
    expect(computeCandidateSource).toContain('backend: VBAO_COMPUTE_CANDIDATE_BACKEND')
    expect(computeCandidateSource).toContain('new StorageTexture')
    expect(computeCandidateSource).toContain('storageTexture')
    expect(computeCandidateSource).toContain('textureStore')
    expect(computeCandidateSource).toContain('compute: (renderer: WebGPURenderer) => renderer.compute(computeNode)')
    expect(museumSource).toContain('createVbaoSectorConfidenceComputeCandidate')
    expect(museumSource).toContain('new VBAOReceiverConfidenceNode')
    expect(museumSource).toContain('getRequestedVbaoComputeCandidateMode')
    expect(museumSource).toContain("get('vbaoComputeCandidate')")
    expect(museumSource).toContain('sectorConfidence.compute(renderer)')
    expect(museumSource).toContain("type VbaoReconstructionStage = 'raw' | 'cleanup' | 'resolve' | 'polish' | 'final' | 'confidence'")
    expect(museumSource).toContain("requested === 'confidence'")
    expect(museumSource).toContain('const receiverConfidenceScalar = receiverConfidenceNode?.getTextureNode().r')
    expect(museumSource).toContain("type VbaoReceiverConfidenceMode = 'confidence-guided' | 'scalar-control'")
    expect(museumSource).toContain('getRequestedVbaoReceiverConfidenceMode')
    expect(museumSource).toContain("get('vbaoReceiverConfidence')")
    expect(museumSource).toContain("vbaoReceiverConfidenceMode === 'confidence-guided'")
    expect(museumSource).toContain('confidence: makeAoPipeline(')
    expect(museumSource).not.toContain('vbaoProductNode.r.mul(sectorConfidenceScalar)')
    expect(museumSource).not.toContain('polishScalar.mul(sectorConfidenceScalar)')
    expect(museumSource).toContain('vbaoComputeCandidateLabel')
    expect(museumSource).toContain('getVbaoComputeCandidateLabel')
    expect(museumSource).toContain('getVbaoComputeCandidateInventory')
    expect(museumSource).toContain('getVbaoComputeCandidateTiming')
    expect(benchmarkSource).toContain('computeCandidateLabel')
    expect(benchmarkSource).toContain('computeCandidateInventory')
    expect(benchmarkSource).toContain('computeCandidateTiming')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_RECEIVER_CONFIDENCE')
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoReceiverConfidence', vbaoReceiverConfidenceMode)")
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoComputeCandidate', vbaoComputeCandidateMode)")
    expect(benchmarkSource).toContain("'confidence'")
    expect(benchmarkSource).toContain("if (label === 'VBAO.ReceiverConfidence') return 'confidence'")
    expect(benchmarkSource).toContain("pass: 'confidence'")
    expect(benchmarkSource).toContain('confidence-diagnostic')
    expect(profilingProductionReportSource).toContain('VBAO Compute Candidate Status')
    expect(profilingProductionReportSource).toContain('Target formats')
    expect(profilingProductionReportSource).toContain('Lifetimes')
    expect(profilingProductionReportSource).toContain('Dispatch timing')
    expect(profilingProductionReportSource).toContain('VBAO_RECONSTRUCTION_DIAGNOSTIC_STAGES')
    expect(profilingProductionReportSource).toContain("return 'confidence-diagnostic'")
    expect(profilingProductionReportSource).toContain("'scalar-control'")
    expect(profilingProductionReportSource).toContain('createVbaoProductQualityMatrixStatusRows')
    expect(profilingProductionReportSource).toContain('CPU ms')
    expect(gpuReadbackSource).toContain('@compute @workgroup_size(1)')
    expect(gpuReadbackSource).toContain('var<storage, read_write> output')
    expect(gpuReadbackSource).toContain('computeDispatchTimings')
    expect(gpuReadbackSource).toContain('storageTargetInventory')
    expect(gpuReadbackSource).toContain("targetFormat: 'float32x4-fixture-values'")
    expect(gpuReadbackSource).toContain("targetLifetime: 'single-benchmark-run'")
    expect(gpuReadbackSource).toContain('outputResolution')
    expect(gpuReadbackSource).toContain('webgpuBackendStatus')
    expect(gpuReadbackSource).toContain('backend: ')
  })

  it('keeps receiver confidence private and computes it from receiver-state support terms', () => {
    expect(receiverConfidenceSource).toContain('class VBAOReceiverConfidenceNode extends TempNode')
    expect(receiverConfidenceSource).toContain("this.receiverConfidenceTarget.texture.name = 'VBAO.ReceiverConfidence'")
    expect(receiverConfidenceSource).toContain('format: RedFormat')
    expect(receiverConfidenceSource).toContain('type: HalfFloatType')
    expect(receiverConfidenceSource).toContain('vbaoReceiverConfidenceCandidateCount')
    expect(receiverConfidenceSource).toContain('vbaoReceiverConfidenceAcceptedCount')
    expect(receiverConfidenceSource).toContain('vbaoReceiverConfidenceSliceAgreement')
    expect(receiverConfidenceSource).toContain('vbaoReceiverConfidenceSupport')
    expect(receiverConfidenceSource).toContain('sqrt(receiverSupport.mul(sliceAgreement))')
    expect(receiverConfidenceSource).toContain('sampleValid')
    expect(receiverConfidenceSource).toContain('occludedMask')
    // Receiver confidence is folded into the raw RG pass (R=AO, G=confidence): the
    // product node computes it from the SAME march and no longer runs a second
    // confidence estimator. The standalone VBAOReceiverConfidenceNode is retained
    // only as a demo-only diagnostic oracle (used to validate the folded G channel).
    expect(source).not.toContain("import { VBAOReceiverConfidenceNode } from './VBAOReceiverConfidenceNode'")
    expect(source).not.toContain('getOrCreateReceiverConfidenceNode')
    expect(source).toContain('format: RGFormat')
    expect(source).toContain('const vbaoConfidence = sqrt(vbaoReceiverSupport.mul(vbaoSliceAgreement))')
    expect(source).toContain('return vec4(vbaoAo, vbaoConfidence, float(0), float(1))')
    expect(source).toContain('const usesConfidenceGuidedReconstruction = cleanupStrength > 0 || polishStrength > 0')
    expect(source).toContain('confidenceNode,')
    expect(museumSource).toContain('vbaoComputeCandidateMode === VBAO_COMPUTE_CANDIDATE_LABEL || vbaoSoftness > 0')
    // Demo reconstruction (half-res cleanup/polish) consumes the folded confidence from the
    // raw RG texture's G channel; the standalone confidence node remains only for the diagnostic view.
    expect(museumSource).toContain('confidenceNode: vbaoNode.getRawTextureNode()')
    expect(receiverConfidenceSource).not.toContain('readonly confidence?:')
    expect(receiverConfidenceSource).not.toContain('readonly metadata?:')
    // Both kernels share one set of TSL primitives so the compiled WGSL contains a
    // single named copy of each function instead of renamed duplicates.
    expect(source).toContain("from './vbaoKernelPrimitives'")
    expect(receiverConfidenceSource).toContain("from './vbaoKernelPrimitives'")
    expect(kernelPrimitivesSource).toContain('export const vbaoMaskRangeFn')
    expect(kernelPrimitivesSource).toContain('export const vbaoCosineMeasureNoAtan')
    expect(kernelPrimitivesSource).toContain('export const vbaoIntervalMaskStochasticFn')
    expect(kernelPrimitivesSource).toContain('export function createVbaoNoisePhaseSampler')
    expect(kernelPrimitivesSource).not.toContain('@ts-nocheck')
    expect(source).not.toContain('const maskRangeFn = (Fn as any)')
    expect(source).not.toContain('const vbaoCosineMeasureNoAtan = (Fn as any)')
    expect(source).not.toContain('const intervalMaskStochasticFn = (Fn as any)')
    expect(receiverConfidenceSource).not.toContain('vbaoReceiverConfidenceMaskRange')
    expect(receiverConfidenceSource).not.toContain('vbaoReceiverConfidenceCosineMeasureNoAtan')
    expect(receiverConfidenceSource).not.toContain('vbaoReceiverConfidenceIntervalMask')
    expect(receiverConfidenceSource).toContain('const sampleNoisePhase = createVbaoNoisePhaseSampler({')
    expect(indexSource).not.toContain('VBAOReceiverConfidenceNode')
    expect(optionsSource).not.toContain('receiverConfidence')
    expect(optionsSource).not.toContain('readonly confidence?:')
    expect(source).not.toContain('getReceiverConfidenceTextureNode')
  })

  it('ships artist-safe contact controls and product-first quality presets', () => {
    expect(source).toContain('VBAO_QUALITY_TIERS')
    expect(source).toContain('contact: options.contact ?? fallback.contact')
    expect(source).toContain('advanced.thickness ??')
    expect(source).toContain('legacy.thickness ??')
    expect(source).toContain('advanced.slices ?? legacy.slices ?? quality?.slices ?? fallback.slices')
    expect(source).toContain('advanced.samples ?? legacy.samples ?? quality?.samples ?? fallback.samples')
    expect(source).toMatch(
      /advanced\.resolutionScale\s*\?\?\s*legacy\.resolutionScale\s*\?\?\s*quality\?\.resolutionScale\s*\?\?\s*fallback\.resolutionScale/,
    )
    expect(source).not.toContain('slices: options.slices ?? fallback.slices')
    expect(source).not.toContain('samples: options.samples ?? fallback.samples')
    expect(optionsSource).toContain('export const VBAO_DEFAULT_CONTACT = 0.45 as const')
    expect(optionsSource).toContain('export function resolveVbaoContactThickness')
    expect(optionsSource).toContain('readonly contact?: number')
    expect(optionsSource).toContain('readonly advanced?: {')
    expect(optionsSource).toContain('readonly thickness?: number')
    expect(optionsSource).toContain('readonly contact: number')
    expect(optionsSource).toContain(
      'performance: { resolutionScale: 0.5, slices: 2, samples: 4, sectors: 32 }',
    )
    expect(optionsSource).not.toContain('mobile: {')
    expect(optionsSource).not.toContain('fast: {')
    expect(optionsSource).toContain(
      'balanced: { resolutionScale: 0.75, slices: 3, samples: 6, sectors: 32 }',
    )
    expect(optionsSource).toContain(
      'quality: { resolutionScale: 1.0, slices: 4, samples: 8, sectors: 32 }',
    )
    expect(optionsSource).toContain(
      'ultra: { resolutionScale: 1.0, slices: 4, samples: 10, sectors: 32 }',
    )
    expect(optionsSource).toContain('contact: { min: 0, max: 1 }')
    expect(optionsSource).toContain('slices: { min: 1, max: 4 }')
    expect(optionsSource).toContain('samples: { min: 2, max: 16 }')
  })

  it('keeps Museum VBAO thickness in the product ratio band instead of the slabby stress value', () => {
    expect(museumSource).toContain('baseline: { radius: 1.25, thickness: 0.25 }')
    expect(museumSource).not.toContain('baseline: { radius: 0.35, thickness: 0.28 }')
  })

  it('wires Museum VBAO through the single product node, not public reconstruction passes', () => {
    expect(museumSource.match(/new VBAONode/g)?.length).toBe(1)
    expect(museumSource).toContain('const createVbaoPipelines = (fullResolution: boolean) =>')
    expect(museumSource).not.toContain('const vbaoHalfNode = new VBAONode')
    expect(museumSource).not.toContain('const vbaoFullNode = new VBAONode')
    expect(museumSource).toContain('resolutionScale: fullResolution ? 1.0 : 0.5')
    expect(museumSource).toContain('softness: vbaoSoftness')
    expect(museumSource).toContain('const activeVbaoPipelines = (fullResolutionVbao: boolean) =>')
    expect(museumSource).toContain('disposeActiveVbao()')
    expect(museumSource).toContain("quality: VBAO_PRODUCT_QUALITY")
    expect(museumSource).toContain("const VBAO_PRODUCT_QUALITY = 'quality' as const")
    expect(museumSource).toContain('type VbaoSampleMode =')
    expect(museumSource).toContain("'product-preset'")
    expect(museumSource).toContain("'debug-override'")
    expect(museumSource).toContain("'spatial-ultra'")
    expect(museumSource).toContain("'same-cost-3x10'")
    expect(museumSource).toContain("'same-cost-2x16'")
    expect(museumSource).toContain('resolveVbaoSampleShape')
    expect(museumSource).toContain("requested === 'debug-override'")
    expect(museumSource).toContain("requested === 'spatial-ultra'")
    expect(museumSource).toContain("vbaoSampleMode === 'debug-override'")
    expect(museumSource).toContain("if (sampleMode === 'spatial-ultra')")
    expect(museumSource).toContain('const VBAO_SPATIAL_ULTRA_SHAPE = { samples: 10, slices: 4 } as const')
    expect(museumSource).toContain('const VBAO_SAME_COST_3X10_SHAPE = { samples: 10, slices: 3 } as const')
    expect(museumSource).toContain('const VBAO_SAME_COST_2X16_SHAPE = { samples: 16, slices: 2 } as const')
    expect(museumSource).toContain(
      'benchmark: { noiseTexture: createVbaoBenchmarkNoiseTexture(vbaoNoiseSource) }',
    )
    expect(museumSource).not.toContain('__benchmarkNoiseSource')
    expect(museumSource).toContain('samples: VBAO_DEBUG_OVERRIDE_SHAPE.samples')
    expect(museumSource).toContain('slices: VBAO_DEBUG_OVERRIDE_SHAPE.slices')
    expect(museumSource).not.toContain('samples: VBAO_SAMPLE_PRESET.samples')
    expect(museumSource).not.toContain('slices: VBAO_SAMPLE_PRESET.slices')
    expect(museumSource).not.toContain('const VBAO_SAMPLE_PRESET')
    expect(museumSource).not.toContain('pipelines.vbaoFull')
    expect(museumSource).not.toContain('pipelines.vbaoProduct')
    expect(museumSource).not.toContain('const vbaoFullRaw =')
    expect(museumSource).not.toContain('const vbaoHalfRaw =')
    expect(museumSource).not.toContain('const vbaoDenoised = denoise')
    expect(museumSource).not.toContain('vbaoNode.resolutionScale = 1.0')
    expect(museumSource).toContain('<span>Product output</span>')
    expect(museumSource).not.toContain('Extra denoise')
    expect(indexSource).not.toContain('VBAOHalfResCleanupNode')
    expect(indexSource).not.toContain('VBAOFullResPolishNode')
    expect(indexSource).not.toContain('VBAOResolveNode')
  })

  it('keeps half-resolution reconstruction stage capture demo-internal', () => {
    expect(museumSource).toContain("type VbaoReconstructionStage = 'raw' | 'cleanup' | 'resolve' | 'polish' | 'final'")
    expect(museumSource).toContain('getRequestedVbaoReconstructionStage')
    expect(museumSource).toContain('setVbaoReconstructionStage')
    expect(museumSource).toContain('readonly stagePipelines: VbaoStagePipelineSet | undefined')
    expect(museumSource).toContain('new VBAOHalfResCleanupNode')
    expect(museumSource).toContain('new VBAOResolveNode')
    expect(museumSource).toContain('new VBAOFullResPolishNode')
    expect(museumSource).toContain("requested === 'raw'")
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES')
    expect(benchmarkSource).toContain('setVbaoReconstructionStage')
    expect(benchmarkSource).toContain('reconstructionStages.push')
    expect(benchmarkSource).toContain('vbaoReconstructionStage')
    expect(indexSource).not.toContain('VBAOHalfResCleanupNode')
    expect(indexSource).not.toContain('VBAOFullResPolishNode')
    expect(indexSource).not.toContain('VBAOResolveNode')
  })

  it('keeps cleanup removal as an evidence-only benchmark path', () => {
    expect(museumSource).toContain("type VbaoCleanupMode = 'on' | 'skip'")
    expect(museumSource).toContain('function getRequestedVbaoCleanupMode()')
    expect(museumSource).toContain('function getRequestedVbaoSoftness()')
    expect(museumSource).toContain("window.location.search).get('vbaoCleanup')")
    expect(museumSource).toContain("window.location.search).get('vbaoSoftness')")
    expect(museumSource).toContain("return requested === 'skip' ? 'skip' : 'on'")
    expect(museumSource).toContain('readonly vbaoCleanupMode: VbaoBenchmarkCleanupMode')
    expect(museumSource).toContain('vbaoCleanupMode: usesVbao ? vbaoCleanupMode : ')
    expect(museumSource).toContain("enabled: vbaoCleanupMode === 'on'")
    expect(museumSource).toContain(
      "vbaoCleanupMode === 'on' ? cleanupTextureNode : vbaoNode.getRawTextureNode()",
    )
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_CLEANUP_MODE')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_SOFTNESS')
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoCleanup', 'skip')")
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoSoftness', String(vbaoDemoSoftness))")
    expect(benchmarkSource).toContain('cleanupMode: mode === ')
    expect(benchmarkSource).toContain('vbaoSoftness: mode === ')
    expect(benchmarkSource).toContain("cleanupMode !== 'skip'")
    expect(benchmarkSource).toContain('Evidence-only final product AO with half-resolution cleanup skipped before resolve')
    expect(optionsSource).not.toContain('cleanupMode')
    expect(optionsSource).not.toContain('resolvePolishMode')
    expect(indexSource).not.toContain('cleanupMode')
    expect(indexSource).not.toContain('VBAOResolvePolishNode')
  })

  it('keeps Museum benchmarks explicit about VBAO full-res versus half-res rows', () => {
    expect(museumSource).not.toContain('high-sample')
    expect(benchmarkSource).toContain('const vbaoResolutionStates = parseCsvEnv')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_RESOLUTION_STATES')
    expect(benchmarkSource).toContain('await setFullResolutionVbao(page, fullResolutionVbao)')
    expect(benchmarkSource).toContain('latest.fullResolutionVbao === fullResolutionVbao')
    expect(benchmarkSource).toContain("fullResolutionVbao ? 'full-res' : 'half-res'")
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_SAMPLE_MODE')
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoSampleMode', vbaoSampleMode)")
    expect(benchmarkSource).toContain("'spatial-ultra'")
    expect(benchmarkSource).toContain("'same-cost-3x10'")
    expect(benchmarkSource).toContain("'same-cost-2x16'")
    expect(benchmarkSource).toContain('sampleMode: mode === ')
    expect(benchmarkSource).toContain(
      '${mode}-${vbaoSampleMode}${temporalLabel}${hostTaaLabel}${cleanupLabel}${gateReceiverConfidenceLabel}${softnessLabel}-${vbaoResolutionLabel}',
    )
    expect(profilingProductionReportSource).toContain('VBAO sample mode')
  })

  it('adds generated shader inspection for the quality product preset path', () => {
    expect(museumSource).toContain('inspectVbaoGeneratedShaders')
    expect(museumSource).toContain('collectGeneratedShaderPrograms(renderer)')
    expect(museumSource).toContain("productPreset: VBAO_PRODUCT_QUALITY")
    expect(museumSource).toContain("sampleMode: vbaoSampleMode")
    expect(museumSource).toContain("fullResolution: fullResolutionVbao")
    expect(shaderInspectionSource).toContain("url.searchParams.set('vbaoSampleMode', expected.sampleMode)")
    expect(shaderInspectionSource).toContain("await page.click('[data-mode=\"vbao\"]')")
    expect(shaderInspectionSource).toContain('inspectVbaoGeneratedShaders')
    expect(shaderInspectionSource).toContain('assertShaderInspection')
    expect(shaderInspectionSource).toContain('artifacts/benchmarks/vbao-generated-shader-inspection-latest.json')
    expect(shaderInspectionSource).toContain('VBAO Generated Shader Inspection')
  })

  it('asserts generated shader evidence for fixed product loops and no surprise passes', () => {
    expect(shaderInspectionSource).toContain('expectedSliceLoopBound: 4')
    expect(shaderInspectionSource).toContain('expectedSampleLoopBound: 8')
    expect(shaderInspectionSource).toContain("sampleMode: 'spatial-ultra'")
    expect(shaderInspectionSource).toContain('expectedSampleLoopBound: 10')
    expect(shaderInspectionSource).toContain('hasFixedSliceLoop')
    expect(shaderInspectionSource).toContain('hasFixedSampleLoop')
    expect(shaderInspectionSource).toContain('hasDynamicSliceUniformLoop')
    expect(shaderInspectionSource).toContain('hasDynamicSampleUniformLoop')
    expect(shaderInspectionSource).toContain('!hasDynamicSliceUniformLoop')
    expect(shaderInspectionSource).toContain('!hasDynamicSampleUniformLoop')
    expect(shaderInspectionSource).toContain('hasUnexpectedFullResJbu')
    expect(shaderInspectionSource).toContain('hasUnexpectedWidePolish')
    expect(shaderInspectionSource).toContain('hasUnexpectedPass')
    expect(shaderInspectionSource).toContain('vbaoDuplicateDeclarationWarnings')
    expect(shaderInspectionSource).toContain('vbaoDuplicateDeclarationWarnings.length === 0')
    expect(shaderInspectionSource).toContain('isIgnoredConsoleDiagnostic')
    expect(shaderInspectionSource).toContain('ignoredConsoleDiagnostics')
    expect(shaderInspectionSource).toContain('powerPreference option is currently ignored')
    expect(shaderInspectionSource).not.toContain('vbaoPixelDuplicateWarnings')
  })
})
