# Exploration: verify-horizonao-math-denoise

## Current State

`HorizonAoNode` is already shaped like Three `GTAONode`: `TempNode<'float'>`, internal `RenderTarget`, `passTexture`, and `updateBefore()` rendering a single-channel target. It consumes depth, optional normal, and camera. If the normal node is null, it reconstructs normals with Three TSL `getNormalFromDepth`.

The current raw kernel is GTAO/HBAO-shaped but not fully proven. It has slices, paired horizon marching, thickness rejection, center-biased sample distance, falloff weighting, and scalar accessibility output. Missing pieces before this change: sample rotation/noise, math policy tests, spatial denoise, and rendered `denoised-ao`.

Primary references:

- Three `GTAONode` documents `TempNode`, optional normal reconstruction, `resolutionScale`, temporal optionality, and manual denoise when temporal is false: https://threejs.org/docs/pages/GTAONode.html
- Activision GTAO frames AO as an approximation to the ambient occlusion integral, with practical spatio-temporal filtering: https://research.activision.com/publications/archives/atvi-tr-16-01practical-realtime-strategies-for-accurate-indirect-occlusion
- XeGTAO uses depth, optional normals, scalar AO output, spatial filtering, and optional TAA: https://github.com/GameTechDev/XeGTAO
- AMD CACAO requires depth, projection data, optional normals, and outputs one-channel AO: https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- Wu 2025 is stereo-aware SSAO research and should be deferred from v1: https://kevincosner.github.io/publications/Wu2025ESS/

## Affected Areas

- `packages/horizon-ao/src/horizonAoNode.ts` - raw kernel, new denoise pass, exports.
- `packages/horizon-ao/src/horizonAoMath.ts` - new scalar policy helpers.
- `packages/horizon-ao/src/parityHarness.ts` - rendered debug view status.
- `apps/demo/src/scenes/HorizonAoRawBaseline.tsx` - raw plus denoised AO pipeline.
- `apps/demo/src/scenes/aoDebugOutput.ts` - denoised debug routing.
- `apps/demo/e2e/scene-routes.spec.ts` - rendered debug matrix.

## Approaches

1. Three `DenoiseNode` wrapper pass
   - Pros: TSL-first, matches Three local post-processing pattern, depth/normal aware.
   - Cons: inherits Three denoise behavior and TSL type gaps.
   - Effort: Medium.

2. Custom denoise from scratch
   - Pros: full control over weights and debug channels.
   - Cons: more shader surface before raw AO is proven.
   - Effort: High.

## Recommendation

Use a compact HorizonAO denoise pass that wraps Three's TSL denoise logic and owns a HorizonAO render target. Keep temporal out. Add pure tests for scalar math and no fake performance claims.

## Risks

- Denoise can hide raw kernel defects if reviewers look only at composite output.
- Local Playwright may remain WebGL2 fallback, so WebGPU validation cannot be claimed.
