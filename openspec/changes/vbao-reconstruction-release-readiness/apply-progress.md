# Apply Progress: VBAO Reconstruction Release Readiness

Created from the 2026-06-01 candid review. No implementation has started yet.

## Current Status

- [x] SDD proposal/design/tasks/spec created.
- [x] Phase 1 RED tests/evidence contracts started.
- [x] Half-resolution stage capture implemented.
- [ ] Reconstruction fix implemented.
- [ ] Shader diagnostics fixed.
- [ ] Runtime fat cleanup implemented.
- [ ] Product fixture observations added.

## 2026-06-01

- Added report contracts for required half-resolution reconstruction stages:
  `raw`, `cleanup`, `resolve`, `polish`, and `final`.
- Half-resolution product rows with missing stage evidence are now marked
  incomplete through `createEvidenceArtifactStatusRows`.
- `writeProductionQualityReports` now emits a dedicated reconstruction stage
  status table.
- Added demo/internal-only stage capture for half-resolution VBAO without
  exporting the internal pass nodes from `@horizonao/core`.
- Captured `/museum` half-resolution stage screenshots at `1920x1080` and
  `1280x720` with `AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES=1` on port `5188`.
- Recorded the first failing stage as `raw` in `EVIDENCE.md`, so Phase 2 should
  inspect raw half-resolution AO before tuning cleanup/JBU.

## 2026-06-02

- Added a strict source contract proving raw half-resolution sampling separates
  output render-target resolution from source depth/normal texture resolution.
- Updated `VBAONode` so the raw AO noise phase pixel and safe source clamp use
  full source texture coordinates via `sourceResolution`, while the raw render
  target still uses scaled `resolution`.
- Re-ran the `/museum` reconstruction stage matrix at `1920x1080` and
  `1280x720` on isolated port `5189`.
- The patch is mathematically correct but not sufficient to promote half-res:
  raw remains the first failing stage and final half-res rows still carry
  `noise,false-curvature,scale-mismatch`.
- Half-resolution remains demoted for release; Phase 3 should address the known
  duplicate `vbaoPixel` diagnostics next.

## 2026-06-02 — Phase 3

- Reproduced the diagnostics failure with generated shader inspection on port
  `5190`: `vbaoDuplicateDeclarationWarnings: 3`.
- Fixed the warning by keeping the raw noise pixel as a reusable expression
  instead of a named TSL `toVar(...)`; this avoids duplicate named declarations
  when the noise helper is referenced multiple times.
- Hardened shader inspection so any VBAO duplicate declaration warning fails
  the gate instead of being reported as non-blocking diagnostics debt.
- Re-ran generated shader inspection on port `5191`: fixed loops still pass,
  no surprise pass shape is present, and `vbaoDuplicateDeclarationWarnings: 0`.

## 2026-06-02 — Phase 4

- Removed the duplicate disabled-setup guard from `VBAOHalfResCleanupNode`; the
  pass already bypasses disabled output through `getTextureNode()` and rendering
  through `updateBefore()`.
- Audited `vbaoSampling.ts` and removed benchmark-only candidate noise sources
  from product runtime sampling.
- Moved benchmark noise candidate generation into
  `apps/demo/src/scenes/vbaoBenchmarkNoise.ts`.
- Kept the product package public API unchanged: `src/index.ts` still exports
  only `VBAONode`, `vbao`, and public option types.

## 2026-06-02 — Phase 5

- Added `packages/horizon-ao/reference/vbaoProductFixtureObservations.ts` with
  product-lane scalar observations for flat plane, full hemisphere, two-wall
  corner, and thin occluder.
- Added `packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts`
  to freeze the fixture set and prove missing fixture observations are reported
  as `missing-reference-observation` blockers.
- Updated `EVIDENCE.md` with the product fixture observation gate before any
  release-quality claim.

## 2026-06-02 — Phase 6

- Targeted Vitest/source-contract verification passed:
  `pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts`.
- Core typecheck passed:
  `pnpm --filter @horizonao/core typecheck`.
- Demo typecheck passed:
  `pnpm --filter @horizonao/demo typecheck`.
- Script syntax checks passed for generated shader inspection, AO benchmark, and
  production report scripts.
- Generated shader inspection passed on port `5192` with
  `vbaoDuplicateDeclarationWarnings: 0`.
- `git diff --check` passed with line-ending warnings only.
- Production build was not run because the project rule requires explicit user
  authorization for production builds.
