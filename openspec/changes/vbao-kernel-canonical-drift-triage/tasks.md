# Tasks: VBAO Kernel Canonical Drift Triage

## Phase 1: Claim Triage

- [x] 1.1 Record source/spec evidence for each pasted review claim.
- [x] 1.2 Mark claims as accepted, already done, rejected, or deferred.
- [x] 1.3 Update `EVIDENCE.md` with the triage verdict before runtime edits.

## Phase 2: Non-Axis-Aligned Drift Fixtures

- [x] 2.1 Add RED reference coverage for at least one grazing-normal fixture.
- [x] 2.2 Add product observation rows for the same fixture family.
- [x] 2.3 Decide whether uniform slice averaging fails the fixture.

## Phase 3: Slice Reduction Decision

- [x] 3.1 If fixtures fail, update the spec/ADR before changing runtime code.
- [x] 3.2 Implement the smallest slice-reduction correction that satisfies the
      fixture.
- [x] 3.3 Skip the preserve-uniform branch because the multi-slice fixture did
      fail at warning level.

## Phase 4: Thickness and Radial Spacing

- [ ] 4.1 Document the `sampleDist * 0.85` thickness cap or replace it with a
      measured alternative.
- [ ] 4.2 Compare x² spacing against reference/product evidence.
- [ ] 4.3 Update source contracts to pin the accepted behavior.

## Phase 5: Phase Atlas Hoist Spike

- [ ] 5.1 Prototype hoisting per-slice phase work only if generated shader output
      stays readable and deterministic.
- [ ] 5.2 Compare screenshots, labels, and GPU timings against baseline.
- [ ] 5.3 Accept the hoist only if it improves cost without stochastic quality
      regressions.

## Phase 6: Verification

- [x] 6.1 Run targeted Vitest/reference tests for touched files.
- [x] 6.2 Run package typecheck when TypeScript changes.
- [x] 6.3 Run generated shader inspection if kernel source changes.
- [x] 6.4 Run `git diff --check`.
- [x] 6.5 Do not run production build unless explicitly requested.
