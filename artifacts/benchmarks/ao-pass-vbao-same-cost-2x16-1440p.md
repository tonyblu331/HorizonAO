# AO Production Screenshot Quality Summary

Generated: 2026-06-04T11:51:46.689Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | 0.06580 | 0.09836 | 0.05914 | 0.01355 | 0.09056 | 0.09836 | 0.03669 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | raw | measured | 4.848 |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | cleanup | skipped | n/a |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | resolve | skipped | n/a |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | polish | measured | 0.338 |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | resolve-polish | skipped | n/a |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | temporal | skipped | n/a |
| 2560x1440 | vbao | same-cost-2x16 | off | off | full-res | beauty | product | total-product | derived | 5.186 |

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
| 2560x1440-city-vbao-same-cost-2x16-off-full-res-product-beauty | complete | none |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| n/a | incomplete | half-resolution-product-row | n/a |

## VBAO Rendered Thin-Geometry Proxy Status

This section is rendered screenshot evidence only. It tracks thin-gap, edge-bleed, mud, and stripe proxy signals; it does not replace scalar thin diff or ray-cast thin diff evidence.

| Row | View | Output | VBAO res | Status | Labels | Thin-gap proxy ↑ | Edge bleed proxy ↓ | Stripe ↓ | Missing |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 2560x1440-city-vbao-same-cost-2x16-off-full-res-product-beauty | beauty | product | full-res | complete | noise,edge-bleed | 0.01355 | 0.05914 | 0.09836 | none |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Status |
| --- | --- | --- | ---: | --- |
| n/a | n/a | n/a | 0 | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
