# Tasks: HorizonAO Math Audit, Kernel Correction, And Spatial Denoise

## Phase 1: Math Policy

- [x] 1.1 Add RED Vitest coverage for raw defaults, option clamps, sample/slice splitting, falloff, center bias, and no-occluder resolve.
- [x] 1.2 Create `packages/horizon-ao/src/horizonAoMath.ts` with pure helpers and exports.
- [x] 1.3 Wire `HorizonAoNode.configure()` to the shared clamp helper.

## Phase 2: Raw Kernel Correction

- [x] 2.1 Add RED coverage for deterministic magic-square sample rotation indices.
- [x] 2.2 Add magic-square noise texture generation to `HorizonAoNode`.
- [x] 2.3 Update raw TSL kernel to use per-pixel sample rotation and radius jitter.

## Phase 3: Spatial Denoise

- [x] 3.1 Add RED API/default tests for spatial denoise exports.
- [x] 3.2 Add `HorizonAoDenoiseNode` as a separate scalar render-target pass.
- [x] 3.3 Wire demo HorizonAO baseline to use raw AO then denoised AO.
- [x] 3.4 Route `denoised-ao` through `createAoDebugOutput`.

## Phase 4: Harness And Docs

- [x] 4.1 Mark `denoised-ao` as a rendered debug view.
- [x] 4.2 Update Playwright debug-view coverage for `denoised-ao`.
- [x] 4.3 Persist SDD proposal, exploration, math audit, spec, design, and tasks.
- [x] 4.4 Update current shape roadmap with active change and revised next PRs.

## Phase 5: Verification

- [x] 5.1 Run core unit tests.
- [x] 5.2 Run core and demo typechecks with TypeScript and tsgo.
- [x] 5.3 Run lint.
- [x] 5.4 Run Playwright E2E.
- [x] 5.5 Run `pnpm -r build` because this change explicitly requests build verification.
- [x] 5.6 Save `verify-report.md` with evidence and caveats.
