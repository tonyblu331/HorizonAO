# Tasks: VBAO Ground-Truth Quality Oracle

## Phase 1: RED/GREEN Oracle

- [x] 1.1 Add RED tests for fully open and fully blocked oracle fixtures.
- [x] 1.2 Implement deterministic hemisphere accessibility estimation.
- [x] 1.3 Add RED tests for normalized quality scoring.
- [x] 1.4 Implement accessibility quality scoring.

## Phase 2: Failure Labels

- [x] 2.1 Add RED test for `false-curvature` classification.
- [x] 2.2 Implement the quality-label classifier.
- [x] 2.3 Add RED tests for raw-vs-candidate oracle acceptance/rejection.
- [x] 2.4 Implement oracle-backed candidate evaluation.

## Phase 3: Contract

- [x] 3.1 Keep oracle out of `index.ts`.
- [x] 3.2 Use oracle output in a future benchmark/evidence matrix.

## Phase 4: Fixture Matrix

- [x] 4.1 Add RED tests for required fixture IDs.
- [x] 4.2 Add deterministic fixture matrix implementation.
- [x] 4.3 Generate JSON evidence artifact for the fixture matrix.
- [x] 4.4 Keep fixture helpers out of public package API.
