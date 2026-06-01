# Tasks: VBAO Product Discipline Hardening

## Phase 0: Freeze Contracts

- [x] 0.1 RED: Add source-contract coverage proving JBU fallback does not sample
  `rawAo` directly at full-resolution UV when fallback is described as bilinear.
- [x] 0.2 RED: Add source-contract coverage proving default full-resolution polish
  visits only `POISSON8`.
- [x] 0.3 RED: Add source-contract coverage for low-resolution softness mapping:
  cleanup first, full-resolution polish only after the threshold.
- [x] 0.4 RED: Add source-contract coverage for fixed product loop shapes.
- [x] 0.5 RED: Add evidence-contract coverage for pass timing rows and skipped
  pass labels.

## Phase 1: Fix Resolve Fallback

- [x] 1.1 GREEN: Accumulate manual fallback AO from the same four taps and bilinear
  weights used by JBU.
- [x] 1.2 REFACTOR: Keep raw/internal render targets nearest-filtered because
  interpolation is shader-owned.
- [x] 1.3 VERIFY: Run targeted Vitest for `vbaoNodeSource.test.ts`.

## Phase 2: Reduce Hidden Polish Cost

- [x] 2.1 GREEN: Make default full-resolution polish use the 8-tap kernel only.
- [x] 2.2 GREEN: Keep wide taps disabled or internally gated behind an evidence
  flag that is off by default.
- [x] 2.3 VERIFY: Update `EVIDENCE.md` wording so the default tap budget is explicit.

## Phase 3: Prevent Low-Resolution Double Filtering

- [x] 3.1 GREEN: Map `softness` to `cleanupStrength = softness`.
- [x] 3.2 GREEN: Map low-resolution `polishStrength = max(0, softness - 0.5) * 2`.
- [x] 3.3 GREEN: Keep full-resolution output behavior as `softness -> polish`.
- [x] 3.4 VERIFY: Run source-contract tests covering graph creation.

## Phase 4: Add Fixed Product Loop Shapes

- [x] 4.1 GREEN: Resolve product preset loop bounds from `VBAO_QUALITY_TIERS`.
- [x] 4.2 GREEN: Use numeric hot-loop bounds for known product tiers.
- [x] 4.3 GREEN: Keep explicit `slices`/`samples` overrides as advanced/debug
  dynamic shapes.
- [x] 4.4 VERIFY: Run package typecheck and targeted source tests.

## Phase 5: Evidence Gates

- [x] 5.1 Add pass-level timing rows for raw, cleanup, resolve, polish, and total.
- [x] 5.2 Add skipped-pass labels for elided passes.
- [x] 5.3 Add a noise-source comparison matrix placeholder before changing the
  default phase atlas.
- [x] 5.4 Keep canonical/product drift rows visible in `EVIDENCE.md`.

## Phase 6: Runtime/Reference Boundary

- [x] 6.1 Move reference/report modules under `packages/horizon-ao/src/reference/`.
- [x] 6.2 Update tests to import reference modules from the new internal paths.
- [x] 6.3 Confirm `packages/horizon-ao/src/index.ts` still exports only `VBAONode`,
  `vbao`, and option types.

## Phase 7: Final Verification

- [x] 7.1 Run targeted Vitest suites for source contracts and reference reports.
- [x] 7.2 Run package TypeScript typecheck.
- [x] 7.3 Run `pnpm typecheck:tsgo` or the package-level tsgo equivalent if the
  touched files require it.
- [x] 7.4 Run `git diff --check`.
- [x] 7.5 Do not run production build unless explicitly requested.
