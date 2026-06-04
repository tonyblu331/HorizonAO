# AO Production Screenshot Quality Summary

Generated: 2026-06-04T18:57:48.361Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.03556 | 0.08887 | 0.02772 | 0.01157 | 0.08887 | 0.07110 | 0.05288 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.03556 | 0.08887 | 0.02772 | 0.01157 | 0.08887 | 0.07110 | 0.05288 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.04275 | 0.22180 | 0.03414 | 0.01680 | 0.19815 | 0.22180 | 0.01731 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.04275 | 0.22180 | 0.03414 | 0.01680 | 0.19815 | 0.22180 | 0.01731 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms | CPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.839 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | confidence | measured | 0.577 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.056 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.112 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.583 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.600 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.839 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | confidence | measured | 0.577 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.056 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.112 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.583 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.600 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.775 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | confidence | measured | 0.673 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.118 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.139 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.705 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.100 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.775 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | confidence | measured | 0.673 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.118 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.139 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | diagnostics | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.705 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-diagnostic | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.100 |

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
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | sector-confidence-smoke | webgpu | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture | rgba8unorm | active-vbao-pipeline | sector-confidence-smoke:measured:cpu 1.600 ms |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | sector-confidence-smoke | webgpu | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture | rgba8unorm | active-vbao-pipeline | sector-confidence-smoke:measured:cpu 1.600 ms |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | sector-confidence-smoke | webgpu | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture | rgba8unorm | active-vbao-pipeline | sector-confidence-smoke:measured:cpu 1.100 ms |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | sector-confidence-smoke | webgpu | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture | rgba8unorm | active-vbao-pipeline | sector-confidence-smoke:measured:cpu 1.100 ms |

## AO Evidence Artifact Status

Rows missing screenshots or required timing data are incomplete evidence, never passing evidence.

| Row | Status | Missing evidence |
| --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | complete | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | complete | none |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | incomplete | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish |

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
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | noise | 0.01157 | 0.02772 | 0.08887 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | noise | 0.01157 | 0.02772 | 0.08887 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | noise | 0.01680 | 0.03414 | 0.22180 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | noise | 0.01680 | 0.03414 | 0.22180 | none |

## VBAO Rendered Proxy vs Reference Observation Gate

Rendered thin-gap, edge-bleed, and stripe proxies are compared against reference observation coverage by product row. Complete screenshot proxies still block when required fixture observations are missing.

| Row | View | Output | VBAO res | Proxy status | Reference status | Observed fixtures | Missing required fixtures | Status | Blockers |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | missing-reference-observation | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | blocked | missing-reference-observation,fixture.flat-plane-open,fixture.box-contact,fixture.two-wall-corner,fixture.broad-wall-contact,fixture.thin-gap-separated-slabs,fixture.grazing-surface-wall,fixture.normal-sensitive-side-contact |

## AO Product Promotion Verdict

A row can pass only when it is default product evidence with complete artifacts, complete required reference fixture coverage, and no blocking failure labels. Private candidates remain candidate-only.

| Product row | Scene | Resolution | View | Algorithm | Output | Verdict | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | museum | 1920x1080 | ao | vbao | product | candidate-only | missing-reference-observation,thresholdGate,failureLabel.noise |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | museum | 1920x1080 | ao | vbao | product | candidate-only | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish,missing-reference-observation,thresholdGate,failureLabel.noise |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | museum | 1280x720 | ao | vbao | product | candidate-only | missing-reference-observation,thresholdGate,failureLabel.noise |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | museum | 1280x720 | ao | vbao | product | candidate-only | reconstructionStages.raw,reconstructionStages.cleanup,reconstructionStages.resolve,reconstructionStages.polish,missing-reference-observation,thresholdGate,failureLabel.noise |

## AO Reference Gate Status

Product AO rows must provide fixture observations before they can be compared against the ray-cast and canonical reports. Missing observations are gate misses, not passes.

| Product row | Algorithm | Output | Observed fixtures | Missing required fixtures | Status |
| --- | --- | --- | ---: | --- | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | vbao | product | 0 | flat-plane-open, box-contact, two-wall-corner, broad-wall-contact, thin-gap-separated-slabs, grazing-surface-wall, normal-sensitive-side-contact | missing-reference-observation |
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
