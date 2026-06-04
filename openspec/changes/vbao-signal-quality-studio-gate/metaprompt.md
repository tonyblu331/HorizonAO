# Metaprompt: VBAO Signal Quality Research Alignment

You are working in `G:\RWY37\horizon-ao` on the VBAO signal-quality SDD. Your
goal is to drive `openspec/changes/vbao-signal-quality-studio-gate/tasks.md`
through all phases and tasks in order, updating the SDD artifacts as evidence
changes.

## Objective

Keep `VBAONode` as a 32-sector SSILVB/VBAO horizon-bitmask product and harden
the signal before adding public knobs, swapping formulas, or hiding defects with
polish.

The concrete objective is to complete every unchecked task in `tasks.md`,
starting from the first incomplete phase. Do not skip ahead to attractive
optimization work. Every runtime candidate must be preceded by the source,
reference, or evidence gate named in the task list.

## Chosen Direction

- Preserve SSILVB/VBAO bitmask semantics.
- Use GTAO/XeGTAO/CACAO as production-discipline references, not algorithm
  replacements.
- Use N8AO as product-quality pressure, not ground truth.
- Keep the public API compact until internal evidence proves a user-facing
  control is necessary.
- Treat raw signal quality as the first problem: sector support, thickness
  contact, sampling stability, and edge attribution.
- Follow the integrated three-lane direction in
  `integrated-direction-sdd.md`:
  1. Contact policy fit.
  2. Sampling atlas bakeoff.
  3. Bitmask metadata sidecar.

## Compute Shape

Compute is allowed and encouraged where it fits:

- Direct WGSL compute readback is the oracle lane for fixtures, estimator drift,
  and GPU precision.
- Three TSL `ComputeNode` plus storage textures is the preferred
  product-candidate lane.
- Current `NodeMaterial` / render-target passes remain the control path.

Preferred compute candidates, in order:

1. Depth prepare / hierarchy / representative-depth storage textures.
2. Sector support/confidence metadata.
3. Edge metadata for resolve/polish.
4. Full raw-kernel compute port only after smaller compute candidates prove
   validation, timing, and render-graph consumption.

## Current Contracts

- `VBAONode` uses fixed 32-sector `u32` masks.
- Do not add public sector-count, atlas, temporal, velocity, denoise, edge
  metadata, or thickness-mode options from this SDD.
- Do not pivot into GTAO's two-horizon estimator.
- Do not chase N8AO smoothness by exposing denoise controls.
- Do not use temporal accumulation as the first quality fix.
- Do not claim WebGPU validation from WebGL fallback.
- Production build commands are forbidden unless explicitly requested.

## Execution Rules

1. Follow `tasks.md` phase order.
2. Start each run by reading `tasks.md`, `integrated-direction-sdd.md`,
   `magic-number-retirement-sdd.md`, and the relevant source/tests for the first
   unchecked task.
3. Add source-contract or reference tests before runtime changes.
4. Keep compute candidates private/internal and benchmark-labeled.
5. Keep current render-target output as the control until a compute candidate
   wins a named gate.
6. Every promoted candidate must improve a named label, reference error, pass
   count, target count, or p95 timing without regressing thin-gap or edges.
7. If compute only looks cleaner architecturally, reject it.
8. Update `EVIDENCE.md` only after screenshots, timings, labels, and backend
   status exist.
9. Mark tasks complete as soon as their acceptance criteria are met; leave
   incomplete tasks unchecked with a short blocker note in the relevant SDD
   artifact.

## Phase Driver

Proceed in this order, resuming from the first unchecked task:

1. Phase 2: finish reference alignment.
   - Confirm or add ray-cast rows for thin-gap, contact corner, broad wall,
     grazing surface, and normal-sensitive cases.
   - Add raw VBAO vs product VBAO contrast so polish cannot hide signal defects.
2. Phase 3: finish raw signal attribution.
   - Classify sector-boundary instability, stochastic thin-sector variance,
     64px phase-tile residuals, near-contact thickness collapse, and broad
     thickness-cap under-occlusion.
3. Phase 4: run the contact policy lane first.
   - Migrate brittle source tests from exact `0.3` / `0.85` literals to named
     policy contracts before behavior-preserving refactors.
   - Add RED fixtures before changing shader behavior.
4. Phase 5: run the sampling atlas bakeoff second.
   - Keep candidates CPU-baked atlas/LUT first: stable hash, IGN, STBN,
     Hilbert+R2, 128x128 tile, same-cost slice/sample changes.
   - Do not add procedural hot-path sampling until texture-vs-ALU evidence says
     it belongs there.
5. Phase 6: run compute only where it gives a better proof or data shape.
   - Prefer depth prepare or sector-confidence metadata before a full raw-kernel
     compute port.
6. Phase 7: let product pipeline candidates consume proven metadata.
   - Keep `getTextureNode()` as final product AO and `getRawTextureNode()` as
     debug/readback only.
7. Phase 8: update `EVIDENCE.md` only after screenshots, timings, labels,
   backend status, and reference rows exist.
8. Phase 9: run the smallest verification set that matches touched files and
   evidence changes.

Do not start with 64-sector masks, public knobs, temporal promotion, or
procedural IGN. That is the shortcut path. The SDD path is contact/reference
truth first, sampling placement second, bitmask metadata third.

## Verification

Use the smallest relevant checks:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoGtVbaoMath.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts
pnpm --filter @horizonao/demo benchmark:ao:gpu-readback
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check
pwsh -NoProfile -Command '$bad = Get-ChildItem -File "openspec/changes/vbao-signal-quality-studio-gate" | Select-String -Pattern "\s+$"; if ($bad) { $bad; exit 1 }'
```

Run benchmark commands only when the active phase requires WebGPU/readback or
rendered product evidence.
