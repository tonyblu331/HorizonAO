# AO Production Screenshot Quality Summary

Generated: 2026-06-02T10:10:57.233Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01286 | 0.13885 | 0.00778 | 0.00430 | 0.13885 | 0.11726 | 0.06507 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01122 | 0.13072 | 0.00689 | 0.00218 | 0.12830 | 0.13072 | 0.11869 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01021 | 0.13787 | 0.00232 | 0.00061 | 0.08354 | 0.13787 | 0.01075 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01074 | 0.13495 | 0.00667 | 0.00139 | 0.11798 | 0.13495 | 0.17292 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01074 | 0.13495 | 0.00667 | 0.00139 | 0.11798 | 0.13495 | 0.17292 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01074 | 0.13495 | 0.00667 | 0.00139 | 0.11798 | 0.13495 | 0.17292 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02458 | 0.21444 | 0.01356 | 0.00903 | 0.21444 | 0.20349 | 0.03099 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02362 | 0.20015 | 0.01155 | 0.00537 | 0.20015 | 0.18769 | 0.01282 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02292 | 0.19119 | 0.00834 | 0.00218 | 0.19119 | 0.16258 | 0.13246 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02292 | 0.19123 | 0.00832 | 0.00215 | 0.19123 | 0.16257 | 0.13393 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02292 | 0.19123 | 0.00832 | 0.00215 | 0.19123 | 0.16257 | 0.13393 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02292 | 0.19123 | 0.00832 | 0.00215 | 0.19123 | 0.16257 | 0.13393 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.710 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.710 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.636 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.103 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.739 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.709 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.045 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.094 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.848 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.707 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.046 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.094 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | measured | 0.172 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.019 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.637 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.103 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.094 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | measured | 0.194 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.028 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.637 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.103 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.094 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | measured | 0.194 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.028 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.336 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.336 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.311 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.049 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.360 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.331 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.025 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.400 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.332 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.024 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | measured | 0.080 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.480 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.335 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.024 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | measured | 0.080 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.483 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.335 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.024 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.045 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | measured | 0.080 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.483 |

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
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-raw-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-cleanup-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-resolve-product-ao | incomplete | passTimings.polish |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-polish-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-final-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-reconstruction-gate-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-raw-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-cleanup-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-resolve-product-ao | incomplete | passTimings.polish |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-polish-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-final-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-reconstruction-gate-product-ao | complete | none |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-reconstruction-gate-product-ao | complete | none | raw |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-reconstruction-gate-product-ao | complete | none | raw |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Status |
| --- | --- | --- | ---: | --- |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-raw-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-cleanup-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-resolve-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-polish-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-soft075-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-raw-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-cleanup-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-resolve-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-polish-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-soft075-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
