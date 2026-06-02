# Apply Progress: VBAO Product Discipline Hardening

## Status

All phases are complete. JBU fallback now reconstructs AO manually from
the same four-tap low-resolution footprint used by the edge-aware resolve path,
default full-resolution polish is back to the documented 8-tap budget, and
low-resolution softness now funds cleanup before full-resolution polish. Product
quality presets now use fixed raw shader loop shapes. Evidence capture now
distinguishes included-but-unmeasured internal passes from skipped passes.
Reference/report modules now live under `packages/horizon-ao/reference/`, outside runtime `src/`.

## Completed

- Added source-contract coverage for manual JBU fallback reconstruction.
- Verified the RED failure before implementation.
- Added `vbaoResolveFallbackAo` and `vbaoResolveFallbackWeight` accumulators in
  `VBAOResolveNode`.
- Accumulated fallback AO from each valid 2x2 tap using the existing bilinear
  weights.
- Removed the fallback `rawAo.sample(uvNode).r` path.
- Kept raw and internal render targets nearest-filtered.
- Added source-contract coverage proving default polish visits `POISSON8` and
  does not also visit wide taps.
- Removed default `POISSON_WIDE_TAPS` execution from `VBAOFullResPolishNode`.
- Updated `EVIDENCE.md` to make the default 8-tap polish budget explicit.
- Added source-contract coverage for low-resolution softness pass budgeting.
- Added `lowResolutionCleanupStrength()` and `fullResolutionPolishStrength()`.
- Low-resolution output now maps `softness` to cleanup first and uses
  `max(0, softness - 0.5) * 2` for full-resolution polish.
- Full-resolution output still maps `softness` directly to full-resolution polish.
- Added source-contract coverage for fixed product loop bounds.
- Added `VbaoRawLoopShape` and preset shape resolution.
- Product quality presets without explicit `slices`/`samples` now use numeric
  slice/sample loop bounds.
- Explicit `slices`/`samples` overrides remain the advanced dynamic path.
- Post-graph loop-shape changes now throw like other graph-shape changes.
- Added `createVbaoPassTimingRows()` to production AO benchmark capture.
- Added pass rows for raw, cleanup, resolve, polish, and total product output.
- Elided passes are labelled `skipped`; participating passes are labelled
  `unmeasured` until a collector captures true pass-level GPU timestamps.
- Added pass timing status output to the production quality markdown report.
- Added an `EVIDENCE.md` noise-source comparison gate placeholder.
- Moved `aoRaycastReference.ts`, `aoReferenceReport.ts`,
  `canonicalVbaoReference.ts`, `vbaoCanonicalDriftReport.ts`, and
  `vbaoReference.ts` under `packages/horizon-ao/reference/`.
- Updated tests and docs to use the new internal reference paths.
- Kept `packages/horizon-ao/src/index.ts` free of reference/report exports.

## Verification

- RED confirmed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "reconstructs JBU fallback"`
  failed before the implementation.
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "reconstructs JBU fallback"`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
- RED confirmed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "low-resolution softness"`
  failed before the implementation.
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "low-resolution softness"`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
- Passed:
  `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts`
- Passed:
  `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json`
- Passed:
  `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p packages/horizon-ao/tsconfig.json`
- Passed:
  `node --check apps/demo/scripts/collect-ao-benchmark.mjs`
- Passed:
  `node --check apps/demo/scripts/profiling/productionReport.mjs`
- Passed:
  `git diff --check`
- RED confirmed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "pass timing"`
  failed before the implementation.
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "pass timing"`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
- Passed:
  `node --check apps/demo/scripts/collect-ao-benchmark.mjs`
- Passed:
  `node --check apps/demo/scripts/profiling/productionReport.mjs`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts`
- Passed:
  `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json`
- RED confirmed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "fixed hot-loop"`
  failed before the implementation.
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "fixed hot-loop"`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
- Passed:
  `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json`
- RED confirmed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "near 8-tap"`
  failed before the implementation.
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts -t "near 8-tap"`
- Passed:
  `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`

## Remaining

- None for this SDD pass.

## Notes

- No production build was run.
- `git diff --check` emitted CRLF conversion warnings for existing working-copy
  line-ending normalization, but exited successfully.
