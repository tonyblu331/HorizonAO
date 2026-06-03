# Apply Progress: VBAO Kernel Canonical Drift Triage

## Phase 1: Claim Triage

Status: complete.

No runtime source was changed in this phase. The goal was to convert the pasted
review into source-backed claims before any kernel edit.

| Task | Status | Evidence |
| --- | --- | --- |
| 1.1 Record source/spec evidence for each pasted review claim. | Done | `design.md`, `peer-review.md`, and `research-contrast.md` now classify the claims against source/spec/research evidence. |
| 1.2 Mark claims as accepted, already done, rejected, or deferred. | Done | `design.md` contains the claim ledger; `peer-review.md` records rejected suggestions and next required gate. |
| 1.3 Update `EVIDENCE.md` with the triage verdict before runtime edits. | Done | `EVIDENCE.md` has the 2026-06-03 kernel canonical drift triage entry. |

## Source Truth Recorded

| Claim | Source truth | Verdict |
| --- | --- | --- |
| Bilateral formula is duplicated. | `packages/horizon-ao/src/vbaoBilateralWeight.ts` exists and pass source tests require cleanup, resolve, resolve-polish, and polish to use `computeVbaoBilateralGeometryWeight`. | Already done. |
| Production used uniform slice averaging. | The fixture-first gate found a warning-level multi-slice/non-axis gap. `packages/horizon-ao/src/VBAONode.ts` now uses `sliceAccessibility * NprojLen` and `weightSum += NprojLen`; `openspec/specs/vbao-node/spec.md` requires projected-normal weighted slice accumulation. | Accepted and implemented as a gated runtime candidate. |
| Current drift fixtures did not stress grazing normals enough. | Source tests now require `sliceAccessibility.mul(NprojLen)` after the multi-slice/non-axis fixture exposed the old uniform-reduction gap. | Accepted and resolved by Phase 2/3. |
| x² radial spacing may compress radius. | `packages/horizon-ao/src/vbaoSampling.ts` returns `t * t`; the spec requires x² near-biased spacing. | Accepted for reference/product contrast. |
| `sampleDist * 0.85` thickness cap is empirical. | `packages/horizon-ao/src/VBAONode.ts` and source tests pin the cap; current spec does not explain the constant. | Accepted for documentation or measured replacement. |
| Per-sample phase atlas math may be hoistable. | `sampleNoisePhase(i, j)` is called in the sample loop and source tests currently pin that shape. | Deferred until correctness gates are stable. |
| Internal temporal should promote. | Existing temporal evidence remains `reject-promotion`. | Rejected for this SDD. |
| Resolve/polish should be fused. | Pass topology evidence shows fused resolve-polish preserved labels but was slower at tested high softness. | Deferred/rejected for this SDD. |

## Verification

```sh
git diff --check -- openspec/changes/vbao-kernel-canonical-drift-triage EVIDENCE.md
```

## Phase 2: Non-Axis-Aligned Drift Fixtures

Status: complete.

Added `grazing-normal` to the canonical/product drift case set. The first run
failed the production reference gate because the expected case list was frozen;
that RED confirmed the gate protects the drift case set. The gate was then
updated to include the new fixture.

The fixture currently produces finite canonical/product observations and
`absDiff === 0`. That is useful, not disappointing: it proves a non-axis-aligned
single-slice fixture does not itself justify a production slice-reduction
formula change. Phase 2.3 remains open because the slice-averaging question
needs a multi-slice fixture that can distinguish uniform averaging from
projected-normal slice weighting.

| Task | Status | Evidence |
| --- | --- | --- |
| 2.1 Add RED reference coverage for at least one grazing-normal fixture. | Done | `VBAO_CANONICAL_DRIFT_CASES` now includes `grazing-normal`; `vbaoCanonicalDriftReport.test.ts` requires it. |
| 2.2 Add product observation rows for the same fixture family. | Done | The drift report row includes both canonical and product accessibility for `grazing-normal`. |
| 2.3 Decide whether uniform slice averaging fails the fixture. | Done | `vbaoReference.test.ts` now includes a multi-slice/non-axis fixture where uniform accessibility exceeds projected-weighted accessibility by more than `0.03`. |

Verification:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
```

Result: 12 test files passed, 105 tests passed.

## Phase 2.3: Multi-Slice Decision

Status: complete.

Added a scalar reference fixture that compares the current uniform slice
reduction against a projected-normal weighted reduction on a multi-slice,
non-axis-aligned normal setup. The fixture shows a material warning-level gap:
uniform averaging is more accessible than the projected-weighted reference by
more than `0.03`.

Decision: current uniform slice averaging fails the multi-slice projected-normal
reference gate at warning level. This is not permission to edit `VBAONode.ts`
directly. Phase 3 must update the spec/ADR first and then decide whether the
runtime adopts projected-normal slice weighting or records a deliberate
deviation.

Verification:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoReference.test.ts
```

Result: 12 test files passed, 106 tests passed.

## Phase 3.1: Slice Reduction Spec Decision

Status: complete.

Added `slice-reduction-decision.md` and updated the change-local
`specs/vbao-node/spec.md` with the gated projected-normal weighting candidate.
Runtime source was not changed until this spec decision existed.

The candidate runtime formula is:

```text
weightedAccessibility += sliceAccessibility * NprojLen
weightSum += NprojLen
```

Follow-up moved to Phase 3.2: update root spec/source contracts and capture
visual/timing evidence in the same change that edits `VBAONode.ts`.

## Phase 3.2: Runtime Slice Reduction Candidate

Status: implemented with raw-kernel evidence.

Updated `VBAONode.ts` to weight slice accessibility by the already-computed
projected normal length:

```text
weightedAccessibility += sliceAccessibility * NprojLen
weightSum += NprojLen
```

Updated the root `openspec/specs/vbao-node/spec.md` and source contracts in the
same patch.

Generated shader inspection passed after the kernel edit:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5204'; $env:PLAYWRIGHT_TEST_PORT='5204'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

Raw-kernel screenshots and pass timings were captured for `vbao` beauty/AO,
half/full, at 1920x1080 and 1280x720:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5205'; $env:PLAYWRIGHT_TEST_PORT='5205'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half,full'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/ao-vbao-projected-normal-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/ao-vbao-projected-normal-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-projected-normal'; pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs
```

This remains a raw-kernel formula candidate, not a half-resolution product
promotion claim. The generated report correctly marks half-resolution
product-stage evidence incomplete because this batch did not capture
reconstruction-stage rows.

## Phase 6: Verification

Status: complete for touched files.

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoReference.test.ts
pnpm --filter @horizonao/core typecheck
git diff --check -- EVIDENCE.md openspec/changes/vbao-kernel-canonical-drift-triage openspec/changes/vbao-review-reconciliation-roadmap openspec/specs/vbao-node/spec.md packages/horizon-ao/src/VBAONode.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/reference/vbaoReference.ts packages/horizon-ao/reference/__tests__/vbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts
```

Result:

- Targeted Vitest commands: pass, 12 files and 107 tests.
- Package typecheck: pass.
- Generated shader inspection: pass.
- Raw-kernel benchmark capture: pass, 8 complete rows.
- Production build: not run, per project rule.
