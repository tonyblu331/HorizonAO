# Ultraplan: Velocity-Backed Temporal AO

## North Star

Ship temporal AO only when it is a measured velocity-backed sample-reuse layer
that improves HorizonAO without weakening the temporal-free product.

The current repo already has a private implementation. The right posture is no
longer "fight temporal"; it is "make temporal earn promotion." The default
public answer stays no until evidence reaches candidate.

## Current Truth

- `VBAOVelocityTemporalNode` exists in `packages/horizon-ao/src`.
- It is private and not exported from `packages/horizon-ao/src/index.ts`.
- It consumes current AO, current depth/normal, velocity, previous depth, and
  previous normal.
- It owns only AO history. Host code owns previous depth/normal guide history.
- It uses the Three TRAA velocity convention:

```txt
offsetUv = velocity.xy * vec2(0.5, -0.5)
historyUv = uv - offsetUv
```

- WebGPU smoke evidence exists and the temporal pass emits timing.
- `verify:vbao-temporal` still returns `reject-promotion`.
- Motion/disocclusion evidence, diagnostics, target inventory, and public API
  review remain incomplete.

## Diet Principle

```txt
host contract
-> one private temporal node
-> diagnostics
-> evidence
-> reject or promote
```

Anything else is fat unless a failing gate proves it is needed.

## SOAP Alignment

This ultraplan is the canonical coordination document for temporal work. Do not
add new planning files unless they contain a distinct artifact type:

- `proposal.md`: why this change exists.
- `design.md`: implementation decisions.
- `sdd-plan.md`: phase execution plan.
- `ultraplan.md`: end-to-end roadmap and gates.
- `tasks.md`: executable checklist.
- `apply-progress.md`: completed work and verification.
- `metaprompt.md`: agent execution prompt.
- `whiteboard.md`: scratch exploration only.

If a new doc only restates gaps, roadmap, or readiness, fold it into this file.
CONCEPTS > more files.

## Readiness

| Area | Current readiness | Notes |
| --- | ---: | --- |
| Private temporal node | 70% | Renders, owns AO history, measures temporal pass. |
| Host guide ownership | 60% | Previous guides are host-owned, but target/lifetime inventory is incomplete. |
| Reset behavior | 45% | First-frame and resize reset exist; host reset/camera-cut evidence is open. |
| Validation logic | 65% | UV, depth, normal, velocity, and clamp exist; diagnostics are weak. |
| Static evidence | 45% | Smoke and prior matrix exist, but verdict is `reject-promotion`. |
| Motion/disocclusion evidence | 15% | Required before candidate; currently missing. |
| Public API readiness | 0% | Correctly blocked. |

Overall temporal readiness: **~45% private candidate readiness**, **0% public
feature readiness**.

## Gate Stack

```mermaid
flowchart LR
  G0["G0 reconcile temporal truth"]
  G1["G1 host ownership inventory"]
  G2["G2 private AO history"]
  G3["G3 diagnostics"]
  G4["G4 static same-cost matrix"]
  G5["G5 motion disocclusion matrix"]
  G6["G6 promotion decision"]

  G0 --> G1 --> G2 --> G3 --> G4 --> G5 --> G6
```

## Phase Map

| Phase | Goal | Stop Condition |
| --- | --- | --- |
| R0 | Reconcile current truth | Docs/tests claim all runtime temporal is absent |
| R1 | Inventory host ownership and targets | Previous guide ownership or AO history lifetime is implicit |
| R2 | Add diagnostics before tuning | Rejection reason is invisible |
| R3 | Benchmark static same-cost matrix | Missing screenshots, timings, or spatial alternative |
| R4 | Benchmark motion/disocclusion matrix | Ghosting/disocclusion labels appear or motion rows are absent |
| R5 | Decide API | Evidence is not `candidate` |

## Implementation Slices

### R0: Reconcile The Story

Some docs still speak as if all runtime temporal is absent or rejected. That was
true for camera-only temporal, not for current velocity-backed private temporal.

Deliverables:

- Update source-contract language:
  - camera-only temporal is rejected;
  - velocity-backed internal temporal is private candidate code;
  - public temporal remains absent.
- Keep `VBAOVelocityTemporalNode` out of public exports.

### R1: Inventory Targets And Lifetimes

Temporal cannot promote while target ownership is implicit.

Deliverables:

- AO history target format: `R16F`/`RedFormat`/`HalfFloatType`.
- Current AO source resolution and lifetime.
- Previous guide source and lifetime.
- Resize/DPR/device reset path.
- Host reset signal requirements.

Gate:

- Evidence summary includes target and lifetime inventory.

### R2: Diagnostics Before Tuning

Without diagnostics, threshold changes become vibes. CONCEPTS > sliders.

Deliverables:

- Rejection reason counters or proxy diagnostics:
  - invalid UV;
  - reset;
  - depth reject;
  - normal reject;
  - velocity reject;
  - clamp range.
- Benchmark rows expose diagnostics.
- Verifier fails or marks temporal evidence incomplete when diagnostics are
  absent.

Gate:

- Every temporal evidence row has diagnostics or is incomplete.

### R3: Static Same-Cost Matrix

A temporal row only matters if it beats fair non-temporal alternatives.

Required captures:

- `off`;
- `host`;
- `host` + TRAA;
- `velocity-internal`;
- same-cost spatial alternative.

Gate:

- Material pattern/noise win.
- No stripe regression.
- No edge-bleed regression.
- No thin-gap regression.
- Pass timing includes temporal cost.

### R4: Motion And Disocclusion Matrix

Temporal can look good in stills and fail in motion. That is the classic trap.

Required captures:

- camera motion;
- object motion;
- disocclusion;
- resize/reset smoke.

Gate:

- No ghosting label.
- No disocclusion label.
- History reset visible after camera cut/resize.
- Motion rows complete with screenshots, timings, and diagnostics.

### R5: Candidate Or Rejection

Private candidates should not live forever without a decision.

Outcomes:

- reject and remove/park if no same-cost win;
- keep private if useful for evidence but not product;
- open public promotion SDD only after candidate verdict.

## Gaps To Address

### Must Address

- Host reset/camera-cut signal.
- Device/DPR/resize reset evidence.
- Temporal diagnostics.
- Full same-cost matrix.
- Motion/disocclusion scenes.
- VRAM/target inventory.
- Verifier hard mode with explicit tracked inputs.

### Should Address

- Separate host guide cost from VBAO temporal pass cost.
- Decide whether AO history stays `R16F` or needs confidence metadata later.
- Measure whether temporal allows fewer raw samples without losing thin/edge
  quality.
- Improve report language so `host`, `host TRAA`, and `velocity-internal` are
  never conflated.

### Do Not Address Yet

- Public `temporal` option.
- Threshold knobs.
- Adaptive blend weight.
- Confidence history.
- Object/material ID.
- Public temporal integration type.

## Verification Ladder

```txt
source-contract tests
-> core typecheck
-> demo typecheck
-> benchmark script check
-> WebGPU smoke
-> evidence matrix
-> temporal verifier
-> hard candidate verifier
```

## What Must Not Promote Yet

- Public `temporal` API.
- AO-owned temporal without velocity.
- Private previous depth/normal guide copies.
- History-weight tuning.
- Resolve/polish fusion.
- Confidence history.
- README product claims.
- Static-only evidence.
- Extra file splitting.

## Recommended Next Slice

Start with **R2 diagnostics** before another benchmark matrix.

First concrete slice:

1. Add temporal diagnostics fields to `VBAOVelocityTemporalNode` or demo
   benchmark reporting.
2. Expose diagnostics in `window.__aoBenchmark.latest`.
3. Add source-contract tests.
4. Capture one `velocity-internal` smoke row proving diagnostics are present.
5. Only then rerun the same-cost matrix.

## Kill Criteria

End the project and keep temporal private if:

- host guide history requires private VBAO copies;
- motion/disocclusion scenes show blocking labels;
- same-cost spatial rows win or tie after temporal pass cost;
- the implementation needs scattered conditionals across raw, resolve, polish,
  and benchmarks;
- WebGPU target lifetime becomes ambiguous.
- helper modules appear before one node proves insufficient.
