# AO Production Screenshot Quality Summary

Generated: 2026-06-02T10:05:45.923Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | 0.02235 | 0.12984 | 0.02258 | 0.00438 | 0.12984 | 0.08573 | 0.17773 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01103 | 0.13256 | 0.00689 | 0.00185 | 0.12605 | 0.13256 | 0.12841 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01103 | 0.13256 | 0.00689 | 0.00185 | 0.12605 | 0.13256 | 0.12841 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | 0.03557 | 0.17877 | 0.03068 | 0.00957 | 0.17877 | 0.16170 | 0.04249 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02347 | 0.19915 | 0.01109 | 0.00471 | 0.19915 | 0.18412 | 0.00841 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02347 | 0.19915 | 0.01109 | 0.00471 | 0.19915 | 0.18412 | 0.00841 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | raw | measured | 0.635 |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | cleanup | measured | 0.103 |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | resolve | measured | 0.094 |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | total-product | derived | 0.833 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.635 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.104 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.094 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.834 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.635 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.104 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.094 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.834 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | raw | measured | 0.300 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | cleanup | measured | 0.049 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | total-product | derived | 0.394 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.301 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.049 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.395 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.301 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.049 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.395 |

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
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-beauty | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-beauty | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Status |
| --- | --- | --- | ---: | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
