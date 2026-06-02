# Proposal: Velocity-Backed VBAO Temporal AO

## Intent

Define the complete future temporal implementation for HorizonAO without
reopening the rejected camera-only internal temporal path.

Temporal AO is only valid as sample reuse across validated frames. It must not
be a public smoothing knob, a substitute for raw kernel correctness, or a hidden
renderer inside `@horizonao/core`.

The principal decision is that this work starts as a feasibility gate, not as a
feature commitment.

## Current Truth

The existing `vbao-temporal-ao-gate` result is `reject-promotion`.

- `VBAONode` currently supports temporal-free output plus internal/demo host
  phase animation.
- AO-owned camera-only temporal accumulation was prototyped, measured, rejected,
  and removed.
- Public `temporal` API remains blocked.
- Any future AO-owned temporal path must require velocity and host-owned guide
  history.

## Scope

### In Scope

- Add a new velocity-backed temporal architecture.
- Keep `VBAONode` temporal-free by default.
- Keep host temporal sampling as a narrow integration mode.
- Decide whether host velocity and previous guide history are available cheaply
  enough to justify implementation.
- Define a future AO-owned temporal node that consumes:
  - current resolved AO;
  - current depth;
  - current normal;
  - velocity or motion vectors;
  - previous AO history;
  - previous depth/normal guide history supplied by the host;
  - reset/camera-cut state.
- Define WebGPU-safe pass ownership, target formats, validation, clamp, blend,
  diagnostics, and evidence gates.

### Out of Scope

- No default temporal AO.
- No public temporal API until evidence reaches `candidate`.
- No camera-only AO-owned temporal.
- No private duplicated previous depth/normal guide targets.
- No public threshold, clamp, weight, or reprojection knobs.
- No production build command unless explicitly requested.

## Success Criteria

- Temporal `off` remains the product baseline.
- Host temporal remains evidence/demo-only unless host TRAA evidence wins.
- Velocity-backed internal temporal beats same-cost non-temporal alternatives
  before promotion.
- Motion/disocclusion evidence exists before candidate status.
- Ghosting, disocclusion, stripe, edge bleed, thin gap loss, mud, halo, and
  scale mismatch block promotion.
- Pass timings include raw, cleanup, resolve, temporal, host guide cost if
  applicable, polish, and total product time.
