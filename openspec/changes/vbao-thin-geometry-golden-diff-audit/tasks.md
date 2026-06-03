# Tasks: VBAO Thin Geometry Golden Diff Audit

## Phase 1: Audit

- [x] 1.1 Inventory existing thin-geometry scalar, ray-cast, and rendered evidence.
- [x] 1.2 Classify current golden-diff meanings by evidence layer.
- [x] 1.3 Record guardrails preventing screenshot-only math changes.

## Phase 2: Gate Definition

- [x] 2.1 Decide whether existing reports are enough or a focused thin report is needed.
- [x] 2.2 If a report is needed, add RED tests for its expected fixture ids and missing-observation behavior.
- [x] 2.3 Keep missing fixture observations as blockers.

## Phase 3: Product Observation Wiring

- [x] 3.1 Check whether benchmark JSON can carry `thin-gap-separated-slabs` reference observations.
- [x] 3.2 Add or document the ingestion path for product rows.
- [x] 3.3 Verify the production reference gate marks absent thin observations as misses.

## Phase 4: Rendered Evidence

- [x] 4.1 Capture AO-only and beauty rows only after the target gate is named.
- [x] 4.2 Compare `thin-gap`, `edge-bleed`, `mud`, and `stripe` labels.
- [x] 4.3 Copy reviewed rows into `EVIDENCE.md` with the scalar/ray-cast/rendered boundary intact.

## Phase 5: Verification

- [x] 5.1 Run focused reference tests.
- [x] 5.2 Run core typecheck if TypeScript changes.
- [x] 5.3 Run `git diff --check`.
- [x] 5.4 Do not run production build unless explicitly requested.
