# Tasks: VBAO Release-Candidate Gates

## Phase 1: Half-Resolution Quality Gate

- [x] 1.1 Capture `vbao` product half/full rows for `/museum` at `1920x1080` and `1280x720`.
- [x] 1.2 Add `EVIDENCE.md` rows for pattern/noise, stripe, edge-bleed, thin-gap, median, and p95.
- [x] 1.3 Record pass/fail: half-res promoted only if quality regressions are acceptable.

## Phase 2: Noise Reality Gate

- [x] 2.1 Verify current atlas, IGN, static STBN, and FAST-like rows are current after product-preset fix.
- [x] 2.2 Add procedural/no-texture IGN task or blocker if current IGN still uses atlas fetches.
- [x] 2.3 Record rejection reasons; do not change default noise source without a Pareto win.

## Phase 3: Runtime Boundary Trim

- [x] 3.1 Audit imports for `packages/horizon-ao/src/vbaoGtVbaoMath.ts`; move to `reference/` if runtime-unused.
- [x] 3.2 Move debug sector tables out of runtime constants if only reference/tests need them.
- [x] 3.3 Replace or quarantine `__benchmarkNoiseSource` behind internal benchmark-only typing.
- [x] 3.4 Verify `packages/horizon-ao/src/index.ts` exports only product API.

## Phase 4: Generated Shader Inspection

- [x] 4.1 Add a generated shader capture path for `quality` product rows.
- [x] 4.2 Assert fixed loop bounds, no full-res JBU, no wide polish, and no surprise pass.
- [x] 4.3 Investigate `vbaoPixel` duplicate-name warnings; fix or document blocker.

## Phase 5: Review Archive Completeness

- [x] 5.1 Add/update archive manifest to include internal pass files, `src/index.ts`, references, and tests.
- [x] 5.2 Verify archive has no missing imports for files under review.

## Phase 6: Verification

- [x] 6.1 Run targeted Vitest for touched source/report contracts.
- [x] 6.2 Run package typecheck when TS changes.
- [x] 6.3 Run `git diff --check`.
- [x] 6.4 Do not run production build unless explicitly requested.
