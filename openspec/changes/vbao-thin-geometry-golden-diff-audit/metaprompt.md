# Metaprompt: VBAO Thin Geometry Golden Diff Audit

You are working in `G:\RWY37\horizon-ao` on the VBAO thin-geometry golden-diff
audit.

## Objective

Make thin-geometry evidence impossible to blur. The goal is not to make a
single pretty "golden diff" number. The goal is to keep scalar interval math,
finite ray-cast geometry, and rendered screenshot proxies separate until a
claim explicitly proves all layers it depends on.

## Current Contracts

- `thin-occluder` in `vbaoProductFixtureObservations.ts` is product scalar
  evidence.
- `thin-separated` in `vbaoCanonicalDriftReport.ts` is canonical/product drift
  evidence.
- `thin-gap-separated-slabs` in `aoRaycastReference.ts` is the finite
  ray-cast geometry baseline.
- `thin-gap` in profiling reports is a rendered screenshot proxy label.
- Missing reference observations are blockers, not passes.
- Runtime kernel changes are forbidden until the failing evidence layer is
  named.
- Production build commands are forbidden unless explicitly requested.

## Execution Rules

1. Follow `tasks.md` phase order.
2. Name the proof layer before changing code: scalar thin diff, ray-cast thin
   diff, or rendered thin-gap proxy.
3. Do not use screenshot labels as proof of scalar or ray-cast correctness.
4. Do not use scalar fixture passes as half-resolution promotion evidence.
5. If benchmark JSON cannot carry `thin-gap-separated-slabs` observations,
   document that boundary before adding a report.
6. Prefer extending existing reference/gate modules over creating a generic
   report.
7. Keep temporal, denoise, pass fusion, public API, and runtime topology out of
   this SDD.

## First Valid Slice

Start with Phase 2:

- decide whether existing reports already express the required thin-geometry
  gates;
- if not, add RED tests for the smallest focused report;
- keep absent `thin-gap-separated-slabs` product observations visible as
  `missing-reference-observation`.

Only after that should product benchmark wiring or rendered capture work begin.

## Verification

Use focused checks:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts
git diff --check
```

Run typecheck only when TypeScript changes. Run benchmark/evidence scripts only
when the active phase requires rendered product evidence.
