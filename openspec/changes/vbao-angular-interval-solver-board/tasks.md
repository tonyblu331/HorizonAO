# Tasks: VBAO Angular Interval Solver Board

## Phase 1: Canonical Board

- [x] 1.1 Create `proposal.md` for the angular interval solver board.
- [x] 1.2 Create `design.md` with solver equation and dependency diagrams.
- [x] 1.3 Create `sdd-plan.md` with phase order and gates.
- [x] 1.4 Create `solver-whiteboard.md` for math/source/quirk chalkboard.
- [x] 1.5 Create `raw-signal-tightening.md` for the first implementation slice.
- [x] 1.6 Run planning-only diff hygiene.

## Phase 2: Red Fixture Matrix

- [x] 2.1 Add or update reference fixtures for near-contact thickness clamp.
- [x] 2.2 Add or update reference fixtures for broad-contact vs thin-gap tradeoff.
- [x] 2.3 Add sector-boundary and stochastic one-hit interval fixtures.
- [x] 2.4 Add edge-compatibility fixture that cannot be passed by scalar polish.
- [x] 2.5 Tag each fixture with the responsible solver term.

## Phase 3: Shader Candidate Isolation

- [x] 3.1 Pick exactly one candidate from the solver board.
- [x] 3.2 Add RED source/reference tests before runtime changes.
- [x] 3.3 Keep generated shader inspection stable and readable.
- [x] 3.4 Compare against current product path and same-cost alternatives.
- [x] 3.5 Reject or promote with named evidence.

## Phase 4: Reconstruction Alignment

- [x] 4.1 Audit cleanup/resolve/polish against receiver confidence and edge terms.
- [x] 4.2 Ensure raw/product rows are captured separately.
- [x] 4.3 Prove reconstruction does not hide raw failure labels.
- [x] 4.4 Record pass timings beside label and screenshot changes.

## Phase 5: Source Consolidation

- [x] 5.1 Consolidate duplicate validity/thickness semantics only after tests agree.
- [x] 5.2 Keep raw hot-loop extraction blocked unless it reduces audit cost.
- [x] 5.3 Archive or delete stale candidate docs after measured rejection.
- [x] 5.4 Verify refactors do not change shader formulas.

## Verification

- [x] 6.1 Run `git diff --check -- openspec/changes/vbao-angular-interval-solver-board`.
- [x] 6.2 For runtime phases, run focused reference/source tests.
- [ ] 6.3 Run typecheck when source changes.
- [x] 6.4 Do not run production build unless explicitly requested.
