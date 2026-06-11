# Apply Progress: VBAO Product Node Review Hardening

## 2026-06-04

Status: planning/audit work started; no runtime behavior changes made by this
SDD pass.

## Completed

- Created the SDD shell:
  - `proposal.md`
  - `sdd-plan.md`
  - `tasks.md`
  - `current-state-contrast.md`
- Added `metaprompt.md` so future work starts from the goal, constraints, and
  verified source/evidence facts.
- Added `specs/vbao-node/spec.md` with executable OpenSpec scenarios for:
  - preset/evidence consistency;
  - evidence-only pass privacy;
  - renderer-state ownership audit before refactor.
- Added `preset-policy-audit.md`.
  - Current classification: all-half-resolution defaults fail the
    release-candidate policy gate because committed evidence still says
    half-resolution product output is not promoted.
- Added `runtime-boundary-audit.md`.
  - `VBAOResolvePolishNode.ts` is private from package exports but imported by
    `MuseumScene.tsx` for evidence-only fused resolve/polish capture.
  - Module-level renderer-state owner files are named for follow-up audit.

## 2026-06-07

Status: planning updated around the pasted numeric benchmark review; no runtime
behavior changes made.

## Added

- Added `benchmark-contrast.md`.
  - Pasted GTAO/SSAO/N8AO and half-resolution claims are kept as review
    pressure.
  - Latest committed `EVIDENCE.md` remains authoritative when it conflicts with
    the paste.
  - FAST-like/STBN promotion remains blocked by the 2026-06-04 evidence gate.
- Added `temporal-constant-contrast.md`.
  - `historyWeight = 0.8`, `depthThreshold = 0.0005`, `normalThreshold = 0.85`,
    and `maxVelocityUv = 0.25` are source-backed prototype constants in
    `VBAOVelocityTemporalNode.ts`.
  - Temporal promotion remains rejected/private and requires a separate SDD.
- Updated `proposal.md`, `sdd-plan.md`, `tasks.md`,
  `current-state-contrast.md`, and `specs/vbao-node/spec.md` with evidence
  reconciliation and temporal-constant containment gates.

## 2026-06-07 Phase 2 Continuation

Status: preset policy reconciled against current source; no runtime behavior
changes made in this continuation.

Current source already resolves the old all-half-resolution contradiction:

- `performance`: `resolutionScale: 0.5`;
- `balanced`: `resolutionScale: 0.75`;
- `quality`: `resolutionScale: 1.0`;
- `ultra`: `resolutionScale: 1.0`.

The policy is pinned by `vbaoNodeSource.test.ts` and `vbaoSampling.test.ts`.
This continuation updated the SDD text so it no longer treats all-half-res as
current source truth. Explicit half-resolution rows remain unpromoted until
fresh committed evidence says otherwise.

## 2026-06-07 Phase 3 Continuation

Status: runtime boundary audit reconciled against current source; no runtime
behavior changes made.

- `VBAOResolvePolishNode.ts` is absent from active runtime source.
- `packages/horizon-ao/src/index.ts` exports only `VBAONode`, `vbao`, and public
  option types.
- Benchmark noise injection and temporal labels remain private/demo-internal:
  `VBAONodeOptions` does not expose `benchmark`, `noiseTexture`,
  `temporalMode`, `historyWeight`, velocity, or denoise controls.
- `velocity-internal` remains an evidence label in demo/benchmark scripts, not a
  public product mode.

Phase 3 tasks 3.2 and 3.3 are complete as source-audit outcomes.

## 2026-06-07 Phase 5 Continuation

Status: comment/performance-claim and constant hygiene applied.

- Replaced `GT-VBAO++` branding in the runtime axial-slice comment with
  descriptive slice-orientation wording.
- Softened the exact `countOneBits()` cycle/ALU claim in `vbaoConstants.ts`.
- `VBAO_THETA_*` constants are used by `packages/horizon-ao/reference` math and
  sector-table tests.
- They remain in `vbaoConstants.ts` as a shared source/reference contract for
  this SDD.

Phase 5 is complete.

## 2026-06-07 Phase 4 Continuation

Status: pass ownership audited; refactor deferred.

- Added `pass-ownership-audit.md`.
- `VBAOResolveNode` and `VBAOHalfResCleanupNode` still duplicate fullscreen
  pass ownership that `VBAOEffectPass` centralizes.
- Refactor is deliberately deferred because these are active reconstruction
  stages and any inheritance change must preserve pass labels, texture names,
  sizing semantics, generated shader inspection expectations, and screenshot /
  timing evidence capture.

Phase 4 is complete as an audit/no-refactor decision.

## Verification Update After Continuations

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
git diff --check -- packages/horizon-ao/src openspec/changes/vbao-product-node-review-hardening
```

Results:

- Vitest: 15 files passed, 132 tests passed.
- Core typecheck: passed.
- Diff hygiene: passed with CRLF warnings only.

No production build was run.

## 2026-06-07 Phase 6 Planning

Status: plans added for the two remaining evidence gates; capture/reference
execution still open.

- Added `evidence-reconciliation-plan.md`.
- 6.3 is planned as a current-harness competitor benchmark matrix for
  `gtao`, `ssao`, `vbao`, and `n8ao` on `/museum` at `1920x1080` and
  `1280x720`, with beauty/AO views, metrics, timings, screenshots, and explicit
  artifact paths.
- 6.4 is planned as a reference-observation gate requiring all production
  reference fixture IDs before product-quality promotion.
- The plan keeps screenshot proxies separate from ray-cast/reference truth.

No benchmark capture or production-reference execution was run in this planning
update.

Verification:

```sh
git diff --check -- openspec/changes/vbao-product-node-review-hardening
```

Passed with CRLF warnings only.

## Verification Update

```sh
git diff --check -- openspec/changes/vbao-product-node-review-hardening
Test-Path openspec/changes/vbao-product-node-review-hardening/specs/vbao-node/spec.md
Test-Path openspec/changes/vbao-product-node-review-hardening/benchmark-contrast.md
Test-Path openspec/changes/vbao-product-node-review-hardening/temporal-constant-contrast.md
```

`git diff --check` passed. The `Test-Path` checks returned `True` for all
three required SDD files. Targeted Vitest and typecheck were not run because
this pass changed only OpenSpec Markdown files. No production build was run.

## Verification

```sh
git diff --check -- openspec/changes/vbao-product-node-review-hardening
Test-Path openspec/changes/vbao-product-node-review-hardening/specs/vbao-node/spec.md
```

Both checks passed.

Targeted Vitest and typecheck were not run because this pass changed only
OpenSpec planning/audit Markdown files. No production build was run.

## Scope Note

The broader worktree contains unrelated runtime/demo/benchmark changes outside
this SDD folder. This pass only added OpenSpec planning and audit artifacts under
`openspec/changes/vbao-product-node-review-hardening/`.
