# Gate Decision: Thin Geometry Golden Diff

## Status

Phase 2.1 started and decided.

## Decision

Existing reports are enough for the first audit gate, but they are not enough
for a joined product claim.

The current modules already express the three proof layers:

- scalar product observations:
  `packages/horizon-ao/reference/vbaoProductFixtureObservations.ts`;
- canonical/product drift:
  `packages/horizon-ao/reference/vbaoCanonicalDriftReport.ts`;
- finite ray-cast reference and missing observation summaries:
  `packages/horizon-ao/reference/aoRaycastReference.ts` and
  `packages/horizon-ao/reference/aoReferenceReport.ts`.

Do not add a new report until Phase 3 proves product benchmark rows can carry
or derive explicit `thin-gap-separated-slabs` observations. Without that data,
a joined report would only restate missing evidence with more ceremony.

## Consequence

Phase 2.2 is deferred until Phase 3.1 answers the benchmark JSON question.
If product rows cannot carry the ray-cast thin fixture observation, the next
valid artifact is documentation of that ingestion boundary, not a fake RED test.

## Guardrail

Any future "thin geometry golden diff" evidence must say which layer it means:

- scalar thin diff;
- ray-cast thin diff;
- rendered thin-gap proxy.
