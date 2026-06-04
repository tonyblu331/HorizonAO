# AO Production Screenshot Quality Summary

Generated: 2026-06-04T12:08:54.388Z

This is an image-quality benchmark companion to screenshot capture. Lower pattern/noise and stripe scores are better, but this is not a physical AO reference; use `ao-ground-truth-summary.md` and `ao-gpu-readback-summary.md` for reference-accuracy baselines.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | H stripe ↓ | V stripe ↓ | Anisotropy ↓ |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01300 | 0.13877 | 0.00603 | 0.00407 | 0.07464 | 0.13877 | 0.00263 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.04914 | 0.07406 | 0.03219 | 0.01969 | 0.07406 | 0.05714 | 0.03282 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.03320 | 0.08972 | 0.02694 | 0.01033 | 0.08972 | 0.07432 | 0.05802 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.03320 | 0.08972 | 0.02694 | 0.01033 | 0.08972 | 0.07432 | 0.05802 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01166 | 0.15391 | 0.00514 | 0.00214 | 0.08077 | 0.15391 | 0.00604 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | 0.01166 | 0.15391 | 0.00514 | 0.00214 | 0.08077 | 0.15391 | 0.00604 |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | 0.02971 | 0.06777 | 0.01703 | 0.00989 | 0.04972 | 0.06777 | 0.01389 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.05705 | 0.20407 | 0.04185 | 0.02994 | 0.20288 | 0.20407 | 0.02421 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.05237 | 0.20347 | 0.03905 | 0.02561 | 0.20015 | 0.20347 | 0.01976 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.04081 | 0.21925 | 0.03327 | 0.01509 | 0.19472 | 0.21925 | 0.01139 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.02402 | 0.18573 | 0.01168 | 0.00371 | 0.18573 | 0.18162 | 0.08383 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.04081 | 0.21925 | 0.03327 | 0.01509 | 0.19472 | 0.21925 | 0.01139 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | 0.04081 | 0.21925 | 0.03327 | 0.01509 | 0.19472 | 0.21925 | 0.01139 |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | 0.03699 | 0.12702 | 0.02553 | 0.01145 | 0.12702 | 0.11596 | 0.03911 |

## AO Production Pass Timing Status

Skipped passes are not zero-cost passes; `skipped` means the pass is elided from that graph, `measured` means a pass-level WebGPU timestamp was captured, and `derived` means the value is a sum of measured pass timestamps.

| Resolution | Algorithm | VBAO sample mode | VBAO temporal | Host TAA | VBAO res | View | Output | Pass | Status | GPU ms | CPU ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.317 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | missing | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.317 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 0.800 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.430 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.129 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.559 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 0.800 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.123 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.164 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.150 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.437 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 0.800 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.086 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.172 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.154 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.412 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 0.800 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.478 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.150 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.243 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.870 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 0.800 |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.478 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.150 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.243 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.870 | n/a |
| 1920x1080 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 0.800 |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | raw | measured | 4.434 | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | cleanup | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | resolve | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | polish | measured | 0.317 | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | temporal | skipped | n/a | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | total-product | derived | 4.751 | n/a |
| 1920x1080 | vbao | product-preset | off | off | full-res | ao | product | sector-confidence-smoke | measured | n/a | 0.900 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.809 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | missing | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 0.809 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.000 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.069 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.145 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | missing | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.214 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.000 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.164 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.161 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.167 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.492 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.000 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 1.408 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.119 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.188 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.715 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.000 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.841 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.137 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.142 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.120 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.000 |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | raw | measured | 0.841 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | cleanup | measured | 0.137 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve | measured | 0.142 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | total-product | derived | 1.120 | n/a |
| 1280x720 | vbao | product-preset | off | off | half-res | ao | product | sector-confidence-smoke | measured | n/a | 1.000 |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | raw | measured | 2.885 | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | cleanup | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | resolve | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | polish | measured | 0.233 | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | resolve-polish | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | temporal | skipped | n/a | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | total-product | derived | 3.118 | n/a |
| 1280x720 | vbao | product-preset | off | off | full-res | ao | product | sector-confidence-smoke | measured | n/a | 1.000 |

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
| 1920x1080-museum-vbao-product-preset-off-half-res-raw-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1920x1080-museum-vbao-product-preset-off-half-res-cleanup-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1920x1080-museum-vbao-product-preset-off-half-res-resolve-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1920x1080-museum-vbao-product-preset-off-half-res-polish-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1920x1080-museum-vbao-product-preset-off-full-res-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1280x720-museum-vbao-product-preset-off-half-res-raw-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1280x720-museum-vbao-product-preset-off-half-res-cleanup-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1280x720-museum-vbao-product-preset-off-half-res-resolve-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1280x720-museum-vbao-product-preset-off-half-res-polish-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |
| 1280x720-museum-vbao-product-preset-off-full-res-product-ao | sector-confidence-smoke | VBAO.ComputeCandidate.SectorConfidence:sector-confidence-storage-texture |

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

## VBAO Rendered Thin-Geometry Proxy Status

This section is rendered screenshot evidence only. It tracks thin-gap, edge-bleed, mud, and stripe proxy signals; it does not replace scalar thin diff or ray-cast thin diff evidence.

| Row | View | Output | VBAO res | Status | Labels | Thin-gap proxy ↑ | Edge bleed proxy ↓ | Stripe ↓ | Missing |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 1920x1080-museum-vbao-product-preset-off-half-res-raw-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.00407 | 0.00603 | 0.13877 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-cleanup-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.01969 | 0.03219 | 0.07406 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-resolve-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.01033 | 0.02694 | 0.08972 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-polish-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.01033 | 0.02694 | 0.08972 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.00214 | 0.00514 | 0.15391 | none |
| 1920x1080-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.00214 | 0.00514 | 0.15391 | none |
| 1920x1080-museum-vbao-product-preset-off-full-res-product-ao | ao | product | full-res | complete | noise,edge-bleed | 0.00989 | 0.01703 | 0.06777 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-raw-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.02994 | 0.04185 | 0.20407 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-cleanup-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.02561 | 0.03905 | 0.20347 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-resolve-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.01509 | 0.03327 | 0.21925 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-polish-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.00371 | 0.01168 | 0.18573 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-final-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.01509 | 0.03327 | 0.21925 | none |
| 1280x720-museum-vbao-product-preset-off-half-res-reconstruction-gate-product-ao | ao | product | half-res | complete | noise,false-curvature,scale-mismatch | 0.01509 | 0.03327 | 0.21925 | none |
| 1280x720-museum-vbao-product-preset-off-full-res-product-ao | ao | product | full-res | complete | noise,edge-bleed | 0.01145 | 0.02553 | 0.12702 | none |

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
