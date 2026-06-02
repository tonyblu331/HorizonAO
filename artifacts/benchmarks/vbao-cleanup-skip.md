# AO Production Screenshot Quality Summary

Generated: 2026-06-02T10:06:12.774Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | 0.02305 | 0.13578 | 0.02294 | 0.00544 | 0.13578 | 0.08481 | 0.14789 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01147 | 0.13680 | 0.00718 | 0.00247 | 0.13680 | 0.12910 | 0.10311 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01147 | 0.13680 | 0.00718 | 0.00247 | 0.13680 | 0.12910 | 0.10311 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | 0.03623 | 0.18859 | 0.03133 | 0.01172 | 0.18859 | 0.17569 | 0.01855 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02376 | 0.20557 | 0.01160 | 0.00588 | 0.20557 | 0.19208 | 0.00502 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02376 | 0.20557 | 0.01160 | 0.00588 | 0.20557 | 0.19208 | 0.00502 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | raw | measured | 0.634 |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | cleanup | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | resolve | measured | 0.095 |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | total-product | derived | 0.729 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.642 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.095 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.737 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.642 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.095 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.737 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | raw | measured | 0.298 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | cleanup | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | total-product | derived | 0.343 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.301 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.346 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.301 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.346 |

## VBAO Temporal Architecture Status

AO-owned internal temporal accumulation is removed from runtime product plumbing. Host temporal rows may use host TRAA, but no VBAO guide-history diagnostics are expected.

| Mode | Status | Evidence boundary |
| --- | --- | --- |
| off | product baseline | temporal-free AO evidence |
| host | demo/evidence only | requires host TRAA and same-cost spatial comparison |
| internal | removed | future AO-owned temporal requires a velocity-backed proposal |

## AO Evidence Artifact Status

Rows missing screenshots or required timing data are incomplete evidence, never passing evidence.

| Row | Status | Missing evidence |
| --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-skip-cleanup-half-res-final-product-beauty | complete | none |
| 1920x1080-museum-vbao-product-preset-off-skip-cleanup-half-res-final-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-skip-cleanup-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |
| 1280x720-museum-vbao-product-preset-off-skip-cleanup-half-res-final-product-beauty | complete | none |
| 1280x720-museum-vbao-product-preset-off-skip-cleanup-half-res-final-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-skip-cleanup-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-skip-cleanup-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |
| 1280x720-museum-vbao-product-preset-off-skip-cleanup-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Status |
| --- | --- | --- | ---: | --- |
| 1920x1080-museum-vbao-product-preset-off-skip-cleanup-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-skip-cleanup-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-skip-cleanup-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-skip-cleanup-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
