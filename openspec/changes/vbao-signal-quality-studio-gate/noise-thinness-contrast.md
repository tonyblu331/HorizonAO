# Noise and Thinness Contrast: Current VBAO Diagnosis

## Purpose

Contrast the pasted noise/thinness diagnosis against current source truth,
existing repo evidence, and primary research. This document is a planning
artifact only; it does not authorize runtime changes by itself.

## Sources Checked

- Therrien, Levesque, and Gilet, "Screen Space Indirect Lighting with
  Visibility Bitmask": https://arxiv.org/abs/2301.11376
- WebGPU Shading Language Editor's Draft, 2026-06-03:
  https://gpuweb.github.io/gpuweb/wgsl/
- Jimenez et al., "Practical Realtime Strategies for Accurate Indirect
  Occlusion":
  https://www.activision.com/cdn/research/Practical_Real_Time_Strategies_for_Accurate_Indirect_Occlusion_NEW%20VERSION_COLOR.pdf
- Local source:
  - `packages/horizon-ao/src/VBAONode.ts`
  - `packages/horizon-ao/src/vbaoConstants.ts`
  - `packages/horizon-ao/src/vbaoNoise.ts`
  - `packages/horizon-ao/src/vbaoSampling.ts`
  - `packages/horizon-ao/reference/vbaoGtVbaoMath.ts`
  - `EVIDENCE.md`

## Claim Contrast

| Claim | Current assessment | Evidence | SDD implication |
| --- | --- | --- | --- |
| 32-sector quantization contributes instability. | Plausible and aligned with local diagnostics. | `SECTOR_COUNT = 32`; stochastic thin intervals use a probabilistic one-sector path when interval width is below one sector. | Add attribution for boundary-risk pixels before considering 64 sectors. |
| 64 sectors would halve angular granularity. | Mathematically true, but not a free WebGPU move. | Current mask is one `u32`; WGSL scalar integer paths are `i32`/`u32`, and `countOneBits` is used on the current `u32` mask. | Treat 64 sectors as a later split-mask candidate with timing and generated-shader inspection, not the first fix. |
| The 64x64 phase tile can create spatial residuals. | Source true; metric impact remains an evidence question. | `VBAO_NOISE_TILE_SIZE = 64`; atlas is 8x8 phases over 64x64 local pixels. Prior evidence keeps `phase-atlas-stable-hash` as default after comparisons. | Add a larger-atlas or altered-layout candidate only behind raw/product screenshot metrics and timing. |
| `0.85 * sampleDistance` collapses thickness near contact. | Source true and currently the strongest actionable diagnosis. | Shader uses `effectiveThickness = min(baseThickness, sampleDist * 0.85)`. | First runtime candidate should target near-contact collapse, after missing ray-cast fixtures are added. |
| `radius * 0.3` caps broad-contact contribution. | Source true, but prior preset attempts did not prove a better product default. | Shader uses `baseThickness = min(thickness, radius * 0.3)`; evidence records diagnostic radius/thickness presets with no promoted winner. | Keep broad-contact and thin-gap gates paired so stronger contact does not close valid thin gaps. |
| Production is missing cosine-weighted slice accumulation. | Stale claim. | Shader accumulates `sliceAccessibility * NprojLen` and divides by `weightSum`; `EVIDENCE.md` records projected-normal weighted slice accumulation after the 2026-06-03 gate. | Do not add another cosine weighting pass unless a new RED fixture proves current weighting is wrong. |
| VBAO should match a path-traced/baked reference directly. | Wrong target if stated literally. | SSILVB is a screen-space bitmask estimator for finite-thickness visibility, while path tracing integrates true scene visibility over the hemisphere. | Use ray-cast/path-traced reference as an error oracle, not as proof that VBAO must reproduce every solid-angle effect. |
| Thinness is caused only by bitmask representation. | Incomplete. | The bitmask, stochastic sub-sector path, phase atlas, thickness caps, and product polish all affect perceived thinness/noise. | Build an attribution ledger per failing pixel/fixture instead of tuning one knob globally. |

## Corrected Diagnosis

The current production problem should be framed as raw-signal attribution, not
as "missing cosine weighting."

The most defensible current hypothesis is:

1. Thin-sector stochastic coverage creates high-frequency variance at sector
   boundaries.
2. The 64x64 phase atlas can make that variance spatially coherent.
3. Near-contact intervals can become too thin because effective thickness is
   bounded by sample distance.
4. Broad contact can be under-represented because base thickness is also capped
   by radius.
5. Product polish may hide or smear these defects, so raw AO and product AO
   must be measured separately.

This keeps the useful part of the pasted critique and discards the stale part.
That matters. We do not get better results by coding from a diagnosis that is
already contradicted by the current shader.

## SDD Plan

### Phase A: Evidence Ledger

Record the pasted claims in `research-claim-ledger.md` as either source truth,
supported pressure, stale claim, or local evidence gap.

Acceptance:

- The cosine-weighting claim is marked stale unless a new fixture proves
  otherwise.
- The 32-sector, 64x64 atlas, `0.85 * sampleDistance`, and `radius * 0.3`
  claims have source references.
- No runtime code changes land in this phase.

### Phase B: Missing Reference Fixtures

Before changing thickness or sampling, add missing finite-geometry reference
cases.

Required cases:

- broad wall contact;
- grazing surface;
- normal-sensitive contact;
- near-contact finite occluder where `sampleDistance` approaches zero;
- valid thin gap that must stay open.

Acceptance:

- Ray-cast/reference rows exist before a shader edit.
- Missing rows remain blockers, not implicit passes.

### Phase C: Raw Attribution

Add diagnostics or reports that classify a bad pixel into one or more causes:

- one-hit stochastic sector;
- sector-boundary interval;
- 64x64 phase-tile residual;
- near-contact thickness collapse;
- broad-contact thickness cap;
- edge/resolve/polish artifact.

Acceptance:

- Raw AO and product AO are measured separately.
- Each failure label has scalar, GPU-readback, or screenshot evidence.

### Phase D: Thickness Contact Candidate

Evaluate exactly one near-contact candidate at a time:

- document current clamp as intentional;
- adaptive thickness from the existing reference-first path;
- internal minimum effective-thickness floor;
- internal contact-preserving curve that does not change public options.

Acceptance:

- Contact darkening improves broad/contact fixtures.
- Valid thin gaps remain open.
- No public `VBAONodeOptions` expansion.

### Phase E: Sampling Candidate

Only after thickness/contact attribution is stable, evaluate noise candidates:

- larger phase tile or altered atlas layout;
- same-cost phase scheme alternatives;
- same-cost slice/sample changes;
- split-mask 64-sector prototype if attribution proves 32-sector granularity is
  the bottleneck.

Acceptance:

- Candidate wins raw and product rows, or is rejected.
- Timing includes raw pass and any extra pass/texture cost.
- Generated shader output stays inspectable.

## First Recommended Slice

Start with Phase B and Phase C, then target `effectiveThickness` collapse.

Do not start with 64 sectors, temporal filtering, or another cosine-weighted
sector reduction. Those are tempting because they sound mathematically clean,
but the current evidence points first at contact/thickness attribution. Real
engineering is not about grabbing the most elegant knob; it is about proving
which wall is actually load-bearing.
