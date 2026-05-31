# Stabilization Review: VBAO Evidence Gates

Date: 2026-05-26

## Purpose

This review freezes the current decision boundary before the next raw-signal
candidate. The goal is to prevent evidence sprawl: no new sampling,
radius/thickness, formula, depth, or filter candidate should be promoted until
the expanded `/vbao-parity` fixture matrix gives artifact-label evidence.

## Production Boundary

- Current production formula: cosine-weighted VBAO reduction.
- Current production sampling: `magic-square`.
- Current production radius/thickness: Museum `museum-baseline`.
- Public API: no `VBAONodeOptions` expansion and no new package export.
- Build policy: no production build for this stabilization pass.

## Accepted Infrastructure

| Area | Status | Evidence anchor |
| --- | --- | --- |
| GPU/scalar parity route | Accepted as internal correctness infrastructure | `openspec/changes/vbao-gpu-readback-parity/`, `openspec/changes/vbao-parity-fixture-expansion/` |
| Expanded artifact fixtures | Accepted as gate inputs | `packages/horizon-ao/src/vbaoParity/`, `packages/horizon-ao/src/vbaoOracleFixtures.ts` |
| Fixture labels | Accepted as promotion language | `noise`, `mud`, `edge-bleed`, `thin-gap`, `false-curvature`, `scale-mismatch` |
| Paper/reference separation | Accepted as diagnostic discipline | `openspec/changes/vbao-gt-vbao-alignment/`, `openspec/changes/vbao-ssilvb-reference-formula-ablation/` |

The current `/vbao-parity` fixture set is:

- `flat-plane`
- `two-wall-corner`
- `two-wall-corner-true-normal`
- `thin-occluder`
- `thin-gap-parallel-planes`
- `large-flat-floor-no-curvature`
- `small-contact-object-on-plane`
- `grazing-wall-corner`
- `subpixel-thin-occluder`

## Rejected or Diagnostic-Only Tracks

| Track | Disposition | Reason |
| --- | --- | --- |
| SSILVB/reference formula ablation | Diagnostic only; not promoted | Current evidence does not prove a live GPU formula replacement. Blocking labels remain or move elsewhere. |
| Metadata-aware filter v1 | Rejected for promotion | It did not fix the raw-signal failures that matter. |
| GTVBAO++ / SmartDenoiser / per-tap metadata | Internal evidence only | Metadata is useful, but the reviewed output remains visually insufficient. |
| Sampling schedules `r2`, `hilbert`, `blue-noise` | Diagnostic only | No candidate cleared the expanded fixture labels better than `magic-square`. |
| Radius/thickness presets `thin-gap-conservative`, `small-contact-tight`, `large-radius` | Diagnostic only | No preset cleared the expanded fixture labels better than `museum-baseline`. |
| Depth hierarchy / depth prefilter | Diagnostic only | Existing evidence is not production-grade and still risks false curvature / scale artifacts. |

## Active OpenSpec Inventory

| Change | Disposition for next gate |
| --- | --- |
| `bootstrap-horizonao` | Historical infrastructure; complete, not a current VBAO gate driver. |
| `vbao-adaptive-thickness-reference` | Complete reference work; diagnostic foundation only. |
| `vbao-adaptive-thickness-tsl-port` | Complete internal work; not promoted to public API. |
| `vbao-denoise-evidence-gate` | Complete; denoise candidates rejected for promotion. |
| `vbao-denoise-research` | Research notes only. |
| `vbao-depth-hierarchy-evidence` | Complete; depth hierarchy remains diagnostic. |
| `vbao-depth-prefilter-experiment` | Complete; prefilter remains diagnostic. |
| `vbao-directional-visibility-reference` | Complete reference-only support. |
| `vbao-edge-confidence-metadata` | Mostly complete; metadata is evidence support, not a promotion gate by itself. |
| `vbao-evidence-baseline` | Complete baseline evidence. |
| `vbao-gpu-readback-parity` | Superseded by expanded parity matrix for current work; retained as accepted infrastructure. |
| `vbao-groundtruth-quality-oracle` | Complete reference/oracle support. |
| `vbao-gt-vbao-alignment` | Accepted as internal correctness/reporting hardening only. |
| `vbao-gtvbao-plus-plus-smartdenoiser` | Complete; not promoted. |
| `vbao-mask-coverage-popcount-metadata` | Partially open; metadata remains evidence input, not the next promotion. |
| `vbao-math-alignment-whiteboard` | Planning/reference notes only. |
| `vbao-parity-fixture-expansion` | Accepted infrastructure; expanded fixture matrix is the current gate. |
| `vbao-pivot` | Historical long-running pivot; not the next gate driver. |
| `vbao-production-readiness-temporal-free` | Partially open; next production decision requires fixture evidence first. |
| `vbao-sampling-backtest` | Complete; no sampling promotion. |
| `vbao-sampling-v2` | Complete internal/reference slice; not promoted. |
| `vbao-ssilvb-reference-formula-ablation` | Complete diagnostic ablation; no formula promotion. |
| `vbao-temporal-free-metadata-filter` | Complete; metadata-aware filter not promoted. |
| `vbao-upstream-signal-correction` | Current coordination track; next step is one raw-signal candidate behind fixture labels. |
| `verify-horizonao-math-denoise` | Historical verification change; complete. |

## Next Gate Contract

Pick one raw-signal candidate only:

1. Sampling-kernel candidate.
2. Thickness/radius adaptive rule.
3. Mask-confidence output used as direct evidence, not as a filter.

The candidate must be compared against current raw VBAO on the expanded
`/vbao-parity` matrix. Acceptance requires at least one targeted label to
improve and none to worsen. Only then should Museum rows be captured against raw
VBAO, candidate VBAO, GTAO, N8AO, and optionally a filtered candidate.
