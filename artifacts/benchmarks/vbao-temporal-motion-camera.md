# AO Production Screenshot Quality Summary

Generated: 2026-06-03T11:48:50.784Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | 0.02747 | 0.16258 | 0.01577 | 0.00904 | 0.16258 | 0.12930 | 0.02805 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms | CPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | raw | measured | 1.225 | n/a |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | cleanup | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | resolve | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | polish | measured | 0.089 | n/a |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | temporal | measured | 0.043 | n/a |
| 1280x720 | vbao | product-preset | velocity-internal | off | full-res | ao | product | total-product | derived | 1.357 | n/a |

## VBAO Temporal Architecture Status

Camera-only AO-owned temporal accumulation remains removed. Velocity-backed internal temporal is private evidence plumbing only and requires same-cost plus motion/disocclusion gates before promotion.

| Mode | Status | Evidence boundary |
| --- | --- | --- |
| off | product baseline | temporal-free AO evidence |
| host | demo/evidence only | requires host TRAA and same-cost spatial comparison |
| velocity-internal | private candidate only | requires host previous guides, temporal pass timing, same-cost spatial comparison, and motion evidence |

## VBAO Compute Candidate Status

Compute candidates are private evidence paths. A listed candidate is not a public `VBAONodeOptions` feature and is not promoted unless it wins a named gate.

| Row | Candidate | Storage targets |
| --- | --- | --- |
| 1280x720-museum-vbao-product-preset-velocity-internal-full-res-product-ao | n/a | none |

## AO Evidence Artifact Status

Rows missing screenshots or required timing data are incomplete evidence, never passing evidence.

| Row | Status | Missing evidence |
| --- | --- | --- |
| 1280x720-museum-vbao-product-preset-velocity-internal-full-res-product-ao | incomplete | passTimings.diagnostics |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| n/a | incomplete | half-resolution-product-row | n/a |

## VBAO Rendered Thin-Geometry Proxy Status

This section is rendered screenshot evidence only. It tracks thin-gap, edge-bleed, mud, and stripe proxy signals; it does not replace scalar thin diff or ray-cast thin diff evidence.

| Row | View | Output | VBAO res | Status | Labels | Thin-gap proxy ↑ | Edge bleed proxy ↓ | Stripe ↓ | Missing |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1280x720-museum-vbao-product-preset-velocity-internal-full-res-product-ao | ao | product | full-res | complete | noise,edge-bleed | 0.00904 | 0.01577 | 0.16258 | none |

## VBAO Rendered Proxy vs Reference Observation Gate

Rendered thin-gap, edge-bleed, and stripe proxies are compared against reference observation coverage by product row. Complete screenshot proxies still block when required fixture observations are missing.

| Row | View | Output | VBAO res | Proxy status | Reference status | Observed fixtures | Missing required fixtures | Status | Blockers |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| 1280x720-museum-vbao-product-preset-velocity-internal-full-res-product-ao | ao | product | full-res | complete | missing-reference-observation | 0 | none | blocked | missing-reference-observation |

## AO Product Promotion Verdict

A row can pass only when it is default product evidence with complete artifacts, complete required reference fixture coverage, and no blocking failure labels. Private candidates remain candidate-only.

| Product row | Scene | Resolution | View | Algorithm | Output | Verdict | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1280x720-museum-vbao-product-preset-velocity-internal-full-res-product-ao | museum | 1280x720 | ao | vbao | product | candidate-only | passTimings.diagnostics,missing-reference-observation,thresholdGate,failureLabel.noise,failureLabel.edge-bleed |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Missing required fixtures | Status |
| --- | --- | --- | ---: | --- | --- |
| 1280x720-museum-vbao-product-preset-velocity-internal-full-res-product-ao | vbao | product | 0 | none | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
- AO-view screenshot metrics are measured after the demo display transform; compare cross-algorithm rows only as rendered presentation evidence, not scalar AO truth.
