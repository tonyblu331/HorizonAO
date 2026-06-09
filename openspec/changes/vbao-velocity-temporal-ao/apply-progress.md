# Apply Progress: Velocity-Backed Temporal AO

## Implemented

- Added private `VBAOVelocityTemporalNode`.
- Wired demo/evidence mode `velocity-internal`.
- Used Three `PassNode.getPreviousTextureNode(...)` for host-owned previous
  depth and normal guides.
- Used Three TRAA velocity convention:

```txt
offsetUv = velocity.xy * vec2(0.5, -0.5)
historyUv = uv - offsetUv
```

- Added velocity-backed verifier input via `VBAO_TEMPORAL_VELOCITY_JSON`.
- Added metaprompt for future implementation discipline.
- Captured WebGPU smoke evidence with temporal pass timing.
- Added private temporal diagnostics target for reset, viewport, depth, normal,
  velocity, and clamp/history-range reasons.
- Surfaced diagnostics through `window.__aoBenchmark.latest` and benchmark rows.
- Updated temporal verifier/reporting so velocity-internal evidence without
  diagnostics is incomplete.
- Captured one `velocity-internal` smoke row with diagnostics metadata present;
  after the stricter diagnostics-pass timing gate, this row is classified as
  incomplete until recaptured with measured `passTimings.diagnostics`.
- Documented research-backed next-phase strategy from Three TRAA/TSL and
  temporal supersampling practice:
  target/lifetime inventory, reset evidence, same-cost static matrix,
  motion/disocclusion matrix, then decision.
- Added spec requirements for target inventory, diagnostics, reset evidence,
  and same-cost comparison before candidate review.
- Canonicalized how research shapes Horizon AO in `design.md` and collapsed
  duplicated command sprawl in `sdd-plan.md` into a compact execution contract.
- Added target/lifetime inventory reporting for current AO, AO history,
  diagnostics, host velocity, previous depth, and previous normal.
- Added demo-only reset evidence trigger through `window.__aoBenchmark` and
  benchmark env `AO_BENCHMARK_VBAO_TEMPORAL_RESET_REASON`.
- Captured static same-cost evidence:
  `vbao-temporal-off-static`, `vbao-temporal-host-static`,
  `vbao-temporal-host-traa-static`,
  `vbao-temporal-velocity-internal-static`, and
  `vbao-temporal-spatial-ultra-static`.
- Captured reset evidence in `vbao-temporal-reset-smoke`; diagnostics recorded
  `lastResetReason: benchmark-reset-smoke`, but the artifact is incomplete under
  the current gate until diagnostics pass timing is recaptured.
- Captured motion evidence for `camera-motion`, `object-motion`, and
  `disocclusion`, then combined those rows into
  `vbao-temporal-motion-combined` for the verifier.
- Updated `verify:vbao-temporal` so complete candidate evidence now requires
  reset/lifetime evidence and all three motion evidence kinds.
- Added ADR-014 to close out camera-only AO temporal accumulation as rejected.

## Closed In This Slice

- Target/lifetime inventory reporting path for AO history, velocity, previous
  depth, and previous normal.
- Reset/camera-cut diagnostics metadata path.
- Full off/host/host-TRAA/velocity/same-cost static matrix captures.
- Motion/disocclusion captures with explicit motion kind labels.
- Verifier/reporting treatment for missing diagnostics pass timing, target
  inventory, reset evidence, and motion evidence.
- Public API review remains closed: no public temporal API is justified.

## Evidence Artifacts

- `artifacts/benchmarks/vbao-temporal-reset-smoke.json`
- `artifacts/benchmarks/vbao-temporal-off-static.json`
- `artifacts/benchmarks/vbao-temporal-host-static.json`
- `artifacts/benchmarks/vbao-temporal-host-traa-static.json`
- `artifacts/benchmarks/vbao-temporal-velocity-internal-static.json`
- `artifacts/benchmarks/vbao-temporal-spatial-ultra-static.json`
- `artifacts/benchmarks/vbao-temporal-motion-camera.json`
- `artifacts/benchmarks/vbao-temporal-motion-object.json`
- `artifacts/benchmarks/vbao-temporal-motion-disocclusion.json`
- `artifacts/benchmarks/vbao-temporal-motion-combined.json`
- `artifacts/benchmarks/vbao-temporal-gate-verdict.json`

## Current Verdict

`verify:vbao-temporal` returns `reject-promotion` with velocity-lane evidence
incomplete when run with explicit `VBAO_TEMPORAL_*_JSON` paths for the named
artifacts. Clean-checkout reproducibility is not claimed until those input
artifacts and their referenced screenshots are tracked and clean.

That is correct. The private velocity-backed pass can render and emit
diagnostics metadata, but the current named captures predate measured
`diagnostics` pass timing and therefore are not complete candidate evidence.
No public temporal API, README claim, or threshold knob is justified.

## Capture Notes

- The host TRAA capture produced a complete artifact, but the dev client also
  emitted post-capture WebGPU `copyTextureToTexture` errors from Three's
  `TRAANode.updateBefore` path. Treat host TRAA as evidence-bearing but not a
  clean promotion path until that runtime issue is isolated.
- The current verdict must remain private `reject-promotion`; no README claim,
  public `temporal` option, or threshold knob is justified.
