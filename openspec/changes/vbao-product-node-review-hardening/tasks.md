# Tasks: VBAO Product Node Review Hardening

## Phase 1: Contrast Ledger

- [x] 1.1 Record pasted review claims against current source/evidence.
- [x] 1.2 Mark stale, open, rejected, and delegated claims.
- [x] 1.3 Keep this phase planning-only.

## Phase 2: Preset Policy Gate

- [x] 2.1 Re-read latest half/full product evidence and classify the default
      policy as pass or fail.
- [ ] 2.2 If half-res still fails, update product defaults or add an explicit
      non-default half-res route.
- [ ] 2.3 Update source tests and evidence notes for the selected policy.
- [x] 2.4 Add SDD spec scenario for preset/evidence consistency.

## Phase 3: Runtime Boundary Audit

- [x] 3.1 Audit `VBAOResolvePolishNode.ts` imports and benchmark-only usage.
- [ ] 3.2 Decide whether evidence-only pass code remains private runtime source
      or moves to a clearer evidence/debug boundary.
- [ ] 3.3 Audit internal benchmark/temporal options for public leakage.
- [x] 3.4 Name renderer-state owner files for the pass ownership audit.

## Phase 4: Pass Ownership Cleanup

- [ ] 4.1 Compare `VBAOResolveNode` and `VBAOHalfResCleanupNode` with
      `VBAOEffectPass`.
- [ ] 4.2 Refactor only if pass labels, output, and evidence capture remain
      stable.
- [ ] 4.3 Run targeted source tests.

## Phase 5: Comment and Constant Hygiene

- [ ] 5.1 Remove `GT-VBAO++` wording from runtime comments.
- [ ] 5.2 Audit `VBAO_THETA_*` exports and move/delete only if runtime-unused.
- [ ] 5.3 Remove or soften unverified exact performance claims.

## Phase 6: Verification

- [x] 6.1 Run `git diff --check`.
- [x] 6.2 Skip targeted Vitest for this planning pass because no source files
      changed.
- [x] 6.3 Skip typecheck for this planning pass because no TypeScript files
      changed.
- [x] 6.4 Do not run production build unless explicitly requested.
- [x] 6.5 Verify `specs/vbao-node/spec.md` exists for this SDD.
