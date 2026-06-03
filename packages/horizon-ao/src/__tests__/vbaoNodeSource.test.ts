import { describe, expect, it } from 'vitest'
import source from '../VBAONode.ts?raw'
import noiseSource from '../vbaoNoise.ts?raw'
import samplingSource from '../vbaoSampling.ts?raw'
import indexSource from '../index.ts?raw'
import optionsSource from '../vbaoConstants.ts?raw'
import bilateralWeightSource from '../vbaoBilateralWeight.ts?raw'
import effectPassSource from '../VBAOEffectPass.ts?raw'
import fullResPolishSource from '../VBAOFullResPolishNode.ts?raw'
import halfResCleanupSource from '../VBAOHalfResCleanupNode.ts?raw'
import resolveSource from '../VBAOResolveNode.ts?raw'
import resolvePolishSource from '../VBAOResolvePolishNode.ts?raw'
import velocityTemporalSource from '../VBAOVelocityTemporalNode.ts?raw'
import museumSource from '../../../../apps/demo/src/scenes/MuseumScene.tsx?raw'
import labSource from '../../../../apps/demo/src/scenes/VbaoLabScene.tsx?raw'
import aoPipelinesSource from '../../../../apps/demo/src/scenes/aoPipelines.ts?raw'
import aoCompareSource from '../../../../apps/demo/e2e/ao-compare.spec.ts?raw'
import benchmarkSource from '../../../../apps/demo/scripts/collect-ao-benchmark.mjs?raw'
import temporalGateSource from '../../../../apps/demo/scripts/verify-vbao-temporal-gate.mjs?raw'
import shaderInspectionSource from '../../../../apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs?raw'
import profilingBenchmarkHarnessSource from '../../../../apps/demo/scripts/profiling/benchmarkHarness.mjs?raw'
import profilingProductionReportSource from '../../../../apps/demo/scripts/profiling/productionReport.mjs?raw'
import profilingScreenshotMetricsSource from '../../../../apps/demo/scripts/profiling/screenshotMetrics.mjs?raw'
import benchmarkNoiseSource from '../../../../apps/demo/src/scenes/vbaoBenchmarkNoise.ts?raw'

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
    expect(samplingSource).toContain(
      'VBAO_PHASE_ATLAS_ROWS = VBAO_PHASE_ATLAS_PHASES / VBAO_PHASE_ATLAS_COLUMNS',
    )
    expect(samplingSource).toContain('VBAO_PHASE_STRIDE = 16')
    expect(noiseSource).toContain('const atlasWidth = n * VBAO_PHASE_ATLAS_COLUMNS')
    expect(noiseSource).toContain('const atlasHeight = n * VBAO_PHASE_ATLAS_ROWS')
    expect(source).toMatch(
      /const phaseRaw = float\(slice\)[\s\S]*?\.mul\(float\(VBAO_PHASE_STRIDE\)\)[\s\S]*?\.add\(float\(sample\)\)/,
    )
    expect(source).not.toContain('float(slice).mul(float(8)).add(float(sample))')
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
    expect(benchmarkNoiseSource).toContain("'static-stbn'")
    expect(benchmarkNoiseSource).toContain("'fast-like'")
    expect(source).not.toContain('__benchmarkNoiseSource')
    expect(optionsSource).not.toContain('__benchmarkNoiseSource')
  })

  it('hoists phase atlas pixel coordinates out of the per-sample noise lookup', () => {
    expect(source).toContain(
      'const vbaoRawNoisePixel = floor(uvNode.mul(this.sourceResolution))',
    )
    expect(source).toContain(".toVar('vbaoLocalPixel')")
    expect(source).not.toContain("toVar('vbaoRawNoisePixel')")
    expect(source).toMatch(
      /const vbaoLocalPixel = vbaoRawNoisePixel[\s\S]*?const sampleNoisePhase = \(slice: any, sample: any\) => \{/,
    )
    expect(source).toContain('const atlasPixel = vbaoLocalPixel.add')
    expect(source).not.toContain("toVar('vbaoPixel')")
    expect(source).not.toContain('const pixel = floor(uvNode.mul(this.resolution))')
    expect(source).not.toContain('const localPixel = pixel.sub')
  })

  it('keeps half-resolution raw sampling in source texture coordinates', () => {
    expect(source).toContain('readonly sourceResolution = uniform(new Vector2())')
    expect(source).toMatch(
      /this\.sourceResolution\.value\.set\(width, height\)[\s\S]*?this\.resolution\.value\.set\(scaledWidth, scaledHeight\)/,
    )
    expect(source).toContain(
      'const vbaoRawNoisePixel = floor(uvNode.mul(this.sourceResolution))',
    )
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
    expect(source).toMatch(
      /const maxThickness = this\.radius\.mul\(float\(0\.3\)\)\.toVar\('vbaoMaxThickness'\)[\s\S]*?const maxValidRadius2 = maxValidRadius\.mul\(maxValidRadius\)\.toVar\('vbaoMaxValidRadius2'\)[\s\S]*?\(Loop as any\)\(\s*\{ start: int\(0\), end: sliceLoopEnd/,
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
    expect(source).toContain(
      "const maxThickness = this.radius.mul(float(0.3)).toVar('vbaoMaxThickness')",
    )
    expect(source).toMatch(
      /const baseThickness = min\([\s\S]*?this\.thickness,[\s\S]*?maxThickness[\s\S]*?\)\.toVar\('vbaoBaseThickness'\)/,
    )
    expect(source).toMatch(
      /const effectiveThickness = min\([\s\S]*?baseThickness,[\s\S]*?sampleDist\.mul\(float\(0\.85\)\),[\s\S]*?\)\.toVar\('effectiveThickness'\)/,
    )
    expect(source).not.toContain(
      "const effectiveThickness = min(this.thickness, sampleDist.mul(float(0.85))).toVar('effectiveThickness')",
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

  it('reduces cosine-measure sector masks by popcount without a second cosine loop', () => {
    expect(source).toContain('countOneBits(occludedMask)')
    expect(source).toContain('const intervalMaskStochasticFn = (Fn as any)')
    expect(source).toContain(
      "const intervalSectors = u1.sub(u0).mul(float(SECTOR_COUNT)).toVar('vbaoIntervalSectors')",
    )
    expect(source).toContain('vbaoThinSectorMask')
    expect(source).toContain(
      'const thinContribution = (xi.lessThan(intervalSectors) as any).select',
    )
    expect(source).toContain('result.assign(thinContribution)')
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
    expect(source).toMatch(
      /this\.outputGraphCreated &&[\s\S]*next\.softness !== this\.softness\.value[\s\S]*next\.resolutionScale !== this\.resolutionScale/,
    )
    expect(source).toMatch(
      /getTextureNode\(\): TextureNode \{\s*this\.assertOutputGraphStable\(\)\s*this\.rebuildOutputGraph\(\)[\s\S]*this\.outputGraphCreated = true/,
    )
    expect(source).toMatch(
      /setSize\(width: number, height: number\): void \{\s*this\.assertOutputGraphStable\(\)/,
    )
    expect(source).not.toContain('private readonly resolvedTextureNode')
    expect(source).not.toContain('private readonly resolveNode: VBAOResolveNode')
    expect(source).not.toContain('this.resolvedTextureNode = this.resolveNode.getTextureNode()')
    expect(source).toMatch(
      /getTextureNode\(\): TextureNode \{\s*this\.assertOutputGraphStable\(\)\s*this\.rebuildOutputGraph\(\)\s*this\.outputGraphCreated = true\s*return this\.outputTextureNode \?\? this\.textureNode\s*\}/,
    )
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
    expect(source).toMatch(
      /const phaseRaw = float\(slice\)[\s\S]*?\.add\(float\(sample\)\)[\s\S]*?\.add\(this\.temporalPhaseOffset\)/,
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
      '${vbaoSampleMode}${temporalLabel}${hostTaaLabel}${cleanupLabel}${resolvePolishLabel}${softnessLabel}-${vbaoResolutionLabel}',
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
    expect(temporalGateSource).toContain('function hasMotionEvidenceKind(row)')
    expect(temporalGateSource).toContain('function hasMotionEvidenceSource(row)')
    expect(temporalGateSource).toContain('hostTaaEvidence')
    expect(temporalGateSource).not.toContain('internalPrototypeAllowed')
    expect(temporalGateSource).toContain('internalTemporalAllowed: internalTemporalPassesPromotion')
    expect(temporalGateSource).not.toContain("'prototype-only'")
    expect(temporalGateSource).toContain('materialPatternWin')
    expect(temporalGateSource).toContain('stripeRegression')
    expect(temporalGateSource).toContain('VBAO_TEMPORAL_ALTERNATIVE_JSON')
    expect(temporalGateSource).toContain('sameCostAlternativeEvidence')
    expect(temporalGateSource).toContain('motionDisocclusionEvidence')
    expect(temporalGateSource).toContain('hasMotionEvidenceKind(row)')
    expect(temporalGateSource).toContain('hasMotionEvidenceSource(row)')
    expect(temporalGateSource).toContain('function motionEvidenceKey(row)')
    expect(temporalGateSource).toContain('const motionByKey = new Map')
    expect(temporalGateSource).toContain('const missingMotionRows = productOffRows')
    expect(temporalGateSource).toContain('internalTemporalEvidence')
    expect(temporalGateSource).toContain('internalTemporalPassesPromotion')
    expect(temporalGateSource).toContain('const velocityTemporalEvidence =')
    expect(temporalGateSource).toContain('const internalTemporalEvidence = velocityTemporalEvidence')
    expect(temporalGateSource).toContain('const internalTemporalPassesPromotion =')
    expect(temporalGateSource).toContain('velocityTemporalEvidence &&\n  motionDisocclusionEvidence')
    expect(benchmarkSource).toContain('Private VBAOVelocityTemporalNode wrapped ${vbaoBaseProductOutputContract}')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_MOTION_EVIDENCE_KIND')
    expect(benchmarkSource).toContain("motionEvidenceSource")
    expect(temporalGateSource).toContain(
      'const complete = hostEvidenceComplete && hostTaaEvidence && sameCostAlternativeEvidence',
    )
    expect(temporalGateSource).toContain('createExistingScreenshotPathSet')
    expect(temporalGateSource).toContain('qualityMetricsComplete')
    expect(temporalGateSource).toContain('passTimingComplete')
    expect(temporalGateSource).toContain('BLOCKING_FAILURE_LABELS')
    expect(temporalGateSource).toContain('hasInternalBlockingFailureLabels')
    expect(temporalGateSource).toContain("rawPass?.status !== 'measured' || !finiteNumber(rawPass.gpuMs)")
    expect(temporalGateSource).toContain('Velocity-backed internal temporal evidence:')
    expect(temporalGateSource).toContain('VBAO_TEMPORAL_REQUIRE_CANDIDATE')
    expect(temporalGateSource).toContain('process.exitCode = 1')
    expect(temporalGateSource).toContain('Host TAA/TRAA evidence:')
    expect(temporalGateSource).toContain('Same-cost non-temporal alternative evidence:')
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
    expect(velocityTemporalSource).toContain('renderer.copyTextureToTexture')
    expect(velocityTemporalSource).not.toContain('previousViewProjection')
    expect(velocityTemporalSource).not.toContain('previousDepthRenderTarget')
    expect(velocityTemporalSource).not.toContain('previousNormalRenderTarget')
  })

  it('lets the Lab benchmark capture raw and product VBAO outputs explicitly', () => {
    expect(aoPipelinesSource).toContain('render: (mode: AoMode, viewMode: AoViewMode, productOutput?: boolean) => void')
    expect(aoPipelinesSource).toContain('const vbaoTex = vbaoNode.getTextureNode()')
    expect(aoPipelinesSource).toContain('const vbaoRawTex = vbaoNode.getRawTextureNode()')
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
    expect(fullResPolishSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(fullResPolishSource).toContain('clampedPolishAo')
    expect(fullResPolishSource).not.toContain('start: int(-2), end: int(3)')
    expect(fullResPolishSource).not.toContain('abs(centerDepth.sub(tapDepth))')
    expect(halfResCleanupSource).toContain('class VBAOHalfResCleanupNode')
    expect(halfResCleanupSource).toContain('HALF_RES_CLEANUP_OFFSETS')
    expect(halfResCleanupSource).toContain('centerAo.mul(float(4))')
    expect(halfResCleanupSource).toContain('totalWeight = float(4).toVar')
    expect(halfResCleanupSource).toContain('getViewPosition')
    expect(halfResCleanupSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(halfResCleanupSource).not.toContain('start: int(-2), end: int(3)')
    expect(effectPassSource).toContain('passTexture(this as never, this.renderTarget.texture)')
    expect(halfResCleanupSource).toContain('passTexture(this as never, this.renderTarget.texture)')
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

  it('keeps the fused resolve-polish candidate private, spatial, and evidence-only', () => {
    expect(resolvePolishSource).toContain('class VBAOResolvePolishNode extends VBAOEffectPass')
    expect(resolvePolishSource).toContain('VBAO.ResolvePolish')
    expect(resolvePolishSource).toContain('JBU4')
    expect(resolvePolishSource).toContain('POISSON8')
    expect(resolvePolishSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(resolvePolishSource).toContain('vbaoResolvePolishWeightedAo')
    expect(resolvePolishSource).toContain('vbaoResolvePolishTotalWeight')
    expect(resolvePolishSource).toContain('`${prefix}FallbackAo`')
    expect(resolvePolishSource).toContain('`${prefix}BilinearFracY`')
    expect(resolvePolishSource).toContain('vbaoResolvePolishIgnNoise')
    expect(resolvePolishSource).toContain('vbaoResolvePolishClampedAo')
    expect(resolvePolishSource).not.toContain('historyTexture')
    expect(resolvePolishSource).not.toContain('previousDepth')
    expect(resolvePolishSource).not.toContain('previousNormal')
    expect(resolvePolishSource).not.toContain('reprojection')
    expect(resolvePolishSource).not.toContain('frameIndex')
    expect(resolvePolishSource).not.toContain('temporal')
    expect(optionsSource).not.toContain('resolvePolishMode')
    expect(indexSource).not.toContain('VBAOResolvePolishNode')
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
    expect(resolvePolishSource).toContain('computeVbaoBilateralGeometryWeight')
    expect(resolveSource).not.toContain('const normalAgreement =')
    expect(halfResCleanupSource).not.toContain('const normalAgreement =')
    expect(fullResPolishSource).not.toContain('const normalAgreement =')
    expect(resolvePolishSource).not.toContain('const normalAgreement =')
  })

  it('keeps deprecated VBAO option aliases explicit until migration policy changes', () => {
    expect(optionsSource).toContain('readonly quality?: VBAOQualityPreset')
    expect(optionsSource).toContain('/** @deprecated Use `quality`; kept temporarily for older HorizonAO callers. */')
    expect(optionsSource).toContain('readonly preset?: VBAOQualityPreset')
    expect(optionsSource).toContain('/** @deprecated Use `contrast`; kept for GTAONode-style compatibility. */')
    expect(optionsSource).toContain('readonly scale?: number')
    expect(optionsSource).toContain('/** @deprecated Use `strength`; kept for older HorizonAO callers. */')
    expect(optionsSource).toContain('readonly intensity?: number')
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
    expect(resolvePolishSource).toContain('extends VBAOEffectPass')
    expect(fullResPolishSource).not.toContain('new RenderTarget(1, 1')
    expect(resolvePolishSource).not.toContain('new RenderTarget(1, 1')
    expect(fullResPolishSource).not.toContain('RendererUtils.resetRendererState')
    expect(resolvePolishSource).not.toContain('RendererUtils.resetRendererState')
    expect(indexSource).not.toContain('VBAOEffectPass')
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
    expect(profilingProductionReportSource).toContain(
      "return ['noise', 'false-curvature', 'scale-mismatch']",
    )
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
    expect(benchmarkSource).toContain('collectVbaoGpuPassTimings')
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
    expect(benchmarkSource).toContain("const temporalEnabled = productOutput && temporalMode === 'velocity-internal'")
    expect(benchmarkSource).toContain("pass: 'temporal'")
    expect(benchmarkSource).toContain("if (!enabled) return measuredByPass.has(pass) ? 'unexpected' : 'skipped'")
    expect(benchmarkSource).toContain('resolveGpuPassTimings')
    expect(benchmarkSource).toContain("['missing', 'unexpected'].includes(passTiming.status)")
    expect(benchmarkSource).toContain('passTimings: createVbaoPassTimingRows')
    expect(profilingProductionReportSource).toContain('AO Production Pass Timing Status')
    expect(profilingProductionReportSource).toContain(
      '| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |',
    )
    expect(profilingProductionReportSource).toContain("row.hostTaaMode ?? 'n/a'")
    expect(profilingProductionReportSource).toContain('Skipped passes are not zero-cost passes')
  })

  it('ships product-first quality presets without platform labels', () => {
    expect(source).toContain('VBAO_QUALITY_TIERS')
    expect(source).toContain('slices: options.slices ?? quality?.slices ?? fallback.slices')
    expect(source).toContain('samples: options.samples ?? quality?.samples ?? fallback.samples')
    expect(source).toMatch(
      /resolutionScale:\s*options\.resolutionScale \?\? quality\?\.resolutionScale \?\? fallback\.resolutionScale/,
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
    expect(museumSource).toContain(
      "type VbaoSampleMode = 'product-preset' | 'debug-override' | 'spatial-ultra'",
    )
    expect(museumSource).toContain(
      "if (requested === 'debug-override' || requested === 'spatial-ultra') return requested",
    )
    expect(museumSource).toContain("vbaoSampleMode === 'debug-override'")
    expect(museumSource).toContain("vbaoSampleMode === 'spatial-ultra'")
    expect(museumSource).toContain('const VBAO_SPATIAL_ULTRA_SHAPE = { samples: 10, slices: 4 } as const')
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
    expect(museumSource).toContain("type VbaoResolvePolishMode = 'separate' | 'fused'")
    expect(museumSource).toContain('function getRequestedVbaoCleanupMode()')
    expect(museumSource).toContain('function getRequestedVbaoResolvePolishMode()')
    expect(museumSource).toContain('function getRequestedVbaoSoftness()')
    expect(museumSource).toContain("window.location.search).get('vbaoCleanup')")
    expect(museumSource).toContain("window.location.search).get('vbaoResolvePolish')")
    expect(museumSource).toContain("window.location.search).get('vbaoSoftness')")
    expect(museumSource).toContain("return requested === 'skip' ? 'skip' : 'on'")
    expect(museumSource).toContain("return requested === 'fused' ? 'fused' : 'separate'")
    expect(museumSource).toContain('readonly vbaoCleanupMode: VbaoBenchmarkCleanupMode')
    expect(museumSource).toContain('readonly vbaoResolvePolishMode: VbaoBenchmarkResolvePolishMode')
    expect(museumSource).toContain('vbaoCleanupMode: usesVbao ? vbaoCleanupMode : ')
    expect(museumSource).toContain('vbaoResolvePolishMode: usesVbao ? vbaoResolvePolishMode : ')
    expect(museumSource).toContain("enabled: vbaoCleanupMode === 'on'")
    expect(museumSource).toContain(
      "vbaoCleanupMode === 'on' ? cleanupTextureNode : vbaoNode.getRawTextureNode()",
    )
    expect(museumSource).toContain("vbaoResolvePolishMode === 'fused' && polishStrength > 0")
    expect(museumSource).toContain('new VBAOResolvePolishNode')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_CLEANUP_MODE')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_SOFTNESS')
    expect(benchmarkSource).toContain('AO_BENCHMARK_VBAO_RESOLVE_POLISH_MODE')
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoCleanup', 'skip')")
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoSoftness', String(vbaoDemoSoftness))")
    expect(benchmarkSource).toContain("url.searchParams.set('vbaoResolvePolish', 'fused')")
    expect(benchmarkSource).toContain('cleanupMode: mode === ')
    expect(benchmarkSource).toContain('resolvePolishMode: mode === ')
    expect(benchmarkSource).toContain('vbaoSoftness: mode === ')
    expect(benchmarkSource).toContain("cleanupMode !== 'skip'")
    expect(benchmarkSource).toContain("if (label === 'VBAO.ResolvePolish') return 'resolve-polish'")
    expect(benchmarkSource).toContain('Evidence-only final product AO with half-resolution cleanup skipped before resolve')
    expect(benchmarkSource).toContain('Evidence-only final product AO with fused half-resolution resolve-polish candidate')
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
    expect(benchmarkSource).toContain('sampleMode: mode === ')
    expect(benchmarkSource).toContain(
      '${mode}-${vbaoSampleMode}${temporalLabel}${hostTaaLabel}${cleanupLabel}${resolvePolishLabel}${softnessLabel}-${vbaoResolutionLabel}',
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
