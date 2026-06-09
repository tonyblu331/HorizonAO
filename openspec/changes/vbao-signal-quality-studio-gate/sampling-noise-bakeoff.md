# Sampling And Noise Bakeoff

## Decision

Keep `phase-atlas-stable-hash` as the production control. Do not promote IGN,
STBN, Hilbert/R2-style LUT, 128x128 atlas, or same-budget sample-shape
candidates from this pass.

## Evidence

Command:

```sh
$env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; node apps/demo/scripts/collect-vbao-noise-source-comparison.mjs
```

Output:

- `artifacts/benchmarks/vbao-noise-source-comparison-latest.json`
- `artifacts/benchmarks/vbao-noise-source-comparison-summary.md`
- `artifacts/benchmarks/screenshots-vbao-noise-sources/`

The run captured 36 WebGPU rows at 1280x720: beauty/AO, raw/product, atlas
candidates, and same-budget sample-shape candidates.

## Candidate Matrix

| Candidate family | Labels | Verdict |
| --- | --- | --- |
| Control | `phase-atlas-stable-hash` + `product-preset` | Keep as control only. |
| Larger atlas | `phase-atlas-stable-hash-128`, `ign-128`, `static-stbn-128` | Rejected; no clean label win and AO/product rows still carry noise or edge/thin-gap failures. |
| IGN | `ign`, `ign-128` | Rejected; product AO rows still carry `noise`, `edge-bleed`, or `thin-gap`. |
| STBN-style | `static-stbn`, `static-stbn-128` | Rejected; adds or preserves `thin-gap`/`edge-bleed` failures. |
| Hilbert/R2-style LUT | `hilbert-r2-lut` | Rejected; product AO still carries `noise`/`edge-bleed` and raw AO carries `thin-gap`. |
| Same-budget shape | `same-cost-3x10`, `same-cost-2x16` | Rejected; AO/product pattern noise and edge bleed regress versus control. |

## Pipeline Placement

The implemented candidates are benchmark-only texture/sample-shape labels:

- atlas/LUT candidates are CPU-baked into `createVbaoBenchmarkNoiseTexture`;
- sample-shape candidates are private `vbaoSampleMode` route labels;
- no candidate enters public `VBAONodeOptions`;
- no procedural IGN/STBN/Hilbert code enters the raw shader hot path.

## Follow-Up

Future sampling work needs a stronger gate than swapping atlas recipes. The
next useful lane is bitmask support/confidence metadata, because the current
metric failures look tied to sector support quality and product reconstruction,
not only to the spatial noise texture.
