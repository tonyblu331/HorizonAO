# AO Production Screenshot Quality Summary

Generated: 2026-06-01T21:02:20.614Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | 0.02305 | 0.19014 | 0.00969 | 0.00308 | 0.19014 | 0.16115 | 0.08642 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | raw | measured | 1.042 |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | cleanup | skipped | n/a |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | resolve | skipped | n/a |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | temporal | measured | 0.045 |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | temporal-depth | measured | 0.014 |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | temporal-normal | measured | 0.015 |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | polish | measured | 0.094 |
| 1280x720 | vbao | product-preset | internal | off | full-res | ao | product | total-product | derived | 1.211 |

## VBAO Internal Temporal Diagnostics

Internal temporal rows must disclose the validation mode and CPU-visible reset state. GPU rejection counters are only reported once instrumented; absence of counters is not treated as a measured rejection rate.

| Row | Validation | History weight | Depth threshold | Normal threshold | Pending reset | Last reset | GPU counters |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1280x720-museum-vbao-product-preset-internal-full-res-product-ao | reproject-depth-normal-clamp | 0.80 | 0.010 | 0.80 | none | none | not-instrumented |

## AO Evidence Artifact Status

Rows missing screenshots or required timing data are incomplete evidence, never passing evidence.

| Row | Status | Missing evidence |
| --- | --- | --- |
| 1280x720-museum-vbao-product-preset-internal-full-res-product-ao | complete | none |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| n/a | incomplete | half-resolution-product-row | n/a |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Status |
| --- | --- | --- | ---: | --- |
| 1280x720-museum-vbao-product-preset-internal-full-res-product-ao | vbao | product | 0 | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
