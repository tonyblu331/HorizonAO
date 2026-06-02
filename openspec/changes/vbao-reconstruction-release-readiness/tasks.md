# Tasks: VBAO Reconstruction Release Readiness

## Phase 1: Half-resolution stage autopsy

- [x] 1.1 Add RED report/source tests requiring half-res stage rows for raw AO, cleanup, JBU resolve, optional polish, and final AO.
- [x] 1.2 Capture `/museum` half-res stage screenshots at `1920x1080` and `1280x720`.
- [x] 1.3 Label each stage for noise, stripe, edge bleed, thin gap, scale mismatch, and false curvature.
- [x] 1.4 Record the first failing stage in `EVIDENCE.md`.

## Phase 2: Targeted reconstruction fix

- [x] 2.1 If raw half-res is wrong, inspect AO radius projection, sample validity, and thickness scaling before cleanup.
- [x] 2.2 If cleanup is wrong, test whether it blurs structural edges or preserves invalid AO. N/A: raw remains the first failing stage.
- [x] 2.3 If JBU is wrong, test radius/depth/normal weights against scale mismatch and false curvature. N/A: raw remains the first failing stage.
- [x] 2.4 Recapture the same stage matrix and decide whether half-res is promoted or demoted.

## Phase 3: Shader diagnostics cleanup

- [x] 3.1 Reproduce the duplicate `vbaoPixel` warning with generated shader inspection.
- [x] 3.2 Fix naming/lifecycle causes without changing product output.
- [x] 3.3 Add a regression check or evidence row proving the warning no longer reproduces.

## Phase 4: Runtime fat cleanup

- [x] 4.1 Remove the duplicate `enabled` guard in half-res cleanup if still present.
- [x] 4.2 Audit `vbaoSampling.ts` for benchmark-only candidates in product runtime.
- [x] 4.3 Move candidates to reference/demo/benchmark code if source contracts prove runtime does not need them.
- [x] 4.4 Verify `src/index.ts` still exports only the product API.

## Phase 5: Product fixture observations

- [x] 5.1 Add product fixture observations for flat plane, full hemisphere, two-wall corner, and thin occluder.
- [x] 5.2 Mark missing product reference observations as blockers, not passes.
- [x] 5.3 Update `EVIDENCE.md` with fixture observations before any quality claim.

## Phase 6: Verification

- [x] 6.1 Run targeted Vitest/source-contract tests for touched source/report code.
- [x] 6.2 Run package typecheck when TS changes.
- [x] 6.3 Run generated shader inspection after diagnostics changes.
- [x] 6.4 Run `git diff --check`.
- [x] 6.5 Run production build only if the user explicitly authorizes it, then record status in `EVIDENCE.md`. Not run: no explicit production-build authorization.
