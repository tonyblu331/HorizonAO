# Apply Progress: VBAO Review Reconciliation Roadmap

## Phase 1: Review Reconciliation Ledger

Status: complete.

This phase reconciled the pasted review against current source and avoided
re-planning stale work. No runtime behavior changed.

| Task | Status | Evidence |
| --- | --- | --- |
| 1.1 Record pasted review claims against current source/spec evidence. | Done | `current-state-contrast.md` records current source state for each major claim. |
| 1.2 Mark each claim as already done, still open, rejected, or delegated. | Done | `current-state-contrast.md` and `research-verification.md` classify all major claims. |
| 1.3 Confirm this SDD makes no runtime behavior changes. | Done | Only OpenSpec roadmap files were created/updated for this SDD. |

## Phase 1b: Research Verification

Status: complete.

External sources confirm the review pressure but not every proposed action.
SSILVB and Bevy support the visibility-bitmask direction and finite-thickness
model. GTAO supports the projected-normal weighting concern, but this repo's
CDF-remapped bitmask contract requires a failing fixture before shader edits.

| Task | Status | Evidence |
| --- | --- | --- |
| 1b.1 Verify VBAO/thickness/sample-spacing claims against SSILVB sources. | Done | `research-verification.md` cites SSILVB/ar5iv/CDRIN/Bevy sources. |
| 1b.2 Verify slice-weighting pressure against GTAO research. | Done | `research-verification.md` cites the GTAO technical report. |
| 1b.3 Record principal-level decisions in `research-verification.md`. | Done | Principal decisions table added. |

## Phase 2: Kernel Formula Routing

Status: complete.

The formula work is routed to
`openspec/changes/vbao-kernel-canonical-drift-triage/`. The routing did its
job: a multi-slice/non-axis fixture was added before any runtime edit, the root
spec was updated, and the runtime candidate now uses projected-normal weighted
slice accumulation.

| Task | Status | Evidence |
| --- | --- | --- |
| 2.1 Link cosine/slice weighting claims to `vbao-kernel-canonical-drift-triage`. | Done | `sdd-plan.md`, `research-verification.md`, and this progress note route the claim. |
| 2.2 Require multi-slice/non-axis fixture evidence before any production formula change. | Done | `research-verification.md` and `sdd-plan.md` state research citation is not enough to change shader code. |
| 2.3 Update this roadmap after the kernel triage SDD decides the formula. | Done | Kernel triage records a warning-level multi-slice projected-normal weighting gap and a gated runtime candidate. |

Follow-up: kernel triage Phase 3 now updates `VBAONode.ts`, root spec/source
contracts, generated shader inspection, and raw-kernel screenshots/timings
together.

## Phase 3: Bilateral Constant Rationale

Status: complete for current-policy documentation.

`bilateral-constant-policy.md` documents the current strict edge-preserving
interpretation of `24` and `normal^8`. Source contracts now pin both the shared
helper and the `24` plane-distance multiplier. Softer candidates are not
evaluated in this SDD because that requires before/after screenshots and GPU
timings for a separate tuning candidate.

## Phase 4: Phase Atlas Hoist Spike

Status: preflight complete, implementation deliberately deferred.

`phase-atlas-hoist-preflight.md` records the current state and blocks the hoist
prototype until the projected-normal runtime candidate has product-stage
evidence. This avoids mixing a correctness formula change with an ALU
optimization in the same evidence claim.

## Phase 5: API Alias Migration

Status: complete for policy.

`api-alias-migration-policy.md` keeps `preset`, `scale`, and `intensity` through
the current pre-1.0 evidence-gated candidate phase. Source contracts now keep
the deprecation comments explicit.

## Phase 6: Demo Evidence Boundary

Status: audit complete.

`demo-evidence-boundary-audit.md` records that `aoPipelines.ts` already exists
and that remaining Museum-specific wiring is evidence-specific. Broad extraction
is deferred because there was no behavior-neutral duplication left to extract
without changing benchmark semantics.

## Verification

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoReference.test.ts
pnpm --filter @horizonao/core typecheck
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5204'; $env:PLAYWRIGHT_TEST_PORT='5204'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5205'; $env:PLAYWRIGHT_TEST_PORT='5205'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half,full'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/ao-vbao-projected-normal-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/ao-vbao-projected-normal-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-projected-normal'; pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs
git diff --check -- EVIDENCE.md openspec/changes/vbao-review-reconciliation-roadmap openspec/changes/vbao-kernel-canonical-drift-triage openspec/specs/vbao-node/spec.md packages/horizon-ao/src/VBAONode.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/reference/vbaoReference.ts packages/horizon-ao/reference/__tests__/vbaoReference.test.ts packages/horizon-ao/reference/__tests__/vbaoEvidenceContract.test.ts
```

Result:

- Targeted Vitest source/reference commands: pass, 12 test files and 107 tests.
- Package typecheck: pass.
- Generated shader inspection: pass for product-preset and spatial-ultra.
- Raw-kernel WebGPU screenshot/timing capture: pass, 8 rows.
- Production build: not run, per project rule.
