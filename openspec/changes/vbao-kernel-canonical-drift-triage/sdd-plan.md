# SDD Plan: VBAO Kernel Canonical Drift Triage

## Current State

The pasted review is useful, but it mixes three categories:

- already-completed structural work, such as `vbaoBilateralWeight`;
- plausible kernel drift, such as uniform slice averaging, x² radial spacing,
  and the empirical thickness cap;
- out-of-scope architecture requests, such as temporal promotion and pass fusion.

The current spec says production uses selected GT-VBAO corrections and a uniform
slice average after cosine-measure sectorization. That is a deliberate contract
today, so this SDD does not start by changing the kernel. It starts by proving
whether the contract is wrong.

## Plan

### Phase 1: Source-Truth Claim Ledger

Create a compact ledger for the pasted review:

- accepted for investigation;
- already implemented;
- rejected because it conflicts with current evidence;
- deferred to another SDD.

Acceptance:

- Every accepted item has a source/spec reference.
- No runtime code changes land before this ledger exists.

### Phase 2: Fixture Gap Before Formula Change

Add non-axis-aligned/grazing-normal fixture coverage before touching slice
reduction. The current axis-aligned fixtures cannot prove or disprove the
review's cosine-weighted reduction claim.

Acceptance:

- At least one fixture stresses projected-normal slice contribution.
- Product/reference observations are recorded before deciding the formula.

### Phase 3: Slice Reduction Decision

If the new fixture proves uniform averaging is wrong, update the spec and then
change the kernel. If it does not, keep uniform averaging and document why
post-CDF cosine weighting would double-count.

Acceptance:

- Formula change requires RED fixture failure.
- Spec/ADR text changes before production code changes.

### Phase 4: Thickness and Sampling Contracts

Treat `sampleDist * 0.85` and x² radial spacing as load-bearing behavior.
Document them, test them, or replace them through evidence.

Acceptance:

- The thickness cap is no longer an unexplained constant.
- x² spacing either remains in spec with evidence or gets a measured alternative.

### Phase 5: Safe Performance Spike

Attempt the per-slice phase atlas hoist only after the correctness gates are
stable. The hoist is accepted only if generated shader output, visual labels,
and GPU timings all stay clean.

Acceptance:

- No stochastic thin-sector regression.
- No generated shader readability regression.

## Guardrails

- No public temporal API.
- No denoise knobs.
- No pass fusion.
- No production build unless explicitly requested.
- No formula change without a failing fixture and updated spec.

## Verification

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
git diff --check
```
