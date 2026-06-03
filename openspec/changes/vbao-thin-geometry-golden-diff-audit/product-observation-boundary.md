# Product Observation Boundary

## Status

Phase 3.1 checked.

## Finding

Benchmark/report JSON can carry reference observations, but the current
collector does not populate `thin-gap-separated-slabs` observations.

Evidence:

- `apps/demo/scripts/profiling/productionReport.mjs` reads
  `row.referenceObservations` and `row.referenceGate.observations`.
- `apps/demo/scripts/profiling/productionReport.d.mts` exposes the same fields
  in report row types.
- `apps/demo/scripts/collect-ao-benchmark.mjs` writes a top-level
  `referenceGate.productRows` summary from captured rows, but it does not add
  fixture observations to the rows.
- `packages/horizon-ao/reference/aoProductionReferenceGate.ts` can compare
  observations when rows provide fixture ids and accessibility values.

## Decision

The ingestion shape exists. The missing work is observation production, not
report formatting.

Do not create a joined thin-geometry report yet. First, add a measured source
for `thin-gap-separated-slabs` observations, or explicitly document that product
benchmark rows remain screenshot-proxy evidence only.

## Consequence

Phase 3.2 should either:

- add a real observation producer for product rows; or
- document that no GPU-readback/product observation exists yet and keep the
  ray-cast thin diff separate from rendered thin-gap proxy evidence.
