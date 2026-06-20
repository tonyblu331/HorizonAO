# AO Production Screenshot Quality Summary

Generated: 2026-06-16T00:02:18.793Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | 0.02218 | 0.09354 | 0.01675 | 0.00288 | 0.08175 | 0.09354 | 0.13865 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01177 | 0.15263 | 0.00523 | 0.00229 | 0.08033 | 0.15263 | 0.00613 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01177 | 0.15263 | 0.00523 | 0.00229 | 0.08033 | 0.15263 | 0.00613 |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | 0.03588 | 0.17096 | 0.03140 | 0.00951 | 0.17096 | 0.13882 | 0.06322 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.04276 | 0.22174 | 0.03414 | 0.01676 | 0.19845 | 0.22174 | 0.01700 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.04276 | 0.22174 | 0.03414 | 0.01676 | 0.19845 | 0.22174 | 0.01700 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms | CPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | raw | measured | 0.994 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | confidence | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | cleanup | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | resolve | measured | 0.274 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | diagnostics | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | total-product | derived | 1.269 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | beauty | product | total-diagnostic | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.282 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | confidence | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.352 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.634 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.282 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | confidence | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.352 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.634 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | raw | measured | 0.341 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | confidence | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | cleanup | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | resolve | measured | 0.098 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | diagnostics | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | total-product | derived | 0.439 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | beauty | product | total-diagnostic | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.688 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | confidence | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.194 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.882 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.688 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | confidence | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.194 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.882 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |

## VBAO Temporal Architecture Status

Camera-only AO-owned temporal accumulation remains removed. Velocity-backed internal temporal is private evidence plumbing only and requires same-cost plus motion/disocclusion gates before promotion.

| Mode | Status | Evidence boundary |
| --- | --- | --- |
| off | product baseline | temporal-free AO evidence |
| host | demo/evidence only | requires host TRAA and same-cost spatial comparison |
| velocity-internal | private candidate only | requires host previous guides, temporal pass timing, same-cost spatial comparison, and motion evidence |

## VBAO Compute Candidate Status

Compute candidates are private evidence paths. A listed candidate is not a public `VBAONodeOptions` feature and is not promoted unless it wins a named gate.

| Row | Candidate | Backend | Storage targets | Target formats | Lifetimes | Dispatch timing |
| --- | --- | --- | --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-beauty | n/a | webgpu | none | n/a | n/a | n/a |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | n/a | webgpu | none | n/a | n/a | n/a |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | n/a | webgpu | none | n/a | n/a | n/a |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-beauty | n/a | webgpu | none | n/a | n/a | n/a |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | n/a | webgpu | none | n/a | n/a | n/a |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | n/a | webgpu | none | n/a | n/a | n/a |

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

## VBAO Product Quality Matrix

This frozen matrix separates the current candidate from controls, private evidence, and observability rows. Matrix rows can share axes such as compute-off or temporal-off; only candidate rows can ever become product-promotion passes.

| Matrix row | Role | Receiver confidence | Sample cost | Resolution | Compute | Temporal | Promotion boundary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| confidence-guided-candidate | candidate | confidence-guided | product-preset | half-res | compute-off | temporal-off | eligible-after-reference-threshold-and-same-cost-gates |
| scalar-control | control | scalar-control | product-preset | candidate-resolution | compute-off | temporal-off | control-only |
| same-cost-3x10 | control | confidence-guided | same-cost-raw-samples | candidate-resolution | compute-off | temporal-off | control-only |
| same-cost-2x16 | control | confidence-guided | same-cost-raw-samples | candidate-resolution | compute-off | temporal-off | control-only |
| full-res-product-control | control | confidence-guided | product-preset | full-res | compute-off | temporal-off | control-only |
| compute-off-control | control | any | any | any | compute-off | any | control-axis |
| compute-smoke-observability | observability | confidence-guided | product-preset | candidate-resolution | sector-confidence-smoke | temporal-off | observability-only |
| temporal-off-baseline | baseline | any | any | any | any | temporal-off | baseline-axis |
| velocity-internal-private | private | confidence-guided | product-preset | candidate-resolution | compute-off | velocity-internal | private-only |

| Report row | Matrix role | Matrix rows | Receiver confidence | Sample cost | Resolution | Compute | Temporal | Promotion boundary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-beauty | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | confidence-guided | product-preset | half-res | compute-off | temporal-off | eligible-after-reference-threshold-and-same-cost-gates |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | confidence-guided | product-preset | half-res | compute-off | temporal-off | eligible-after-reference-threshold-and-same-cost-gates |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | confidence-guided | product-preset | half-res | compute-off | temporal-off | eligible-after-reference-threshold-and-same-cost-gates |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-beauty | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | confidence-guided | product-preset | half-res | compute-off | temporal-off | eligible-after-reference-threshold-and-same-cost-gates |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | confidence-guided | product-preset | half-res | compute-off | temporal-off | eligible-after-reference-threshold-and-same-cost-gates |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | confidence-guided | product-preset | half-res | compute-off | temporal-off | eligible-after-reference-threshold-and-same-cost-gates |

## VBAO Half-Resolution Reconstruction Stage Status

Half-resolution product rows must identify raw, cleanup, resolve, polish, and final AO stage labels before promotion. Missing stage evidence is incomplete evidence.

| Product row | Status | Missing stages | First failing stage |
| --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | raw,cleanup,resolve,polish | final |

## VBAO Rendered Thin-Geometry Proxy Status

This section is rendered screenshot evidence only. It tracks thin-gap, edge-bleed, mud, and stripe proxy signals; it does not replace scalar thin diff or ray-cast thin diff evidence.

| Row | View | Output | VBAO res | Status | Labels | Thin-gap proxy ↑ | Edge bleed proxy ↓ | Stripe ↓ | Missing |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-beauty | beauty | product | half-res | complete | noise | 0.00288 | 0.01675 | 0.09354 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | noise | 0.00229 | 0.00523 | 0.15263 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | noise | 0.00229 | 0.00523 | 0.15263 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-beauty | beauty | product | half-res | complete | noise | 0.00951 | 0.03140 | 0.17096 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | noise | 0.01676 | 0.03414 | 0.22174 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | noise | 0.01676 | 0.03414 | 0.22174 | none |

## VBAO Rendered Proxy vs Reference Observation Gate

Rendered thin-gap, edge-bleed, and stripe proxies are compared against reference observation coverage by product row. Complete screenshot proxies still block when required fixture observations are missing.

| Row | View | Output | VBAO res | Proxy status | Reference status | Observed fixtures | Missing required fixtures | Status | Blockers |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-beauty | beauty | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-beauty | beauty | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |

## AO Product Promotion Verdict

A row can pass only when it is candidate product evidence with complete artifacts, complete required reference fixture coverage, passing thresholds, and no blocking failure labels. Controls, diagnostics, private lanes, and observability lanes stay non-promotable.

| Product row | Scene | Resolution | View | Algorithm | Output | Matrix role | Matrix rows | Verdict | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-beauty | museum | 1920x1080 | beauty | vbao | product | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | fail | missing-reference-observation,thresholdGate,failureLabel.noise |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | museum | 1920x1080 | ao | vbao | product | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | fail | missing-reference-observation,thresholdGate,failureLabel.noise |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | museum | 1920x1080 | ao | vbao | product | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | fail | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish,missing-reference-observation,thresholdGate,failureLabel.noise |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-beauty | museum | 1280x720 | beauty | vbao | product | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | fail | missing-reference-observation,thresholdGate,failureLabel.noise |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | museum | 1280x720 | ao | vbao | product | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | fail | missing-reference-observation,thresholdGate,failureLabel.noise |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | museum | 1280x720 | ao | vbao | product | candidate | confidence-guided-candidate,compute-off-control,temporal-off-baseline | fail | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish,missing-reference-observation,thresholdGate,failureLabel.noise |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Missing required fixtures | Status |
| --- | --- | --- | ---: | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-beauty | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-beauty | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |

Metric basis:
- `patternNoiseScore`: RMS of a cross-high-pass residual over the central scene crop.
- `stripeScore`: max row/column residual coherence normalized by high-pass RMS; catches visible bands/stripes.
- `edgeBleedProxy`: broad contrast beyond local edge contrast. Lower is better; this is a screenshot proxy, not geometric truth.
- `thinGapPreservationProxy`: narrow bright-line contrast. Higher is better; compare only within the same scene/view.
- `directionalAnisotropy`: imbalance between horizontal and vertical neighbor differences.
- Crop excludes demo chrome and the bottom-right controls.
- AO-view screenshot metrics are measured after the demo display transform; compare cross-algorithm rows only as rendered presentation evidence, not scalar AO truth.
