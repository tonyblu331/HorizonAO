# Research Ledger: VBAO Release Gap Closure

## Search Scope

Date searched: 2026-06-04.

This ledger uses primary or project-near-primary sources only: the SSILVB/VBAO
paper, Activision GTAO technical report, AMD CACAO documentation, Three.js
GTAONode/TSL documentation, N8AO README, and local repo evidence/tests.

## Source Findings

| Source | Verified Claim | Local Implication | Non-Goal |
| --- | --- | --- | --- |
| Therrien, Levesque, Gilet, *Screen Space Indirect Lighting with Visibility Bitmask*, arXiv:2301.11376 | Horizon methods struggle with light behind thin surfaces; the visibility bitmask replaces two horizon angles with per-sector binary visibility for constant-thickness surfaces. | The release gate must prove thin-surface/gap behavior, not only corner darkening. | Do not collapse VBAO into a two-horizon GTAO estimator. |
| Jimenez, Wu, Pesce, Jarabo, Activision GTAO report | GTAO frames production AO as matching ray-traced/Monte Carlo ground truth within a strict runtime budget, using spatial/temporal filtering. | VBAO promotion needs reference rows plus timing, not screenshots alone. | Do not claim ground-truth quality without ray-cast/reference rows. |
| AMD FidelityFX CACAO docs | CACAO uses depth/normal inputs, prepared/de-interleaved depth/normal resources, MIP chains at higher quality, edge detection, blur, apply, and bilateral upscale passes. | Pipeline evidence should track prepare/filter/upscale-like costs and edge behavior separately. | Do not add depth hierarchy or edge metadata until a failing gate proves the need. |
| Three.js GTAONode docs | GTAONode constructor shape is depth, normal, camera; it has `getTextureNode()`, resolution scale, and temporal filtering that requires TRAA. | VBAO should stay integration-compatible but keep temporal private until evidence passes. | Do not expose temporal just because GTAONode has it. |
| Three.js TSL docs | TSL supports render passes, MRT, compute, storage buffers/textures, and can rewrite/reuse generated shader expressions. | Generated shader inspection is mandatory for fixed loops and duplicate declarations; compute candidates can exist but must be private and measured. | Do not trust TypeScript source strings as the only shader proof. |
| N8AO README | N8AO emphasizes temporal stability, artist control, quality presets, half-resolution with depth-aware upscaling, and configurable denoise. | N8AO is a product-quality baseline for smoothness and controls, not mathematical truth. | Do not copy public denoise knobs into VBAO before internal evidence earns them. |

## Local Evidence Findings

| Local File | Verified Claim | Plan Impact |
| --- | --- | --- |
| `packages/horizon-ao/src/VBAONode.ts` | Product node owns raw/product boundary; `normalNode` is required; temporal mode resolves to `off` unless host-only internal mode is used. | Release plan keeps API compact and temporal private. |
| `packages/horizon-ao/src/vbaoConstants.ts` | 32 sectors, product quality tiers, clamps, and named thickness constants are in source. | Threshold work must evaluate current policy before changing constants. |
| `packages/horizon-ao/reference/aoRaycastReference.ts` | Ray-cast fixtures already include `thin-gap-separated-slabs`, broad contact, grazing, normal-sensitive, and radius rejection cases. | Phase 1 should wire existing fixtures into product observations before inventing new ones. |
| `EVIDENCE.md` | Recent signal/noise/temporal/compute candidates are recorded as not promoted. | Candidate lanes remain private and cannot become product claims by label drift. |

## Required Release Fixture Map

| Fixture | Source Pressure | Release Risk |
| --- | --- | --- |
| `flat-plane-open` | GTAO/reference sanity | False positive occlusion on open receivers. |
| `box-contact` | CACAO edge/discontinuity pressure | Hard-edged contact and edge bleed. |
| `two-wall-corner` | GTAO/reference plus local corner coverage | False-corner darkening or under-occlusion. |
| `broad-wall-contact` | CACAO pipeline/contact pressure | Broad-contact under-occlusion. |
| `thin-gap-separated-slabs` | SSILVB/VBAO thin-surface motivation | Closing valid light gaps between thin surfaces. |
| `grazing-surface-wall` | GTAO grazing-angle warning pressure | Grazing receiver instability. |
| `normal-sensitive-side-contact` | Three/GTAO normal-input pressure | Normal-sensitive contact drift and edge bleed. |

Screenshots can diagnose these risks, but cannot promote them. A screenshot row
does not know whether its apparent improvement is closer to ray-cast truth or
only smoother presentation. Release promotion therefore requires explicit
fixture observations through the production reference gate.

## Decisions

- Preserve VBAO identity: 32-sector visibility-bitmask AO remains the core.
- Treat ray-cast/reference rows as truth gates; screenshots are diagnostic.
- Treat GTAO/N8AO as product baselines; they are not ground truth.
- Treat CACAO/XeGTAO-style pipeline structure as pressure for measurement
  granularity, not a mandate to add more passes.
- Treat Three TSL/WebGPU compute as a private candidate lane until generated
  shader, validation, and timing evidence prove value.

## Sources

- https://arxiv.org/abs/2301.11376
- https://www.activision.com/cdn/research/PracticalRealtimeStrategiesTRfinal.pdf
- https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- https://gpuopen.com/manuals/fidelityfx_sdk/reference_documentation/sdk/effect_components/fidelityfx_cacao/ffx_cacao/
- https://threejs.org/docs/pages/GTAONode.html
- https://threejs.org/docs/TSL.html
- https://github.com/N8python/n8ao
