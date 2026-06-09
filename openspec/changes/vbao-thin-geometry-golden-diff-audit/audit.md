# Audit: Thin Geometry Golden Diff

## Finding

The repo has real thin-geometry evidence, but the evidence is split across
different proof meanings. That is acceptable only if future work names the
layer it is changing.

## Existing Coverage

| Layer | File | Thin-geometry signal | Current role |
| --- | --- | --- | --- |
| Product scalar | `packages/horizon-ao/reference/vbaoProductFixtureObservations.ts` | `thin-occluder` with accessibility and occupied sector count | Product scalar observation, not ground truth |
| Canonical drift | `packages/horizon-ao/reference/vbaoCanonicalDriftReport.ts` | `thin-separated` comparing canonical and product accessibility | Drift detector between VBAO lanes |
| Ray-cast reference | `packages/horizon-ao/reference/aoRaycastReference.ts` | `thin-gap-separated-slabs` with finite boxes and cosine-hemisphere rays | Ground-truth-style fixture |
| Rendered evidence | `apps/demo/scripts/profiling/productionReport.mjs` and `screenshotMetrics.mjs` | `thin-gap` failure label/proxy | Screenshot proxy, not scalar proof |
| Evidence ledger | `EVIDENCE.md` | Thin-gap rows and fixture observation summaries | Human-readable shipping evidence |

## Classification

### Scalar Product Fixture

`thin-occluder` proves that the scalar product reference keeps a narrow interval
narrower and more accessible than a thick blocker. It is a kernel-shape guard.
It does not prove the rendered product is visually correct.

### Canonical Drift Fixture

`thin-separated` proves that product VBAO corrections can diverge materially
from the strict canonical lane. A warn row is not automatically a bug; it is a
forced explanation point before calling product behavior an improvement.

### Ray-Cast Fixture

`thin-gap-separated-slabs` is the closest existing golden geometry case. It uses
finite boxes and deterministic hemisphere rays, so it is the correct baseline
for "closer to ground truth" language.

### Rendered Product Label

`thin-gap` is a screenshot proxy label. It is useful for product evidence and
regression triage, but it cannot replace scalar or ray-cast evidence when the
kernel math changes.

## Gaps

- There is no single named "thin geometry golden diff" report that joins scalar
  drift, ray-cast abs error, and rendered product labels.
- Existing rendered benchmark rows can miss reference observations; the gate
  correctly reports those as `missing-reference-observation`.
- The ray-cast fixture has separated slabs, but there is no GPU-readback
  observation wired into the production reference gate by default.
- Current half/full-resolution rendered rows can show `thin-gap` proxy changes,
  but those rows are not proof of scalar interval correctness.

## Recommended Contract

Use this language in future tasks and evidence:

- "scalar thin diff" for `thin-occluder` and `thin-separated` accessibility or
  mask/sector comparisons;
- "ray-cast thin diff" for abs error against `thin-gap-separated-slabs`;
- "rendered thin-gap proxy" for screenshot labels and metrics.

Any golden-diff claim must name one of those three. Broad "thin geo is fixed"
claims require all three to be clean or explicitly scoped.

## Immediate Next Work

1. Add a focused thin-geometry report or extend
   `aoProductionReferenceGate.ts` only if product benchmark JSON can provide
   fixture observations for `thin-gap-separated-slabs`.
2. Add a RED test if a new thin-geometry fixture is needed before changing
   `VBAONode.ts`.
3. Capture rendered rows only after the scalar/ray-cast gate is named.

## Non-Decisions

- No public API change.
- No temporal or denoise change.
- No half-resolution promotion.
- No kernel tuning from screenshot labels alone.
