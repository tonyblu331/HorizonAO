# Tasks: VBAO Product Node Review Hardening

## Phase 1: Contrast Ledger

- [x] 1.1 Record pasted review claims against current source/evidence.
- [x] 1.2 Mark stale, open, rejected, and delegated claims.
- [x] 1.3 Keep this phase planning-only.
- [x] 1.4 Add benchmark contrast for GTAO/SSAO/N8AO, half-res, and noise-source
      claims.

## Phase 2: Preset Policy Gate

- [x] 2.1 Re-read latest half/full product evidence and classify the default
      policy as pass or fail.
- [x] 2.2 If half-res still fails, update product defaults or add an explicit
      non-default half-res route.
- [x] 2.3 Update source tests and evidence notes for the selected policy.
- [x] 2.4 Add SDD spec scenario for preset/evidence consistency.

## Phase 3: Runtime Boundary Audit

- [x] 3.1 Audit `VBAOResolvePolishNode.ts` imports and benchmark-only usage.
- [x] 3.2 Decide whether evidence-only pass code remains private runtime source
      or moves to a clearer evidence/debug boundary.
- [x] 3.3 Audit internal benchmark/temporal options for public leakage.
- [x] 3.4 Name renderer-state owner files for the pass ownership audit.

## Phase 4: Pass Ownership Cleanup

- [x] 4.1 Compare `VBAOResolveNode` and `VBAOHalfResCleanupNode` with
      `VBAOEffectPass`.
- [x] 4.2 Refactor only if pass labels, output, and evidence capture remain
      stable.
- [x] 4.3 Run targeted source tests.

## Phase 5: Comment and Constant Hygiene

- [x] 5.1 Remove `GT-VBAO++` wording from runtime comments.
- [x] 5.2 Audit `VBAO_THETA_*` exports and move/delete only if runtime-unused.
- [x] 5.3 Remove or soften unverified exact performance claims.
- [x] 5.4 Record temporal prototype constants as rejected/private follow-up
      evidence, not product-default work.

## Phase 6: Evidence Reconciliation

- [x] 6.1 Prefer latest committed evidence over pasted-review claims when they
      conflict.
- [x] 6.2 Keep FAST-like/STBN promotion blocked by the current evidence gate.
- [ ] 6.3 Execute competitor benchmark matrix and reproduce/supersede pasted
      GTAO/SSAO/N8AO numbers before changing product claims.
- [x] 6.3-plan Define competitor benchmark matrix plan.
- [ ] 6.4 Execute reference-backed fixture observations before promoting product
      quality claims.
- [x] 6.4-plan Define reference-backed fixture observation plan.

## Phase 7: Verification

- [x] 7.1 Run `git diff --check`.
- [x] 7.2 Run targeted Vitest for preset/source-contract coverage.
- [x] 7.3 Run core typecheck.
- [x] 7.4 Do not run production build unless explicitly requested.
- [x] 7.5 Verify `specs/vbao-node/spec.md` exists for this SDD.
