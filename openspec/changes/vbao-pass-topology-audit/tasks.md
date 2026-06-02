# Tasks: VBAO Pass Topology Audit

## Phase 0: Freeze Scope

- [x] 0.1 Confirm the pasted proposals are contrasted against current repo code,
  ADRs, and source-contract tests.
- [x] 0.2 Confirm `VBAOTemporalAccumulationNode` remains absent and this change
  does not reintroduce AO-owned temporal.
- [x] 0.3 Confirm shared bilateral geometry weighting already exists in
  `vbaoBilateralWeight.ts`.
- [x] 0.4 Fix SDD wording so the number of reviewed pasted proposals is accurate.
- [x] 0.5 Keep this change documentary/evidence-first until baseline timing rows
  exist.

## Phase 1: Baseline Current Graph

- [x] 1.1 RED: Add or confirm pass-timing contract coverage for raw, half-res
  cleanup, JBU resolve, full-resolution polish, skipped passes, and total.
- [x] 1.2 GREEN: Capture current graph pass timings for pinned evidence cameras at
  1920x1080 and 1280x720.
- [x] 1.3 GREEN: Record render-target inventory: target name, format, resolution
  scale, lifetime, and allocation owner.
- [x] 1.4 VERIFY: Confirm screenshots, quality metrics, failure labels, and pass
  timings exist before any topology change is proposed.

## Phase 2: Boilerplate Extraction Spike

- [x] 2.1 RED: Add source-contract coverage that preserves render-target format,
  pass texture behavior, sizing, and render-state restore for one migrated pass.
- [x] 2.2 GREEN: Prototype a shared internal pass base on one optional pass only,
  preferably `VBAOFullResPolishNode`.
- [x] 2.3 VERIFY: Run targeted source tests and typechecks; compare screenshots
  and timings against Phase 1.
- [x] 2.4 DECIDE: Keep the abstraction only if behavior, timing labels, and shader
  inspection remain clean.

## Phase 2b: File Cohesion Audit

- [x] 2b.1 RED: Add or confirm tests protecting public exports and source imports
  before moving files.
- [x] 2b.2 Evaluate whether `vbaoSampling.ts` and `vbaoNoise.ts` should remain
  split for deterministic-test vs. texture-construction ownership.
- [x] 2b.3 Evaluate whether `vbaoConstants.ts` should remain the public
  option/preset boundary.
- [x] 2b.4 DECIDE: Do not create a generic `vbaoCore.ts` unless the new module has
  one clear responsibility.

## Phase 3: Half-Res Cleanup Removal Experiment

- [x] 3.1 RED: Add an internal evidence-only toggle or fixture path that can
  compare low-resolution cleanup enabled vs. skipped.
- [x] 3.2 GREEN: Capture AO-only and beauty output for cleanup-on vs. cleanup-off.
- [x] 3.3 VERIFY: Compare timing and failure labels for noise, edge bleed, halo,
  thin-gap, mud, stripe, and scale mismatch.
- [x] 3.4 DECIDE: Remove cleanup only if timing improves and failure labels do not
  regress.

## Phase 4: Resolve/Polish Fusion Experiment

- [x] 4.0 PREFLIGHT: Add a high-softness low-resolution evidence row where polish
  is active before implementing any fused candidate.
- [x] 4.1 RED: Add source/evidence contracts for a private fused candidate without
  temporal, history, reprojection, or public denoise controls.
- [x] 4.2 GREEN: Implement a private fused resolve-polish candidate behind an
  evidence-only path.
- [x] 4.3 VERIFY: Compare against the Phase 1 reference path for target count,
  timing, shader inspectability, and visual labels.
- [x] 4.4 DECIDE: Keep fusion only if it improves total cost without weakening the
  resolve boundary.

## Phase 5: Future Work Triage

- [x] 5.1 File separate proposals for velocity-backed AO-owned temporal,
  multi-bounce, bent normals, directional occlusion, or public API changes.
- [x] 5.2 Confirm no `temporal`, `denoiseStrength`, velocity option, or public
  denoise option lands from this SDD.
- [x] 5.3 Archive rejected topology candidates with measured reasons.

## Phase 6: Verification

- [x] 6.1 Run targeted source-contract Vitest for
  `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`.
- [x] 6.2 Run `pnpm --filter @horizonao/core typecheck`.
- [x] 6.3 Run `pnpm --filter @horizonao/demo typecheck` when demo/evidence code is
  touched.
- [x] 6.4 Run the smallest benchmark/evidence command required by the active
  phase.
- [x] 6.5 Run `git diff --check`.
- [x] 6.6 Do not run production build unless explicitly requested.
