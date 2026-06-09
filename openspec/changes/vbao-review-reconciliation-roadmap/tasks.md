# Tasks: VBAO Review Reconciliation Roadmap

## Phase 1: Review Reconciliation Ledger

- [x] 1.1 Record pasted review claims against current source/spec evidence.
- [x] 1.2 Mark each claim as already done, still open, rejected, or delegated.
- [x] 1.3 Confirm this SDD makes no runtime behavior changes.

## Phase 1b: Research Verification

- [x] 1b.1 Verify VBAO/thickness/sample-spacing claims against SSILVB sources.
- [x] 1b.2 Verify slice-weighting pressure against GTAO research.
- [x] 1b.3 Record principal-level decisions in `research-verification.md`.

## Phase 2: Kernel Formula Routing

- [x] 2.1 Link cosine/slice weighting claims to
      `vbao-kernel-canonical-drift-triage`.
- [x] 2.2 Require multi-slice/non-axis fixture evidence before any production
      formula change.
- [x] 2.3 Update this roadmap after the kernel triage SDD decides the formula.

## Phase 3: Bilateral Constant Rationale

- [x] 3.1 Document the current plane-distance and normal-agreement policy.
- [x] 3.2 Add tests or evidence notes for `24` and `normal^8` behavior.
- [x] 3.3 Defer softer candidates until before/after screenshots and GPU timing
      are captured under a separate tuning SDD.

## Phase 4: Phase Atlas Hoist Spike

- [x] 4.1 Add a preflight note for hoisting phase atlas computation.
- [x] 4.2 Defer the hoist prototype until the projected-normal formula candidate
      has product-stage evidence.
- [x] 4.3 Record generated-shader/timing acceptance requirements for the future
      hoist.

## Phase 5: API Alias Migration

- [x] 5.1 Decide the deprecation window for `preset`, `scale`, and `intensity`.
- [x] 5.2 Document migration or shim behavior.
- [x] 5.3 Add source/API tests for the chosen policy.

## Phase 6: Demo Evidence Boundary

- [x] 6.1 Audit remaining `MuseumScene.tsx` VBAO pipeline wiring.
- [x] 6.2 Defer extraction because remaining wiring is evidence-specific, not
      behavior-neutral duplication.
- [x] 6.3 Verify benchmark capture and source contracts still pass.

## Phase 7: Verification

- [x] 7.1 Run `git diff --check`.
- [x] 7.2 Run targeted Vitest when implementation files change.
- [x] 7.3 Run package typecheck when TypeScript changes.
- [x] 7.4 Do not run production build unless explicitly requested.
