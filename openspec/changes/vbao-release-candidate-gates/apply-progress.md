# Apply Progress: VBAO Release-Candidate Gates

## Mode

Strict TDD configured by `openspec/config.yaml`; Phase 1 was evidence capture/reporting, not production-code implementation. No production code was changed in this batch.

## Completed Tasks

- [x] 1.1 Captured `vbao` product half/full rows for `/museum` at `1920x1080` and `1280x720`.
- [x] 1.2 Added `EVIDENCE.md` rows for pattern/noise, stripe, edge-bleed, thin-gap, median, and p95.
- [x] 1.3 Recorded pass/fail: half-res is not promoted because quality regressions remain.

## Commands

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5178'; $env:PLAYWRIGHT_TEST_PORT='5178'; pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs
```

Result: 40 rows captured into `artifacts/benchmarks/ao-production-latest.json` and `artifacts/benchmarks/ao-production-quality-summary.md`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | N/A | Capture | N/A evidence task | N/A no code | ✅ capture command passed | ✅ both 1080p and 720p | N/A |
| 1.2 | `EVIDENCE.md` | Evidence artifact | N/A docs-only | N/A no code | ✅ rows added from JSON output | ✅ half/full + beauty/AO rows | N/A |
| 1.3 | `EVIDENCE.md` | Evidence decision | N/A docs-only | N/A no code | ✅ pass/fail recorded | ✅ cost win and quality failure both documented | N/A |

## Findings

- Port `5173` was occupied by an unrelated `auto-cv` Vite server, so the valid combined capture used port `5178`.
- Half-res is cheaper in VBAO pass GPU time but still fails promotion due to worse stripe metrics and `false-curvature,scale-mismatch` labels.
- Capture repeated known `vbaoPixel` duplicate-name and timestamp-query warnings; these feed Phase 4.

## Remaining Tasks

- Phase 2: Noise Reality Gate.
- Phase 3: Runtime Boundary Trim.
- Phase 4: Generated Shader Inspection.
- Phase 5: Review Archive Completeness.
- Phase 6: Verification.
## Phase 2 Update — Noise Reality Gate

## Completed Tasks

- [x] 2.1 Verified current atlas, IGN, static STBN, and FAST-like rows are current after product-preset fix.
- [x] 2.2 Added procedural/no-texture IGN blocker: current IGN is CPU-baked into the phase atlas texture, not procedural shader ALU.
- [x] 2.3 Recorded rejection reasons and kept default noise source unchanged.

## Commands

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5179'; $env:PLAYWRIGHT_TEST_PORT='5179'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-noise-source-comparison.mjs
```

Result: 32 rows captured into `artifacts/benchmarks/vbao-noise-source-comparison-latest.json` and `artifacts/benchmarks/vbao-noise-source-comparison-summary.md`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1 | N/A | Capture | N/A evidence task | N/A no code | ✅ capture command passed | ✅ 4 sources x 2 resolutions x 2 views x 2 outputs | N/A |
| 2.2 | `EVIDENCE.md` | Evidence/source audit | N/A docs-only | N/A no code | ✅ blocker recorded | ✅ `vbaoNoise.ts` + `vbaoSampling.ts` checked | N/A |
| 2.3 | `EVIDENCE.md` | Evidence decision | N/A docs-only | N/A no code | ✅ rejection reasons recorded | ✅ IGN/STBN/FAST-like all covered | N/A |

## Findings

- `phase-atlas-stable-hash` remains the default.
- `ign` does not materially reduce pattern/noise and is currently atlas-backed, not procedural/no-texture.
- `static-stbn` regresses thin-gap and edge-bleed labels.
- `fast-like` has some favorable proxy rows but no broad Pareto win; it still carries `noise` labels.
- Capture repeated known `vbaoPixel` duplicate-name and timestamp-query warnings; these remain Phase 4 debt.
## Phase 3 Update — Runtime Boundary Trim

## Completed Tasks

- [x] 3.1 Audited `vbaoGtVbaoMath.ts`; runtime did not import it, so it moved from `packages/horizon-ao/src/` to `packages/horizon-ao/reference/` with reference imports updated.
- [x] 3.2 Moved debug sector angle/cos/sin tables out of runtime constants into `packages/horizon-ao/reference/vbaoSectorTables.ts`.
- [x] 3.3 Replaced `__benchmarkNoiseSource` with an internal `benchmark: { noiseSource }` option shape that remains outside public `VBAONodeOptions` exports.
- [x] 3.4 Verified `packages/horizon-ao/src/index.ts` exports only `VBAONode`, `vbao`, `VBAONodeOptions`, and `VBAOQualityPreset`.

## Commands

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts packages/horizon-ao/reference/__tests__/vbaoGtVbaoMath.test.ts packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check -- packages/horizon-ao/src packages/horizon-ao/reference apps/demo/src/scenes/MuseumScene.tsx openspec/changes/vbao-release-candidate-gates
```

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 | `packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts` | Unit/source contract | ✅ baseline passed | ✅ source import expectation failed first | ✅ moved math and tests passed | ✅ canonical/scalar/drift refs covered | ✅ imports cleaned |
| 3.2 | `packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts` | Unit/source contract | ✅ baseline passed | ✅ constants expectation failed first | ✅ runtime constants cleaned | ✅ index + options source checked | ✅ tables renamed as reference-only |
| 3.3 | `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` | Unit/source contract | ✅ baseline passed | ✅ benchmark option expectation failed first | ✅ internal option shape replaced | ✅ core + demo typechecks passed | ✅ hidden double-underscore removed |
| 3.4 | `packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts` | Unit/source contract | ✅ baseline passed | Existing contract | ✅ index verified | ✅ no reference/debug exports | N/A |

## Findings

- `vbaoGtVbaoMath.ts` was reference-only; keeping it under runtime `src/` was architectural noise.
- Debug sector tables were not used by runtime and did not belong in `vbaoConstants.ts`.
- Public API remains product-only via `src/index.ts`.
## Phase 4 Update — Generated Shader Inspection

## Completed Tasks

- [x] 4.1 Added `apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs` to capture generated WebGPU shader programs for the Museum VBAO `quality` product row.
- [x] 4.2 Asserted fixed 4-slice / 8-sample generated loop bounds and absence of unexpected full-res JBU, wide polish, or surprise pass count.
- [x] 4.3 Investigated `vbaoPixel` duplicate-name warnings and documented the remaining diagnostics debt in `EVIDENCE.md`.

## Commands

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/demo typecheck
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5182'; $env:PLAYWRIGHT_TEST_PORT='5182'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` | Unit/source contract | ✅ existing contract suite ran | ✅ missing script/API import failed first | ✅ source contract passed after script/API implementation | ✅ script + Museum API both asserted | ✅ capture function isolated |
| 4.2 | `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` | Unit/source contract + capture | ✅ source contracts passed before capture run | ✅ assertion contract added before implementation | ✅ script capture passed on port `5182` | ✅ positive fixed-loop checks and negative surprise-pass checks | ✅ report writer extracts assertion summary |
| 4.3 | `EVIDENCE.md` | Evidence/diagnostics | N/A evidence task | N/A no code | ✅ warning count captured and documented | ✅ console warnings separated from pass/fail shader-shape checks | N/A |

## Findings

- Three r184 exposes generated shader code through WebGPU renderer pipeline program maps after a `RenderPipeline` renders.
- The product row produced 2 VBAO fragment programs, fixed `< 4` slice and `< 8` sample loops, and no hidden full-res JBU/wide-polish/surprise pass.
- `vbaoPixel` duplicate-name warnings still reproduce 3 times in this capture. This remains diagnostics debt, not a shader-shape failure.
## Phase 5 Update — Review Archive Completeness

## Completed Tasks

- [x] 5.1 Added `openspec/changes/vbao-release-candidate-gates/review-archive-manifest.md` with runtime entrypoint, internal pass files, reference modules, tests, demo evidence scripts, specs, ADRs, and verifier listed.
- [x] 5.2 Added `scripts/verify-vbao-review-archive.mjs` and verified the manifest has no missing files or missing relative imports.

## Commands

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts
node scripts/verify-vbao-review-archive.mjs
```

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 5.1 | `packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts` | Unit/source contract | ✅ existing evidence contract suite ran | ✅ missing manifest/verifier imports failed first | ✅ manifest contract passed | ✅ runtime, reference, tests, and demo evidence entries checked | ✅ manifest grouped by review category |
| 5.2 | `scripts/verify-vbao-review-archive.mjs` | CLI/source closure | N/A new script | ✅ contract expected verifier before implementation | ✅ verifier passed with 0 missing files/imports | ✅ caught and fixed missing `apps/demo/src/parityScenes.ts` import | ✅ import parser anchored to actual import/export lines |

## Findings

- The review archive must include `apps/demo/src/parityScenes.ts` because `apps/demo/e2e/ao-compare.spec.ts` imports it.
- Generated benchmark artifacts remain opt-in because `.gitignore` ignores benchmark JSON/markdown/screenshots; curated evidence needs `git add -f` for a handoff archive.
## Phase 6 Update — Verification

## Completed Tasks

- [x] 6.1 Ran targeted Vitest for touched source/report contracts.
- [x] 6.2 Ran package typechecks for `@horizonao/core` and `@horizonao/demo` because TS files changed.
- [x] 6.3 Ran `git diff --check`.
- [x] 6.4 Did not run a production build.

## Commands

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/reference/__tests__/vbaoGtVbaoMath.test.ts packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
node --check scripts/verify-vbao-review-archive.mjs
node --check apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs
node scripts/verify-vbao-review-archive.mjs
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check
```

## Verification Results

- Targeted Vitest: 11 files / 88 tests passed.
- Review archive verifier: passed with 0 missing files and 0 missing relative imports.
- Core typecheck: passed, including `tsconfig.reference.json`.
- Demo typecheck: passed.
- `git diff --check`: passed; only LF-to-CRLF warnings were emitted.
- Production build: not run, per project rule.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 6.1 | Targeted Vitest contract files | Verification | N/A verify task | N/A no code | ✅ 11 files / 88 tests passed | ✅ source, evidence, profiling, sampling, reference contracts covered | N/A |
| 6.2 | TypeScript project checks | Verification | N/A verify task | N/A no code | ✅ core + demo typechecks passed | ✅ runtime and reference TS projects covered | N/A |
| 6.3 | `git diff --check` | Whitespace verification | N/A verify task | N/A no code | ✅ passed | ✅ full worktree diff checked | N/A |
| 6.4 | N/A | Process guard | N/A | N/A no code | ✅ production build not run | ✅ project rule preserved | N/A |
