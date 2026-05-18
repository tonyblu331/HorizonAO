# HorizonAO Current Shape And Roadmap

Status: current implementation spec  
Date: 2026-05-18  
Branch observed: `main`  
Scope: active change `verify-horizonao-math-denoise`

## Active SDD Change

Latest completed change: `openspec/changes/verify-horizonao-math-denoise/`

Latest research revision: `openspec/horizonao-math-revision-2025.md`

Current blocker: issue #9, HorizonAO AO debug output feedback loop.

Purpose:

- verify scalar AO math policy before aesthetic tuning
- correct fixed-orientation raw kernel sampling with deterministic rotation
- add spatial depth/normal-aware denoise
- render `denoised-ao` as real output, not metadata
- keep temporal, XR/stereo, bitmask AO, bent normals, and N8AO integration out of this PR

Post-merge visual review revised the verdict: the code path exists, but local screenshots show HorizonAO `raw-ao` and `denoised-ao` displaying the colored scene instead of grayscale AO under the WebGL fallback path. Console logs report a framebuffer/texture feedback loop. Fix that before math v2.

## 1. Current Product Shape

HorizonAO is currently a Three.js TSL-first ambient occlusion prototype with a raw horizon/GTAO-inspired node and a parity harness.

It is implemented enough to prove the integration contract:

- consume scene depth, optional scene normal, and camera
- render a scalar AO target through a TSL `TempNode`
- composite AO in a `RenderPipeline`
- compare against Three's own `GTAONode`
- capture repeatable metadata and screenshots in Playwright
- expose rendered debug views for raw AO, denoised AO, linear depth, and normals

It is not yet production-quality AO. The missing pieces are still the real ones: correct scalar AO debug output, quality tuning, WebGPU-native validation, proper GPU timing capture, failure-case screenshots, and measured comparison against non-Three baselines.

## 2. Implemented Core API

The public core API is intentionally small:

```ts
const ao = horizonAO(depthNode, normalNode, camera, {
  radius: 1.25,
  intensity: 1.0,
  falloff: 0.85,
  thickness: 0.5,
  slices: 3,
  samples: 12,
  resolutionScale: 0.5,
})
```

Exports in `@horizonao/core`:

- `horizonAO(depthNode, normalNode, camera, options)`
- `horizonAODenoise(aoNode, depthNode, normalNode, camera, options)`
- `HorizonAoNode`
- `HorizonAoDenoiseNode`
- `DEFAULT_HORIZON_AO_NODE_OPTIONS`
- `DEFAULT_HORIZON_AO_DENOISE_OPTIONS`
- `HorizonAoNodeOptions`
- scalar math helpers for clamps, sample splitting, falloff, center bias, and accessibility resolve
- settings helpers and presets
- parity harness metadata helpers

Current default node options:

| Option            | Default | Clamp           |
| ----------------- | ------: | --------------- |
| `radius`          |  `1.25` | `0.05..8`       |
| `intensity`       |     `1` | `0..4`          |
| `falloff`         |  `0.85` | `0..1`          |
| `thickness`       |   `0.5` | `0..4`          |
| `slices`          |     `3` | integer `1..8`  |
| `samples`         |    `12` | integer `2..32` |
| `resolutionScale` |   `0.5` | `0.25..1`       |

## 3. Node Architecture

`HorizonAoNode` mirrors the useful shape of Three's `GTAONode`:

- extends `TempNode<'float'>`
- owns an internal `RenderTarget`
- stores the result in a single-channel `RedFormat` texture
- exposes that result with `passTexture(this, renderTarget.texture)`
- renders once per frame in `updateBefore()`
- defines raw AO shader logic in `setup(builder)`
- returns a scalar texture node via `getTextureNode()`

Current lifecycle:

```text
horizonAO(...)
  -> new HorizonAoNode(...)
  -> configure(options)
  -> setup(builder)
       -> define raw AO TSL function
       -> assign material.fragmentNode
       -> return AO texture node
  -> updateBefore(frame)
       -> resize internal AO target using renderer drawing buffer
       -> render fullscreen quad into AO target
  -> caller composites AO texture in RenderPipeline
```

The node does not create a renderer fallback. Renderer backend selection remains owned by Three's `WebGPURenderer`.

## 4. Raw AO Kernel

The current kernel is a raw horizon-style approximation with deterministic per-pixel rotation.

Input facts:

- depth node
- normal node, nullable
- camera projection matrix
- camera inverse projection matrix
- camera near and far

Normal policy:

- if `normalNode !== null`, sample MRT normal
- if `normalNode === null`, reconstruct normal from depth with Three TSL `getNormalFromDepth`

Depth policy:

- sample depth from the provided scene depth texture
- if logarithmic depth buffer is enabled, convert through Three's logarithmic-depth helpers
- reconstruct view positions with `getViewPosition`

Kernel structure:

- `sampleDepth`
- `sampleNormal`
- `buildSliceFrame`
- `computeSampleOffset`
- `updateHorizon`
- `marchHorizonPair`
- `resolveSliceOcclusion`
- magic-square sample rotation and radius jitter

Approximation flow:

```text
for each slice:
  build tangent frame around the current view normal
  initialize two horizon cosine values

  for each step:
    march in positive slice direction
    march in negative slice direction
    sample scene depth at projected sample positions
    reconstruct sample view positions
    update horizon if sample is within thickness threshold

  resolve slice contribution from horizons and projected normal

average slices
clamp accessibility
apply intensity power
return scalar AO
```

Current limitations:

- no depth pyramid
- no AO temporal history
- no bent normals
- no material or skip mask
- no explicit bilateral upscale policy beyond target resolution scale
- `@ts-nocheck` remains isolated to the node file because Three TSL typings are still too narrow for this shader-authoring style

## 5. Demo Harness

The demo app is the current proof surface.

Scenes:

| Scene          | Route      | Purpose                               |
| -------------- | ---------- | ------------------------------------- |
| Primitive Grid | `/`        | Contact/depth sanity                  |
| Sponza         | `/sponza`  | Architecture, scale, occlusion stress |
| Suzanne        | `/suzanne` | Clay model readability                |
| Stanford Bunny | `/bunny`   | Dense geometry benchmark shape        |

Baselines:

| Baseline          | Status     | Current behavior                                     |
| ----------------- | ---------- | ---------------------------------------------------- |
| `scene-only`      | available  | Scene render without AO baseline                     |
| `three-gtao-node` | available  | Three TSL `GTAONode` baseline with temporal disabled |
| `horizonao-raw`   | available  | Current raw HorizonAO node                           |
| `n8ao-webgl2`     | pending    | Listed, not implemented                              |
| `n8ao-webgpu`     | unverified | Listed honestly, not treated as available            |

The harness panel exposes:

- scene key
- baseline
- baseline status
- debug view
- debug-view status
- render backend
- resolution
- DPR
- artifact name
- GPU timing status/source

## 6. Debug Views

Debug views are split into rendered views and metadata-only future views.

Rendered today:

| Debug view     | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| `none`         | Composite scene color multiplied by denoised scalar AO when available |
| `raw-ao`       | AO texture shown as grayscale                                         |
| `denoised-ao`  | Spatial depth/normal-aware denoised AO shown as grayscale             |
| `linear-depth` | scene pass linear depth shown as grayscale                            |
| `normal`       | MRT normal remapped from `[-1,1]` to `[0,1]`                          |

Metadata-only today:

| Debug view          | Reason                               |
| ------------------- | ------------------------------------ |
| `edge-confidence`   | no edge confidence pass exists yet   |
| `history-rejection` | no temporal pass exists yet          |
| `resolution-scale`  | no dedicated preview view exists yet |

This distinction matters. A dropdown entry is not a feature. The harness now exposes `data-debug-view-status="rendered"` or `"metadata-only"` so tests and reviewers can tell the difference.

## 7. Test And Verification Shape

Current local verification coverage:

- core Vitest tests for settings, parity metadata, API/default stability
- core TypeScript check
- core `tsgo` check
- demo TypeScript check
- demo `tsgo` check
- ESLint
- Playwright route smoke tests
- Playwright parity metadata checks
- Playwright screenshot artifacts
- Playwright Three GTAONode baseline smoke
- Playwright HorizonAO raw baseline smoke
- Playwright grid debug-view matrix for rendered debug views
- package build with `tsdown`

Important caveat:

Local Playwright currently reports:

```text
THREE.WebGPURenderer: WebGPU is not available, running under WebGL2 backend.
```

That means the E2E suite is valid smoke coverage for the Three renderer fallback path. It is not proof of WebGPU validation clean execution.

## 8. Current Technical Debt

### TSL Typing Debt

`packages/horizon-ao/src/horizonAoNode.ts` has `@ts-nocheck`.

Reason: Three TSL runtime supports chainable node operations used by shader-authoring code, but the public TypeScript declarations do not fully model those composed display nodes yet.

Rule: keep this isolated. Do not let `@ts-nocheck` spread.

### Demo Debug Helper Casts

`apps/demo/src/scenes/aoDebugOutput.ts` uses a local `TslChainNode` bridge.

Reason: same TSL typing gap, isolated to debug output routing.

Rule: this helper is acceptable only because it is demo harness code. Core node typing should be improved separately.

### GPU Timing Is Not Yet Production Evidence

The harness records timing status and uses timestamp queries when available, but local runs often report unsupported timing because the browser backend falls back to WebGL2.

Rule: do not claim performance wins until timestamps are captured on a true WebGPU-capable environment.

## 9. How It Works End To End

Current render path for AO baselines:

```text
R3F scene
  -> WebGpuCanvas creates Three WebGPURenderer and awaits renderer.init()
  -> ScenePage selects baseline and debug view
  -> RenderBackendProbe records backend metadata
  -> selected baseline creates RenderPipeline
  -> scene pass writes output + normal MRT
  -> baseline samples scene depth and normal
  -> AO node produces scalar AO target
  -> optional HorizonAO denoise pass produces scalar denoised AO target
  -> createAoDebugOutput chooses composite or debug visualization
  -> useFrame renders pipeline
  -> ParityHarnessPanel publishes metadata for Playwright and humans
```

Three GTAONode baseline:

```text
scenePass depth + normal + camera
  -> three/addons/tsl/display/GTAONode.js
  -> temporal disabled
  -> same debug-output helper
```

HorizonAO baseline:

```text
scenePass depth + normal + camera
  -> horizonAO(...)
  -> raw HorizonAoNode AO target
  -> horizonAODenoise(...)
  -> denoised HorizonAoDenoiseNode AO target
  -> same debug-output helper
```

This is the right comparison shape. Same scene, same camera, same route, same render pipeline style.

## 10. Roadmap

Next PRs after `verify-horizonao-math-denoise` and the 2025+ math revision:

### Next PR-00: Fix AO Debug Output Feedback Loop

Goal: make HorizonAO debug views prove actual scalar AO.

Tasks:

- fix issue #9
- remove the framebuffer/texture feedback loop in local fallback
- make `horizonao-raw/raw-ao` render grayscale AO
- make `horizonao-raw/denoised-ao` render grayscale denoised AO
- add an E2E assertion that rejects colored-scene output in AO debug views

Exit criteria:

- screenshots show grayscale AO for HorizonAO raw and denoised views
- no feedback-loop warning
- debug metadata and pixels agree

### Next PR-01: Raw And Denoised Failure-Case Review

Goal: make quality issues visible before further features.

Tasks:

- capture scene-only, Three GTAONode raw, HorizonAO raw, and HorizonAO denoised screenshots for all four scenes
- annotate halos, thin geometry failures, silhouettes, over-occlusion, under-occlusion, and denoise edge bleeding
- keep local WebGL fallback screenshots labeled as smoke only

Exit criteria:

- screenshot set exists for raw and denoised AO
- failure cases are documented
- no performance claims without timestamp data

### Next PR-02: True WebGPU Validation Gate

Goal: separate smoke fallback coverage from WebGPU validation.

Tasks:

- assert `data-render-backend="webgpu"` in a capable environment
- capture WebGPU validation errors explicitly
- keep WebGL fallback as smoke coverage only

### Next PR-03: Resolution Scale And Upscale Policy

Goal: make half-res AO target size, memory, and upscale artifacts honest.

Tasks:

- report AO target bytes from actual scaled targets
- verify resize and DPR reset
- add resolution-scale debug preview

### Next PR-04: Signed Horizon Math v2

Goal: revise raw AO math only after debug output is trustworthy.

Tasks:

- replace ambiguous cosine accumulator with signed horizon-angle terminology
- create CPU scalar reference cases before TSL changes
- validate no-occluder, symmetric occluder, far-background, and full-blocker cases
- compare raw output against Three `GTAONode`

Exit criteria:

- CPU reference tests pass
- TSL output matches reference cases within tolerance
- screenshots show real AO, not scene color

### Next PR-05: Sampling And Denoise Ablation

Goal: choose sample rotation/noise based on post-denoise image quality.

Candidates:

- current magic-square rotation
- blue-noise or void-and-cluster texture
- filter-adapted pattern inspired by EA SEED 2024

Exit criteria:

- raw and denoised screenshots exist for each candidate
- no fake performance claims
- selected pattern is justified by visible artifact reduction

Historical roadmap below remains useful context but is superseded by the next-PR list above.

### PR-07: True WebGPU Validation Gate

Goal: separate smoke fallback coverage from WebGPU validation.

Tasks:

- add a test or manual script that asserts `data-render-backend="webgpu"` when the environment supports it
- document how to run Chromium with WebGPU enabled on the target machine
- mark fallback runs as smoke only
- capture WebGPU validation errors explicitly

Exit criteria:

- one environment produces true WebGPU backend metadata
- WebGPU run is validation clean
- fallback path remains tested but not oversold

### PR-08: Raw AO Quality Audit

Goal: make the raw kernel visually intelligible before denoise.

Tasks:

- capture raw AO screenshots for all four scenes
- compare against Three GTAONode raw AO
- tune radius, thickness, falloff, slices, samples against visible artifacts
- add failure notes for halos, thin geometry, silhouettes, over-occlusion, under-occlusion

Exit criteria:

- screenshot set exists for raw AO
- no fake performance claims
- clear list of kernel artifacts to fix before denoise

### PR-09: Denoise v0

Goal: add a depth/normal-aware denoise pass.

Tasks:

- implement AO denoise as a separate node/pass
- use depth and normal edges
- add `denoised-ao` rendered debug view
- keep temporal off
- compare raw vs denoised screenshots

Exit criteria:

- denoise improves noise without obvious edge bleeding
- E2E covers `denoised-ao`
- memory and pass cost are reported

### PR-10: Resolution Scale And Upscale Policy

Goal: make half-res AO honest.

Tasks:

- verify AO target size at `resolutionScale`
- add resolution-scale debug preview
- report AO target bytes from actual scaled size, not just viewport estimate
- test resize and DPR changes

Exit criteria:

- resize/DPR reset works
- half-res artifacts are visible and documented
- memory estimate matches AO target policy

### PR-11: Measurement Harness

Goal: replace timing placeholders with credible measurement.

Tasks:

- capture timestamp-query timings where WebGPU supports them
- store timing metadata alongside screenshots
- record unsupported/unavailable states without inventing numbers
- add repeat-count policy for noisy measurements

Exit criteria:

- timing is either captured or explicitly unsupported
- no benchmark table exists without measured data

### PR-12: Normal Fallback Test Path

Goal: prove depth-reconstructed normals are usable enough as fallback.

Tasks:

- add a harness toggle or baseline variant with `normalNode === null`
- render `normal` debug view for MRT and reconstructed normals
- test thin edges, silhouettes, and depth discontinuities

Exit criteria:

- normal fallback path is exercised
- failure modes are documented

### PR-13: N8AO Baseline Investigation

Goal: compare honestly against available N8AO options.

Tasks:

- implement N8AO WebGL2 baseline only if it fits the current demo architecture without distorting it
- investigate any real N8AO-WebGPU artifact before listing it as available
- keep N8AO-WebGPU status as `unverified` until a concrete source exists

Exit criteria:

- no fake N8AO-WebGPU claim
- comparison uses same scene, camera, resolution, and artifact metadata

### PR-14: R3F/Drei Adapter

Goal: add adapter only after node semantics are stable.

Tasks:

- expose a small React wrapper for the stable node
- avoid adding product knobs that core does not support
- preserve existing render-pipeline assumptions

Exit criteria:

- adapter is a thin integration layer
- core AO remains framework-independent

## 11. Do Not Do Yet

Do not add:

- temporal AO by default
- bitmask AO
- bent normals
- layered depth
- tile routing
- GI or SSGI
- neural AO
- custom renderer fallback
- public clever abstractions like `visibilityMode` or `geometryMode`

The foundation is still raw AO plus evidence. Denoise comes next. Temporal comes later. Everything else has to earn its place.

## 12. Current Decision

Decision: approve current shape as a credible TSL-first foundation, with conditions.

Conditions:

- raw AO quality must be audited before denoise tuning
- denoise must be a separate, measurable PR
- WebGPU validation must be proven in a real WebGPU backend
- no performance claims without timestamp data
- keep renderer fallback out of HorizonAO
- keep API boring until screenshots and timings justify more knobs
