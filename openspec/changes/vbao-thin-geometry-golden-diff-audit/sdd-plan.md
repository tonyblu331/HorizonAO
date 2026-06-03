# SDD Plan: VBAO Thin Geometry Golden Diff Audit

## Current State

Thin geometry is already represented in three different evidence layers:

- scalar product fixtures cover a `thin-occluder` interval case;
- canonical drift covers `thin-separated` and reports product/canonical abs
  diff;
- ray-cast fixtures cover `thin-gap-separated-slabs` as finite scene geometry.

Those layers are useful, but they are not the same proof. The current risk is
that a future change can call a screenshot label, scalar drift row, or ray-cast
fixture a "golden diff" without saying which baseline it compares against. That
is too loose for kernel work.

## Decision

Treat thin-geometry golden diff as a contract family, not one number.

The audit will define separate gates for:

- scalar interval behavior against product/canonical VBAO references;
- finite ray-cast scene behavior against deterministic ground-truth fixtures;
- screenshot/timing evidence for rendered product rows.

No runtime kernel change should be accepted from this SDD unless the failing
gate is named and the replacement improves that same gate without regressing
the other two.

## Plan

### Phase 1: Golden Diff Inventory

Map every existing thin-geometry artifact to its proof layer:

- `packages/horizon-ao/reference/vbaoProductFixtureObservations.ts`;
- `packages/horizon-ao/reference/vbaoCanonicalDriftReport.ts`;
- `packages/horizon-ao/reference/aoRaycastReference.ts`;
- `apps/demo/scripts/profiling/*`;
- `EVIDENCE.md`.

Acceptance:

- Each artifact is classified as scalar, ray-cast, or rendered evidence.
- The audit names which files currently freeze expected fixture ids.

### Phase 2: Contract Gap Check

Decide whether the current thin cases cover the actual golden-diff question.

Acceptance:

- Thin single occluder, separated thin intervals, and separated slabs are all
  explicitly covered.
- Any missing case becomes a RED fixture task before runtime code changes.

### Phase 3: Metric Boundary

Define which metric is allowed to fail which gate.

Acceptance:

- Scalar drift uses accessibility and occupied sector/mask behavior.
- Ray-cast diff uses abs error against deterministic finite-radius reference.
- Rendered product evidence uses committed screenshot metrics and failure
  labels, especially `thin-gap`, `edge-bleed`, `mud`, and `stripe`.

### Phase 4: Thin-Geometry Golden Report

Add or extend a report only if the existing reports cannot express the gate.

Acceptance:

- Prefer extending existing report modules over adding a new generic report.
- Missing observations are blockers, not implicit passes.
- Report output can be copied into `EVIDENCE.md` without manual reinterpretation.

### Phase 5: Evidence Capture

Capture product rows only after the scalar/ray-cast gate is unambiguous.

Acceptance:

- Use pinned evidence cameras when screenshots are involved.
- Capture both AO-only and beauty rows when making rendered product claims.
- Do not run production build commands.

## Guardrails

- No shader/kernel edit before the failing golden-diff layer is identified.
- No denoise, temporal, pass-fusion, or public API scope.
- No half-resolution promotion claim from scalar fixtures alone.
- No "closer to ground truth" claim without ray-cast or GPU-readback evidence.
- No screenshot-only acceptance for a math change.

## Verification

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts
pnpm --filter @horizonao/core typecheck
git diff --check
```
