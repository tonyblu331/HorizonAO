# Research Contrast: VBAO Kernel Canonical Drift Triage

## Search Scope

Date searched: 2026-06-03.

This is a targeted technical contrast, not a systematic literature review. The
goal is to compare the SDD plan against primary or near-primary sources for
visibility bitmask AO, GTAO-style cosine weighting, engine adoption, and
production implementation tradeoffs.

Sources used:

- Therrien, Levesque, and Gilet, "Screen Space Indirect Lighting with Visibility
  Bitmask", arXiv:2301.11376:
  https://arxiv.org/abs/2301.11376
- Readable ar5iv rendering of the same paper:
  https://ar5iv.labs.arxiv.org/html/2301.11376
- Jimenez et al., "Practical Realtime Strategies for Accurate Indirect
  Occlusion", SIGGRAPH 2016 course notes:
  https://blog.selfshadow.com/publications/s2016-shading-course/activision/s2016_pbs_activision_occlusion.pdf
- Bevy 0.15 release notes for VBAO:
  https://bevy.org/news/bevy-0-15/
- Bevy `ScreenSpaceAmbientOcclusion` API docs:
  https://docs.rs/bevy/latest/bevy/pbr/struct.ScreenSpaceAmbientOcclusion.html
- Intel XeGTAO repository:
  https://github.com/GameTechDev/XeGTAO

## Contrast Matrix

| Topic | Research signal | Repo/SDD position | Assessment |
| --- | --- | --- | --- |
| Visibility bitmask core | SSILVB replaces two horizon angles with an N-sector occlusion bit field and notes 32 sectors fit a single unsigned integer. | `VBAONode` uses a 32-sector `u32` mask and popcount reduction. | Aligned. |
| Thin geometry | SSILVB is motivated by allowing light to pass behind finite-thickness surfaces instead of treating depth as an infinite height field. | Repo uses sample-local thickness and requires normal input. | Aligned, with production-specific clamp needing documentation. |
| Thickness model | SSILVB proposes a small constant world-space thickness and notes true per-pixel thickness is hard from a single depth layer. | Repo clamps base thickness by radius and sample distance. | Partly aligned; `0.85` cap is a local heuristic, not directly research-derived. |
| Sample spacing | SSILVB says low sample density loses detail and mentions exponential distribution near the shaded pixel for nearby surfaces. | Repo uses x² near-biased radial spacing. | Defensible, but reference comparisons must use or acknowledge this schedule. |
| Cosine-weighted AO | GTAO course notes emphasize cosine-weighted hemisphere visibility for radiometric AO. | Repo spec says CDF-remapped sectors already encode cosine measure and then uses uniform slice averaging. | Open question. Needs grazing-normal fixture before changing formula. |
| Temporal accumulation | GTAO/XeGTAO and Bevy docs recommend or rely on TAA/temporal filtering for noise stability. | Repo keeps AO-owned temporal private/rejected and allows host temporal phase only. | Product choice is defensible because WebGPU/R3F integration scope differs, but evidence must keep temporal claims modest. |
| Denoising | SSILVB benchmark includes a denoising pass; XeGTAO uses integrated spatial denoise and TAA when available. | Repo has cleanup/resolve/polish but no public denoise API. | Defensible API discipline; quality claims still require screenshots/timings. |
| Engine adoption | Bevy replaced its old GTAO with VBAO and exposes constant object thickness. | Repo exposes `thickness` and keeps internal reconstruction private. | Aligned in spirit, but Bevy's API is engine-owned while this package is a node-level integration. |

## Key Research Implications

### 1. The Bitmask Direction Is Well Supported

SSILVB directly supports the project's core premise: a visibility bitmask can
handle finite-thickness thin geometry better than a two-horizon height-field
model. Bevy's adoption reinforces that this is not just an isolated paper idea.

The SDD should not reopen the VBAO pivot. The remaining work is drift control
and product evidence, not algorithm identity.

### 2. The Cosine-Weighting Claim Is Subtle

GTAO research strongly argues for cosine-weighted AO when approximating
radiometric hemispherical visibility. However, the SSILVB bitmask method maps
sample intervals through sector geometry, and this repo's spec says the
cosine-measure remap happens before sector popcount.

That means the review's "add cosine-weighted reduction" claim cannot be accepted
by citation alone. It may be right, but only if a fixture proves the current
post-CDF uniform slice average underweights or overweights grazing-normal
occlusion. This is exactly why the SDD's fixture-first gate is correct.

### 3. The Thickness Clamp Is The Weakest Spec Story

The paper admits true thickness is unknowable from a single depth layer and
proposes a constant, optionally distance-scaled value. Bevy also exposes a
constant object thickness. The repo's sample-distance cap is a practical
extension, but research contrast does not justify the literal `0.85` constant.

This should become a named policy, for example "near-sample thickness cap", with
the artifact it prevents and the fixture that would fail without it.

### 4. x² Spacing Has Research Cover

The paper explicitly says nearby surfaces tend to matter more and describes
exponential sample distribution around the shaded pixel. The repo's `t * t`
spacing is therefore not a random deviation.

The risk is not the spacing itself. The risk is comparing production against a
uniform-step scalar reference and interpreting the difference as math drift.

### 5. Temporal And Denoise Are Integration Choices, Not Kernel Truth

GTAO/XeGTAO and Bevy documentation both point toward temporal/spatial filtering
as normal production practice. But this package is not a full renderer, and the
repo already has temporal-free product-boundary decisions. The contrast says:
do not claim temporal is unnecessary in general; claim only that AO-owned
temporal is not promoted here without motion/disocclusion evidence.

## Recommendation

Keep the SDD as a kernel drift triage. The next implementation step should not
be a shader edit. It should be a RED fixture for non-axis-aligned normals plus a
short evidence row explaining the current uniform-slice contract.

Only after that should the project decide whether cosine-weighted slice
reduction is a correction, a double-weighting mistake, or a separate research
variant.
