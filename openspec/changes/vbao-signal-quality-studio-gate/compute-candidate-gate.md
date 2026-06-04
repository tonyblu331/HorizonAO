# Compute Candidate Gate

## Decision

Use compute immediately as an oracle/readback lane. Do not promote a Three TSL
product compute path yet.

The current render-target product path cannot answer fixture-level GPU/CPU
estimator drift cleanly. The direct WGSL readback harness can, because it writes
pinned fixture values into a storage buffer and reads them back without
screenshot proxies or product polish.

## Evidence

Command:

```sh
pnpm --filter @horizonao/demo benchmark:ao:gpu-readback
```

Output:

- `artifacts/benchmarks/ao-gpu-readback-latest.json`
- `artifacts/benchmarks/ao-gpu-readback-summary.md`

Latest readback:

- backend: `webgpu-compute`
- output resolution: `24x1` values, `96` bytes
- storage targets: `output` and `readback`
- compute pass: `ao-fixture-readback`
- `vbao-32-sector-gpu` MAE: `0.0060`
- worst VBAO fixture: `two-wall-corner-gap`

## Schema Added

The readback report now records:

- `webgpuBackendStatus`
- `outputResolution`
- `computeDispatchTimings`
- `storageTargetInventory`

These fields are oracle/readback evidence fields. They are not public
`VBAONodeOptions`.

## Product Compute Status

The Three TSL product compute candidate is still open. The next candidate, if
implemented, should be the smallest metadata-producing pass:

- sector support/confidence metadata; or
- depth/representative-depth prepare.

It must feed an internal texture-node input back into the existing product
graph, keep the current render-target path as control, and win a named quality
or observability gate. A compute path that only looks cleaner architecturally is
rejected.

## TSL Smoke Candidate

`apps/demo/src/scenes/vbaoComputeCandidate.ts` adds a private
`sector-confidence-smoke` candidate. It:

- creates a `StorageTexture`;
- writes a placeholder confidence value through a TSL compute node;
- exposes `textureNode: texture(target)` for a later internal consumer;
- stays out of `@horizonao/core` exports and public `VBAONodeOptions`.

This completes the smallest local Three TSL compute prototype. It does not yet
promote a production compute path.

## Product Graph Smoke

The smoke texture is now sampled by the internal Museum VBAO product graph as a
neutral confidence multiplier. This proves the compute output can become a
texture-node input without adding public API or replacing the render-target
control path. The path is private opt-in evidence plumbing via
`vbaoComputeCandidate=sector-confidence-smoke`; normal Museum VBAO does not pay
this compute dispatch.

Evidence:

- `artifacts/benchmarks/vbao-compute-smoke-latest.json`
- `artifacts/benchmarks/vbao-compute-smoke-summary.md`
- `artifacts/benchmarks/screenshots-vbao-compute-smoke/`

Latest row:

- resolution: `1280x720`
- view/output: AO/product
- backend: `webgpu`
- candidate: `sector-confidence-smoke`
- storage target: `VBAO.ComputeCandidate.SectorConfidence`
- raw pass: measured
- polish pass: measured
- total product pass: derived
- compute candidate CPU dispatch timing: measured beside render pass timings

Verdict: keep private, do not promote. The rendered row still carries
`noise,edge-bleed`, so the compute smoke path proves integration shape only; it
does not win a quality gate.
