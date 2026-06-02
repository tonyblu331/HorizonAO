# Apply Progress: VBAO Pass Topology Audit

## 2026-06-02

### Completed

- Created `sdd-plan.md` for the pass topology audit.
- Added contrast against three pasted proposals.
- Corrected the SDD wording from "Two pasted reviews" to "Three pasted
  reviews".
- Created `tasks.md` with phase-based RED/GREEN/VERIFY work.
- Created `metaprompt.md` so future runs can resume the audit without relying on
  chat context.
- Created `render-target-inventory.md` as the static Phase 1 target baseline.
- Fixed evidence artifact status classification for intermediate VBAO
  reconstruction stages: downstream missing pass timings no longer make `raw` or
  `cleanup` stage screenshots incomplete, while `unexpected` downstream timings
  still fail.
- Added `VBAOEffectPass.ts` as a shared internal pass base.
- Migrated `VBAOFullResPolishNode` onto `VBAOEffectPass` only; cleanup and
  resolve remain unchanged.
- Completed Phase 2b file cohesion audit and rejected a generic `vbaoCore.ts`
  merge because the current modules have clearer ownership.
- Added an evidence-only `vbaoCleanup=skip` / `AO_BENCHMARK_VBAO_CLEANUP_MODE=skip`
  path for the cleanup removal experiment.
- Captured cleanup-on and cleanup-skip benchmark rows.
- Rejected unconditional half-resolution cleanup removal because skip regressed
  noise, stripe, and edge-bleed proxies in every comparable row.
- Added Phase 4 preflight. Resolve/polish fusion is not implemented in this
  slice because current low-resolution product rows skip polish at
  `softness: 0.45`; a high-softness row is required before a fused candidate can
  be exercised.
- Added `AO_BENCHMARK_VBAO_SOFTNESS` / `vbaoSoftness` evidence-only benchmark
  support and captured a high-softness low-resolution row where polish is active.

### Verified

- Confirmed `VBAOTemporalAccumulationNode` is absent and guarded by source tests.
- Confirmed shared bilateral geometry weighting already exists in
  `vbaoBilateralWeight.ts`.
- Confirmed pass timing contracts exist for raw, cleanup, resolve, polish,
  skipped rows, missing/unexpected rows, and derived total product timing.
- Captured a Phase 1 museum baseline for VBAO AO output at 1920x1080 and
  1280x720 with half/full-resolution product rows and reconstruction stages.
- Confirmed the baseline includes failure labels such as `noise`,
  `false-curvature`, and `scale-mismatch`.
- Confirmed complete final/reconstruction-gate rows exist, while raw/cleanup
  stage rows are intentionally incomplete for downstream pass timing. Treat that
  as a caveat before topology work, not as passing evidence.
- Re-captured the Phase 1 baseline after fixing evidence status; artifact rows
  now show intermediate reconstruction stages as complete when their own required
  timings are present.
- Captured a post-refactor comparison for the `VBAOEffectPass` migration.
  Matched screenshot metrics were identical for compared final/full-res rows.
  Timing with one sample is treated as smoke evidence only, not a performance
  claim.

### Commands

```sh
git diff --check -- openspec/changes/vbao-pass-topology-audit/sdd-plan.md openspec/changes/vbao-pass-topology-audit/tasks.md
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half,full'; $env:AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES='1'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='1'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-pass-topology-baseline.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-pass-topology-baseline.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-pass-topology-baseline'; $env:AO_BENCHMARK_PORT='5207'; pnpm --filter @horizonao/demo benchmark:ao
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts
pnpm --filter @horizonao/demo typecheck
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half,full'; $env:AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES='1'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='1'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-pass-topology-polish-base.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-pass-topology-polish-base.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-pass-topology-polish-base'; $env:AO_BENCHMARK_PORT='5208'; pnpm --filter @horizonao/demo benchmark:ao
git diff --check
```

Results:

- `git diff --check`: passed, with existing CRLF warnings on unrelated tracked
  files.
- Targeted core source tests: 12 files passed, 99 tests passed.
- Phase 1 benchmark: wrote 14 rows to
  `artifacts/benchmarks/vbao-pass-topology-baseline.json`.
- Core typecheck: passed.
- Profiling failure-label tests: 12 files passed, 100 tests passed.
- Combined source/profiling tests: 12 files passed, 101 tests passed.
- Demo typecheck: passed.
- Phase 2 comparison benchmark: wrote 14 rows to
  `artifacts/benchmarks/vbao-pass-topology-polish-base.json`.
- File cohesion audit: no file moves needed.
- Cleanup-on benchmark: wrote 6 rows to `artifacts/benchmarks/vbao-cleanup-on.json`.
- Cleanup-skip benchmark: wrote 6 rows to
  `artifacts/benchmarks/vbao-cleanup-skip.json`.
- Cleanup skip saved roughly 0.05-0.10 ms in this matrix, but regressed noise,
  stripe, and edge proxies across 1920x1080 and 1280x720 AO/beauty rows.
- Resolve/polish preflight benchmark: wrote 12 rows to
  `artifacts/benchmarks/vbao-resolve-polish-preflight.json`.
- Preflight measured both resolve and polish in low-resolution rows at
  `softness: 0.75`.
- Added source/evidence contracts for a private fused resolve-polish candidate:
  no temporal, no history, no reprojection, and no public export/API option.
- Added `AO_BENCHMARK_VBAO_RESOLVE_POLISH_MODE=fused` /
  `vbaoResolvePolish=fused` evidence-only benchmark support.
- Captured fused resolve-polish evidence at `softness: 0.75`.
- Rejected resolve/polish fusion because it was slower than the separate
  resolve and polish passes despite preserving the same failure labels.
- Filed separate future-work proposal notes for velocity-backed AO-owned
  temporal, multi-bounce, bent normals, directional occlusion, and public API
  changes.

Additional commands:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half'; $env:AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES='final'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_VBAO_SOFTNESS='0.75'; $env:AO_BENCHMARK_VBAO_RESOLVE_POLISH_MODE='fused'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-resolve-polish-fused.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-resolve-polish-fused.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-resolve-polish-fused'; $env:AO_BENCHMARK_PORT='5212'; pnpm --filter @horizonao/demo benchmark:ao
```

Additional results:

- Combined source/profiling tests: 12 files passed, 104 tests passed.
- Core typecheck: passed.
- Demo typecheck: passed.
- Fused resolve-polish benchmark: wrote 4 rows to
  `artifacts/benchmarks/vbao-resolve-polish-fused.json`.
- Fusion comparison:
  - 1920x1080 AO: separate resolve+polish 0.288 ms, fused 3.468 ms,
    total delta +3.191 ms.
  - 1280x720 AO: separate resolve+polish 0.125 ms, fused 0.381 ms,
    total delta +0.248 ms.

### Next

- No pass-topology consolidation from this SDD is ready to promote beyond the
  `VBAOEffectPass` base extraction. Future feature work should start from the
  separate proposal notes, not from this topology audit.
