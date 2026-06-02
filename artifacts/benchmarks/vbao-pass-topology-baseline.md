# AO Production Screenshot Quality Summary

Generated: 2026-06-02T09:55:49.596Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01286 | 0.13885 | 0.00778 | 0.00430 | 0.13885 | 0.11726 | 0.06507 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01175 | 0.12747 | 0.00716 | 0.00296 | 0.12747 | 0.12591 | 0.08678 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01103 | 0.13256 | 0.00689 | 0.00185 | 0.12605 | 0.13256 | 0.12841 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01103 | 0.13256 | 0.00689 | 0.00185 | 0.12605 | 0.13256 | 0.12841 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01103 | 0.13256 | 0.00689 | 0.00185 | 0.12605 | 0.13256 | 0.12841 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01103 | 0.13256 | 0.00689 | 0.00185 | 0.12605 | 0.13256 | 0.12841 |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | 0.01051 | 0.13563 | 0.00350 | 0.00153 | 0.08228 | 0.13563 | 0.01112 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02458 | 0.21444 | 0.01356 | 0.00903 | 0.21444 | 0.20349 | 0.03099 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02389 | 0.20389 | 0.01217 | 0.00665 | 0.20389 | 0.19111 | 0.00960 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02347 | 0.19915 | 0.01109 | 0.00471 | 0.19915 | 0.18412 | 0.00841 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02347 | 0.19915 | 0.01109 | 0.00471 | 0.19915 | 0.18412 | 0.00841 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02347 | 0.19915 | 0.01109 | 0.00471 | 0.19915 | 0.18412 | 0.00841 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02347 | 0.19915 | 0.01109 | 0.00471 | 0.19915 | 0.18412 | 0.00841 |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | 0.02305 | 0.19014 | 0.00969 | 0.00308 | 0.19014 | 0.16115 | 0.08642 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.669 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.669 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.681 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.110 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.791 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.198 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.176 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.187 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.562 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.568 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.236 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.300 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 2.103 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.660 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.111 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.099 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.870 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.660 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.111 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.099 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.870 |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | raw | measured | 2.307 |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | cleanup | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | resolve | skipped | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | polish | measured | 0.202 |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | total-product | derived | 2.509 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.731 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.731 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.845 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.128 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.973 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.780 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.122 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.140 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.042 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.006 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.163 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.157 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.325 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.001 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.162 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.159 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.322 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.001 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.162 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.159 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.322 |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | raw | measured | 2.297 |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | cleanup | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | resolve | skipped | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | polish | measured | 0.223 |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | total-product | derived | 2.520 |

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
| 1920x1080-museum-vbao-product-preset-off-half-res-raw-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-cleanup-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-resolve-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-polish-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-full-res-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-raw-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-cleanup-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-resolve-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-polish-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-full-res-product-ao | complete | none |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | complete | none | raw |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | complete | none | raw |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Status |
| --- | --- | --- | ---: | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-raw-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-cleanup-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-resolve-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-polish-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-full-res-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-raw-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-cleanup-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-resolve-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-polish-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | vbao | product | 0 | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-full-res-product-ao | vbao | product | 0 | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
