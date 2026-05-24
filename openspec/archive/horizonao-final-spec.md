# HorizonAO Final Specification

Status: final product and technical specification  
Decision: approve with conditions  
Scope: Three.js TSL/WebGPU ambient occlusion node

## 1. Product Definition

HorizonAO is a focused ambient occlusion solution for Three.js TSL/WebGPU. It computes a compact scalar occlusion term from the smallest useful screen-space geometry facts:

- depth
- normal
- camera
- optional velocity
- optional skip or material mask

HorizonAO is AO-first. It is a horizon/GTAO-inspired screen-space ambient occlusion node, not a rendering framework.

HorizonAO is not:

- a GI system
- a ray tracing fallback
- neural AO
- SSGI
- a full visibility framework
- a material lighting system
- a general post-processing graph
- an antialiasing system

The public promise is boring and narrow: given scene depth, scene normals, and a camera, produce stable, high-quality scalar AO that composites predictably before final antialiasing.

## 2. Technical Positioning

Verified reference points:

- Three.js `GTAONode` is a TSL post-processing node that consumes depth, normals, and camera. Its docs show MRT normals, depth texture access, `resolutionScale`, and optional temporal filtering that requires `TRAANode`.
- Three.js `GTAOPass` is a WebGL composer pass. It can create or accept a G-buffer and includes Poisson denoise controls.
- N8AO is a mature WebGL2/postprocessing AO pass focused on visual quality, artist controls, temporal stability, half-res mode, and debug modes. Its public README currently says it is not WebGPU compatible.
- XeGTAO is the main modern GTAO reference style: fixed budget, practical approximations, denoising, and benchmarkable image quality rather than theoretical completeness.
- ASSAO and CACAO are production-grade SSAO families with deinterleaving, edge-aware blur, optional normal reconstruction, quality presets, and adaptive/high-quality branches.

### Parity Table

| Capability                              | Three.js GTAONode                    | Three.js GTAOPass            | N8AO                               | N8AO-WebGPU  | XeGTAO                       | CACAO / ASSAO                 | HorizonAO v1 verdict        |
| --------------------------------------- | ------------------------------------ | ---------------------------- | ---------------------------------- | ------------ | ---------------------------- | ----------------------------- | --------------------------- |
| WebGPU / TSL integration                | ✓                                    | Gap, WebGL pass              | Gap, WebGL2                        | Unverified   | Gap, native/reference code   | Gap, native/reference code    | Must be native TSL/WebGPU   |
| Boring depth + normal + camera contract | ✓                                    | Partial, scene/pass oriented | Partial, scene/pass oriented       | Unverified   | ✓ conceptually               | ✓                             | Keep                        |
| Normal MRT path                         | ✓                                    | ✓ via G-buffer               | Internal scene path                | Unverified   | Engine-dependent             | ✓                             | Required                    |
| Normal reconstruction fallback          | ✓                                    | Possible via internal path   | Internal behavior                  | Unverified   | Engine-dependent             | ✓                             | Required                    |
| Resolution scale                        | ✓                                    | Manual pass sizing           | ✓ half-res                         | Unverified   | Engine-dependent             | ✓ deinterleave/adaptive paths | Required                    |
| Denoise                                 | Manual `DenoiseNode` if temporal off | ✓ Poisson denoise            | ✓ denoise controls                 | Unverified   | ✓ expected                   | ✓ edge-aware blur             | Required                    |
| Temporal                                | Optional, tied to TRAA               | Gap                          | Accumulation, no motion vectors    | Unverified   | Engine-dependent             | Not core                      | Optional AO-specific only   |
| AA agnostic                             | Partial, temporal path requires TRAA | ✓                            | Recommends SMAA                    | Unverified   | ✓ conceptually               | ✓                             | Required                    |
| Debug views                             | Limited                              | Output modes                 | ✓ display/debug modes              | Unverified   | Implementation-dependent     | Sample/debug tooling          | Required                    |
| Measurable GPU timings                  | Not productized                      | Not productized              | Debug timing via WebGL timer query | Unverified   | Reference expected           | Reference expected            | Required in harness         |
| Compact API                             | Medium                               | Pass-heavy                   | Large artist API                   | Unverified   | Reference, not JS API        | Native SDK style              | Keep boring                 |
| Production credibility                  | Good baseline, tied to Three         | Legacy/WebGL useful          | Mature WebGL competitor            | Not verified | Strong algorithmic reference | Strong production reference   | Earn through parity harness |

### Candid Verdicts

Three.js `GTAONode` is the closest integration model. HorizonAO should not pretend it invented the contract. The product opportunity is quality, denoise discipline, debugability, AA independence, and measurable presets.

Three.js `GTAOPass` is useful as a legacy WebGL baseline, but it is not the target architecture. It is pass/composer-oriented and not TSL/WebGPU-first.

N8AO is the visual/product benchmark for Three.js users. Do not dismiss it. Its public package is WebGL2, not WebGPU, so HorizonAO only wins if it proves comparable quality in the WebGPU pipeline with fewer assumptions.

N8AO-WebGPU cannot be treated as a real competitor without a specific source artifact. If a fork exists, benchmark it. If not, mark the gate as "not available" and move on.

XeGTAO is the algorithmic north star, not a dependency. Copying a name or equation is worthless. The useful lesson is disciplined sample budget, visible ablations, denoise strategy, and real timing.

CACAO / ASSAO are too broad to copy directly for v1. Their deinterleaving, depth MIP, edge output, and adaptive branches are credible, but HorizonAO should only adopt them after raw AO and denoise are proven.

## 3. Final Architecture

Lean pass graph:

```text
Scene color / depth / normal
  -> linear depth / normal policy
  -> horizon AO core
  -> edge-aware denoise
  -> optional AO temporal
  -> AO composite
  -> final AA, if any
```

Do not overbuild this graph. The v1 graph has one job: produce AO and composite it cleanly. Every extra pass must answer:

- What artifact does it fix?
- What is the measured GPU cost?
- Which debug view or screenshot proves the tradeoff?

### Pass Responsibilities

| Stage                        | Responsibility                                      | Must not do                                    |
| ---------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| Scene color / depth / normal | Provide color, depth, and normal nodes or textures  | Re-render geometry by default                  |
| Linear depth / normal policy | Resolve depth convention and normal source          | Hide mismatched spaces                         |
| Horizon AO core              | Compute raw scalar occlusion                        | Composite, blur, or temporal blend             |
| Edge-aware denoise           | Reduce AO noise using depth and normal edges        | Invent lighting data                           |
| Optional AO temporal         | Reuse AO history with confidence and rejection      | Depend on TRAA                                 |
| AO composite                 | Apply scalar AO to scene color or expose AO texture | Own final AA                                   |
| Final AA                     | TRAA, SMAA, FXAA, MSAA resolve path, or none        | Feed back into AO unless explicitly configured |

## 4. Geometry Policy

### Required Facts

Depth is required because screen-space AO reconstructs local scene positions or depth deltas from the current view.

Normal is required because AO must distinguish contact shadowing from flat depth variation. MRT normals are preferred. Reconstructed normals are allowed as a fallback, but they must be visibly tested because depth-derived normals fail around thin geometry, silhouettes, and discontinuities.

Camera is required because projection, unprojection, radius scaling, and depth linearization depend on camera parameters.

### Optional Facts

Velocity is optional. Use it only for AO-specific temporal reuse and history rejection. Do not require velocity for the non-temporal path.

Skip or material mask is optional. It exists to exclude surfaces such as sky, HUD-like geometry, transparent overlays, or objects where AO is intentionally disabled. v1 should support a simple scalar mask, not a bitmask taxonomy.

### Discarded Facts

HorizonAO discards:

- UVs
- topology
- tangents
- albedo
- roughness
- metalness
- material graph
- object hierarchy

Those are lighting, material, or asset facts. They are not required to estimate scalar ambient accessibility from screen-space geometry. Pulling them into the contract makes the product slower, harder to integrate, and easier to mis-scope.

### Re-render Policy

HorizonAO should not re-render geometry by default. Re-rendering adds scene traversal cost, doubles material edge cases, complicates alpha/displacement semantics, and makes integration less predictable. The default path consumes depth and normal outputs from the main scene pipeline.

Allowed exceptions:

- The host app cannot provide normals and opts into a documented normal prepass.
- A test harness intentionally renders a comparable G-buffer for baseline parity.
- A future adapter chooses a convenience path, clearly labeled as adapter behavior, not the core node contract.

## 5. AA Relationship

HorizonAO is AA-agnostic. It should work before final antialiasing and must not require any specific AA system.

| AA path             | Required behavior                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TRAA                | AO can run before TRAA. AO-specific temporal may use velocity/history, but must not require `TRAANode`. If TRAA is active, validate ghosting and history rejection independently. |
| SMAA                | AO runs before SMAA. SMAA cleans final geometric/color edges but does not fix noisy AO. Denoise still belongs inside HorizonAO.                                                   |
| FXAA                | AO runs before FXAA. FXAA may soften final AO/composite edges, but raw AO must still be acceptable.                                                                               |
| MSAA resolved paths | AO consumes resolved or texture-readable depth/normal policy as provided by Three/WebGPU. Do not assume unresolved MSAA textures are sampleable in the AO node.                   |
| No AA               | AO must still be usable. This is the hard truth test for raw sampling and denoise.                                                                                                |

HorizonAO is not an AA system. If AO shimmers, fix AO sampling, denoise, radius policy, or AO history. Do not hide it behind final AA and call it solved.

## 6. Core Math

Current revision note: see `openspec/horizonao-math-revision-2025.md`. The next math direction is signed horizon-angle integration with CPU scalar references, but it is blocked until HorizonAO `raw-ao` and `denoised-ao` debug views visibly render scalar grayscale AO instead of the scene color.

Ambient accessibility:

```text
A(p) = 1 / pi * integral over Omega of V(p, omega) * max(0, n dot omega) d omega
O(p) = 1 - A(p)
```

Where:

- `p` is the shaded point
- `n` is the surface normal
- `omega` is an incoming hemisphere direction
- `V(p, omega)` is visibility along that direction
- `A(p)` is accessibility
- `O(p)` is occlusion

HorizonAO approximates this integral in screen space. It does not trace scene geometry. It samples neighboring depth, reconstructs local positions or depth deltas, estimates horizon angles around the current pixel, and turns missing accessible hemisphere into scalar occlusion.

Implementation terminology must distinguish accessibility from occlusion. The stored scalar should be documented as accessibility when `1` means fully open and `0` means fully dark. If a pass stores strict occlusion instead, it must explicitly store `O = 1 - A` and composite accordingly.

### Practical Horizon/GTAO Approximation

Horizon slices divide the projected hemisphere into a small number of oriented screen-space directions. Each slice searches for the strongest horizon formed by nearby depth samples.

The revised estimator should use explicit signed horizon angles:

```text
For slice direction s_i:
  b_i = normalize(cross(s_i, viewDir))
  t_i = cross(b_i, viewDir)
  n_i = normalize(n - b_i dot n * b_i)
  gamma_i = atan2(dot(n_i, t_i), dot(n_i, viewDir))

  h_i+ = max horizon angle in +s_i
  h_i- = max horizon angle in -s_i

  A_i = integrated visible arc around gamma_i using h_i+ and h_i-
  A = saturate(mean_i(A_i))
```

This should be implemented only after CPU scalar reference cases exist. The CPU reference convention is: integrate `max(0, cos(theta - normalAngle))` over the visible signed horizon arc and normalize by the full cosine hemisphere integral of `2`. Do not copy an arc-integration formula from any paper or implementation without reference tests.

Center-biased sampling spends more taps near the current pixel because contact AO and small creases dominate perceived quality. Larger-radius samples matter, but they should be weighted down by falloff and validated against haloing.

Radius falloff attenuates samples as distance approaches the configured world-space or view-space AO radius. The product API exposes radius and falloff. It does not expose a grab bag of theory knobs unless those knobs survive ablation.

Depth and normal-aware denoise is mandatory because low sample counts are noisy. The denoiser must avoid bleeding across depth and normal discontinuities. It should output or internally track edge confidence for debugging.

Sampling must be evaluated after denoise, not only in raw AO. The next sampling ablation should compare magic-square rotation, blue-noise or void-and-cluster texture, and filter-adapted sampling inspired by EA SEED 2024.

Optional AO history confidence may combine previous AO with current AO if temporal is enabled. Confidence should reject history on depth changes, normal changes, camera cuts, resize, DPR change, projection changes, and optionally velocity mismatch. Temporal is an optimization and stability feature, not a crutch for a weak spatial result.

## 7. API Shape

The API should be boring. Boring APIs age well.

```ts
const ao = horizonAO(depthNode, normalNode, camera, {
  radius: 1.25,
  intensity: 1.0,
  falloff: 0.85,

  slices: 3,
  samples: 12,
  resolutionScale: 0.5,

  denoise: true,
  temporal: false,

  outputFormat: 'auto',
  debug: 'none',
})
```

### Proposed Types

```ts
type HorizonAoDebugView =
  | 'none'
  | 'raw'
  | 'denoised'
  | 'linear-depth'
  | 'normal'
  | 'edge-confidence'
  | 'history-rejection'
  | 'resolution-scale'

interface HorizonAoOptions {
  radius?: number
  intensity?: number
  falloff?: number
  slices?: number
  samples?: number
  resolutionScale?: number
  denoise?: boolean
  temporal?: boolean
  velocityNode?: Node
  maskNode?: Node
  outputFormat?: 'auto' | 'r8' | 'r16f'
  debug?: HorizonAoDebugView
}
```

Avoid names like `visibilityMode`, `memoryMode`, `geometryMode`, or `qualityArchitecture`. That is not architecture. That is API theater.

### Defaults

| Option            | Default | Reason                                                                     |
| ----------------- | ------- | -------------------------------------------------------------------------- |
| `radius`          | `1.25`  | Useful starting radius, scene-scale tunable                                |
| `intensity`       | `1.0`   | Neutral scalar AO                                                          |
| `falloff`         | `0.85`  | Bias away from long-range halos                                            |
| `slices`          | `3`     | Lean GTAO-style starting point                                             |
| `samples`         | `12`    | Moderate spatial cost                                                      |
| `resolutionScale` | `0.5`   | Common performance baseline, must be validated                             |
| `denoise`         | `true`  | Low-sample AO needs denoise                                                |
| `temporal`        | `false` | Must not be default until stable                                           |
| `outputFormat`    | `auto`  | Let implementation choose `r8` or `r16f` based on platform and debug needs |
| `debug`           | `none`  | Production default                                                         |

## 8. Presets

Presets are starting points, not quality claims. They must be backed by screenshots and GPU timings before release notes say anything stronger.

| Preset       | slices | samples | resolutionScale | denoise | temporal | Intent                                                      |
| ------------ | -----: | ------: | --------------: | ------- | -------- | ----------------------------------------------------------- |
| Fast         |      2 |       8 |             0.5 | true    | false    | Lowest reasonable cost path for demos and low-power devices |
| Balanced     |      3 |      12 |             0.5 | true    | false    | Default candidate. Must look good without temporal          |
| Quality      |      4 |      16 |     0.75 or 1.0 | true    | false    | Higher spatial quality for desktop/WebGPU demos             |
| Experimental |     4+ |     16+ |        variable | true    | optional | Research switchboard, not v1 default                        |

Balanced must not require temporal. If Balanced only looks good with temporal, the raw AO or denoise is not good enough. Ponete las pilas.

## 9. Debug Views

Required debug outputs:

- raw AO
- denoised AO
- linear depth
- normal
- edge confidence
- history rejection, if temporal is enabled
- resolution scale / half-res preview

Debug views are not nice-to-have. They are how users and maintainers distinguish bad normals, bad depth linearization, bad radius, bad denoise, bad temporal rejection, and bad final composite.

## 10. Production Readiness Checklist

### Judgment Day Gates

HorizonAO is not production-ready until these are true:

- Real comparison against Three.js `GTAONode`
- Real comparison against N8AO WebGL2
- Real comparison against N8AO-WebGPU if a verifiable implementation exists
- Same scene
- Same camera
- Same resolution
- Same DPR
- Same AO radius scale convention or explicitly documented conversion
- GPU timings captured with supported timestamp/timer query path
- Memory budget reported by render target count, dimensions, and formats
- WebGPU validation clean
- Resize reset tested
- DPR reset tested
- Camera cut reset tested
- Normal MRT path tested
- Normal reconstruction fallback tested
- Temporal off path looks good
- TRAA path works
- SMAA path works
- FXAA path works or is documented as neutral composite-only AA
- No-AA path is acceptable
- Debug views match actual intermediate data
- No fake benchmarks
- No cherry-picked screenshots without failure cases

### Baseline Scenes

Minimum scene matrix:

- Primitive grid for contact and scale sanity
- Suzanne or equivalent clay object for curved normal behavior
- Stanford Bunny or dense mesh for high-frequency normal/depth behavior
- Sponza for architectural depth, thin edges, and interior occlusion

### Failure Cases To Track

- halos around foreground silhouettes
- over-dark creases
- under-occluded corners
- depth-discontinuity bleeding
- normal reconstruction artifacts
- thin geometry instability
- camera orbit shimmer
- temporal ghosting
- resize/DPR stale history
- transparent or alpha-tested geometry mismatch

## 11. Roadmap

PR-00: parity harness

PR-00.5: fix debug output feedback loop

- Fix HorizonAO raw and denoised debug views so they render scalar grayscale AO.
- Add visual or pixel-level E2E assertions that reject colored-scene output in AO debug views.
- Do not proceed to math v2 while this fails.

- Add comparable scenes, cameras, screenshot capture, debug toggles, and GPU timing plumbing.
- Establish Three.js `GTAONode` baseline.
- Establish N8AO WebGL2 baseline if integration is practical in the harness.

PR-01: raw horizon AO kernel

- Implement raw scalar horizon/GTAO-style AO.
- Consume depth, normal, and camera.
- Support normal MRT path first.
- Add raw AO debug view.

PR-01.5: signed horizon math v2

- Add CPU scalar references for no-occluder, full-blocker, symmetric occluder, and far-background cases.
- Replace ambiguous cosine accumulator with signed horizon-angle integration only after references pass.
- Compare against Three `GTAONode` and XeGTAO-style expectations.

PR-02: denoise

- Add depth/normal-aware denoise.
- Add edge confidence debug view.
- Compare raw vs denoised screenshots.

PR-03: resolution scale

- Add `resolutionScale`.
- Add depth-aware upscale if needed.
- Validate 0.5 and 1.0 paths.

PR-04: depth pyramid only if proven useful

- Prototype depth pyramid or MIP sampling.
- Keep only if measured quality/cost tradeoff beats the simpler path.

PR-05: optional AO temporal

- Add AO-specific history, confidence, rejection, and reset rules.
- Require temporal off path to remain shippable.

PR-06: R3F/drei adapter

- Add adapter only after the node API is stable.
- Adapter may provide convenience, but must not expand the core contract.

PR-07: advanced research branch

- Explore bent normals, bitmask AO, layered depth, adaptive/tile routing, and more complex upsampling.
- Keep outside v1 unless a measured result justifies promotion.

## 12. ADRs

### ADR-001: AO First

Decision: HorizonAO is an ambient occlusion node only.

Why: Tight scope makes quality, performance, and integration measurable.

Consequence: GI, SSGI, ray tracing, and visibility framework features are out of scope.

### ADR-002: AA Agnostic

Decision: HorizonAO runs before final AA and does not require TRAA, SMAA, FXAA, MSAA, or no-AA paths.

Why: AO quality must not depend on a specific antialiasing implementation.

Consequence: AO-specific temporal is optional and separate from final AA.

### ADR-003: Minimal Geometry Facts

Decision: The required contract is depth, normal, and camera.

Why: These are sufficient for a screen-space horizon/GTAO-style scalar AO term.

Consequence: Material and object data stay out of the core API.

### ADR-004: Compact Scalar AO Output

Decision: v1 outputs scalar AO.

Why: Scalar AO is easy to composite, debug, denoise, store, and benchmark.

Consequence: Bent normals and directional visibility are deferred.

### ADR-005: Temporal Optional

Decision: Temporal is not default in v1.

Why: Temporal can hide sampling defects and introduce ghosting.

Consequence: Balanced preset must pass without temporal.

### ADR-006: Resolved Linear Depth Policy

Decision: HorizonAO owns a documented linear depth policy at its input boundary.

Why: Most AO bugs start with depth space confusion.

Consequence: Debug linear depth is required, and mismatched depth conventions are treated as integration bugs.

### ADR-007: Debug Views Required

Decision: Debug views are part of the product.

Why: AO is too sensitive to spaces, normals, resolution scale, and temporal history to debug blind.

Consequence: Every release must keep debug outputs working.

### ADR-008: Advanced Features Deferred

Decision: Bitmask AO, bent normals, layered depth, tile routing, and adaptive branches stay out of v1.

Why: They add memory, API, and validation cost before the baseline has earned trust.

Consequence: Advanced work lives in PR-07 or separate research branches.

## 13. What I Would Not Do

I would not build a general visibility system. The moment HorizonAO starts modeling all visibility, it stops being a compact AO product and becomes an underpowered renderer subsystem.

I would not ship fake performance numbers. Benchmarks without scene, camera, resolution, DPR, hardware, browser, renderer version, and timing method are marketing noise.

I would not make temporal default too early. Temporal makes weak spatial AO look better in still screenshots and worse in motion. That is how you ship ghosts and call them stability.

I would not add bitmask AO or bent normals before the baseline is excellent. Those are credible features, but only after scalar AO is clean, fast, debuggable, and benchmarked.

I would not make the public API clever. Users need radius, intensity, falloff, samples, slices, resolution scale, denoise, temporal, and debug. Start there. Earn every additional knob.

I would not optimize memory before raw AO correctness is proven. Memory reductions are useful only after the algorithm is visually correct and the target bottleneck is measured.

I would not re-render geometry as the default integration model. It hides pipeline weakness under convenience and creates material correctness debt immediately.

## 14. Final Recommendation

Decision: approve with conditions.

HorizonAO is a credible product direction if it stays AO-first, TSL/WebGPU-native, AA-agnostic, and brutally measured. The strongest path is not to out-scope `GTAONode`, N8AO, XeGTAO, CACAO, or ASSAO. The strongest path is to be narrower, cleaner, easier to debug, and honest about cost.

Blocking conditions before v1 release:

- The parity harness must exist first.
- Raw AO must be understandable and debug-visible.
- Denoise must be depth/normal-aware.
- Balanced must work with temporal off.
- WebGPU validation must be clean.
- Benchmarks must be real or absent.

That is the product. Compact AO, measured honestly, with no scope creep.

## References

- Three.js `GTAONode`: https://threejs.org/docs/pages/GTAONode.html
- Three.js `GTAOPass`: https://threejs.org/docs/pages/GTAOPass.html
- Three.js TSL docs: https://threejs.org/docs/TSL.html
- Activision GTAO reference: https://research.activision.com/publications/archives/practical-real-time-strategies-for-accurate-indirect-occlusion
- Intel XeGTAO repository: https://github.com/GameTechDev/XeGTAO
- N8AO repository: https://github.com/N8python/n8ao
- Intel ASSAO article: https://www.intel.com/content/www/us/en/developer/articles/technical/adaptive-screen-space-ambient-occlusion.html
- AMD FidelityFX CACAO manual: https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- FidelityFX CACAO repository: https://github.com/GPUOpen-Effects/FidelityFX-CACAO
- Wu 2025 Efficient Stereo-Aware SSAO: https://kevincosner.github.io/publications/Wu2025ESS/
- EA SEED 2024 Filter-Adapted Spatio-Temporal Sampling: https://www.ea.com/seed/news/spatio-temporal-sampling
- Chinese lightweight real-time rendering parameter optimization: https://www.cjig.cn/zh/article/doi/10.11834/jig.240483/
- LUT-Opt 2026: https://arxiv.org/abs/2604.25178
- Korean point-cloud AO, JKSCI 2025: https://journal.kci.go.kr/jksci/archive/articleView?artiId=ART003280480
