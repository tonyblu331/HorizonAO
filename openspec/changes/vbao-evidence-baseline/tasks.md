# Tasks: VBAO Evidence Baseline

## Phase 1: Evidence Contract

- [x] 1.1 RED: Add/adjust documentation check coverage for `EVIDENCE.md` required columns and failure labels if a doc-check helper exists.
- [x] 1.2 GREEN: Update `EVIDENCE.md` with raw/denoised GTAO, VBAO, and N8AO rows, `viewMode`, `denoise`, `timingMethod`, `medianTime_ms`, and `failureLabels`.
- [x] 1.3 REFACTOR: Keep existing pinned-camera and resolution guidance, removing duplicate or stale row schemas.

## Phase 2: Demo Evidence Mode

- [x] 2.1 RED: Add Playwright expectation for the Museum comparison route exposing raw/denoised and full-resolution evidence controls.
- [x] 2.2 GREEN: Modify `apps/demo/src/scenes/MuseumScene.tsx` to provide demo-local full-res VBAO evidence rendering with `resolutionScale = 1.0`.
- [x] 2.3 GREEN: Ensure raw and denoised output remain separate in beauty and AO-only views.
- [x] 2.4 REFACTOR: Keep full-res evidence mode out of `VBAONodeOptions` and `VBAO_QUALITY_TIERS`.

## Phase 3: Capture Workflow

- [x] 3.1 RED: Add route/control smoke coverage in `apps/demo/e2e/scene-routes.spec.ts` or `apps/demo/e2e/ao-compare.spec.ts`.
- [x] 3.2 GREEN: Document exact manual WebGPU capture steps in `EVIDENCE.md` for 1920x1080 and 1280x720.
- [x] 3.3 GREEN: Document timing source fields: device, browser, renderer, timing method, and median frame/pass time.

## Phase 4: Verification

- [x] 4.1 Run targeted Vitest only if helper logic was added.
- [ ] 4.2 Run targeted Playwright route/control smoke tests; do not run production builds.
- [x] 4.3 Manually capture WebGPU screenshots/timings and fill evidence rows, or mark remaining rows as pending with explicit blockers.
