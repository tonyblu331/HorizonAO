# Tasks: VBAO Half-Resolution Product Defaults

## Phase 0: Set Scope

- [x] 0.1 Verify the raw visibility slowdown claim against code and benchmark
  artifacts.
- [x] 0.2 Confirm the issue is product defaults using full-resolution
  `resolutionScale`, not the absence of a half-resolution product graph.
- [x] 0.3 Confirm this SDD does not add public denoise, temporal, compute, or
  debug scheduling options.

## Phase 1: Default Policy Fix

- [x] 1.1 RED: Add or identify behavior coverage for default
  `resolutionScale`.
- [x] 1.2 GREEN: Set `VBAO_DEFAULTS.resolutionScale` to `0.5`.
- [x] 1.3 GREEN: Set all named `VBAO_QUALITY_TIERS` to
  `resolutionScale: 0.5`.
- [x] 1.4 VERIFY: Confirm explicit `resolutionScale: 1.0` still overrides the
  preset/default policy.

## Phase 2: Source Contract Coverage

- [x] 2.1 Update source-contract tests that pin the quality-tier literals.
- [x] 2.2 Add behavior test coverage for default half-resolution product
  presets.
- [x] 2.3 Run focused Vitest for `vbaoSampling.test.ts` and
  `vbaoNodeSource.test.ts`.

## Phase 3: Evidence Refresh

- [x] 3.1 Capture default product rows for 1280x720 and 1920x1080.
- [x] 3.2 Capture explicit full-resolution comparison rows for the same scene,
  camera, quality, and output mode.
- [x] 3.3 Record raw, cleanup, resolve, polish, and total-product pass timings.
- [x] 3.4 Compare failure labels for noise, edge bleed, thin-gap preservation,
  stripe, anisotropy, and scale mismatch.
- [x] 3.5 Summarize the measured default tradeoff in this SDD: half-res reduces
  raw/total GPU cost, while the current report still labels half-res rows with
  `false-curvature` and `scale-mismatch`.
- [x] 3.6 Decide whether `EVIDENCE.md` should receive this capture now or wait
  for fixture observations, because the generated report marks product rows as
  `missing-reference-observation`.
- [x] 3.7 Do not update `EVIDENCE.md` in this slice; keep the capture as
  SDD-local cost evidence until fixture observations are available.

## Phase 4: Follow-Up Triage

- [x] 4.1 Keep the default-policy change scoped if the evidence goal is only
  cost reduction with known reconstruction tradeoffs.
- [x] 4.2 Route `false-curvature` and `scale-mismatch` follow-up to the existing
  depth hierarchy or signal-quality SDD lane instead of changing kernel formula
  here.
- [x] 4.3 Route any compute/storage follow-up to a separate SDD only if
  pass-level evidence shows fullscreen TSL raw work remains the limiting
  architecture after the default change.
- [x] 4.4 Route resolve/polish fusion to a separate topology SDD only if the
  remaining total-product cost is in reconstruction passes, not raw visibility.
- [x] 4.5 Confirm no kernel formula, topology, temporal, denoise, or public API
  change lands under this SDD.

## Phase 5: Final Verification

- [x] 5.1 Run focused unit/source-contract tests for the changed defaults and
  source contract.
- [x] 5.2 Confirm the evidence artifacts still exist at
  `artifacts/benchmarks/vbao-half-res-product-defaults.*` and screenshots under
  `artifacts/benchmarks/screenshots-vbao-half-res-product-defaults/`.
- [x] 5.3 Run `git diff --check` on the changed SDD, source, test, and evidence
  files.
- [x] 5.4 Record the production-build decision: not run, per project rule, unless
  explicitly requested.
