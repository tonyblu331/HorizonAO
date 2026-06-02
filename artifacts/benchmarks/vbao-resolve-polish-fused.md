# AO Production Screenshot Quality Summary

Generated: 2026-06-02T10:29:40.860Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01073 | 0.13508 | 0.00667 | 0.00136 | 0.11798 | 0.13508 | 0.17601 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01073 | 0.13508 | 0.00667 | 0.00136 | 0.11798 | 0.13508 | 0.17601 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02292 | 0.19123 | 0.00831 | 0.00214 | 0.19123 | 0.16260 | 0.13444 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02292 | 0.19123 | 0.00831 | 0.00214 | 0.19123 | 0.16260 | 0.13444 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.705 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.046 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | measured | 3.468 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 4.219 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.705 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.046 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | measured | 3.468 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 4.219 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.302 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.048 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | measured | 0.381 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.731 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.302 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.048 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | measured | 0.381 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.731 |

## VBAO Temporal Architecture Status

Camera-only AO-owned temporal accumulation remains removed. Velocity-backed internal temporal is private evidence plumbing only and requires same-cost plus motion/disocclusion gates before promotion.

| Mode | Status | Evidence boundary |
| --- | --- | --- |
| off | product baseline | temporal-free AO evidence |
| host | demo/evidence only | requires host TRAA and same-cost spatial comparison |
| velocity-internal | private candidate only | requires host previous guides, temporal pass timing, same-cost spatial comparison, and motion evidence |

## AO Evidence Artifact Status

Rows missing screenshots or required timing data are incomplete evidence, never passing evidence.

| Row | Status | Missing evidence |
| --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-final-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |
| 1280x720-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-final-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |
| 1280x720-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Status |
| --- | --- | --- | ---: | --- |
| 1920x1080-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-fused-resolve-polish-soft075-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
