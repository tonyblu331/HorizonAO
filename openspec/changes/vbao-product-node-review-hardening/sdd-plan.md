# SDD Plan: VBAO Product Node Review Hardening

## Current State

The product node is close to the intended shape: compact public API, bitmask raw
kernel, internal reconstruction, and evidence-driven benchmarks. The pasted
review correctly identifies the remaining discipline problems, but the repo has
already resolved or rejected some of those items.

The non-negotiable contradiction is:

```text
source presets: all quality tiers default to half-resolution
evidence: half-resolution remains unpromoted
```

That must be resolved before calling the node release-candidate ready.

## Phase 1: Contrast Ledger

Goal: prevent stale or rejected review claims from becoming duplicated work.

- Record each major pasted claim as keep, open, rejected, or delegated.
- Link open claims to current source/evidence.
- Do not edit runtime code in this phase.

Acceptance:

- `current-state-contrast.md` exists.
- Half-resolution contradiction is explicitly marked open.
- Temporal and fused resolve/polish promotion are explicitly rejected here.

## Phase 2: Preset Policy Gate

Goal: make product defaults match evidence.

- Compare current product presets against latest half/full evidence.
- Choose one policy:
  - keep all presets half-res only if evidence now passes;
  - otherwise move at least quality/ultra back to full-res or add a separate
    explicit half-res override path.
- Update source tests to pin the chosen policy.

Acceptance:

- `EVIDENCE.md` has pass/fail rows for the chosen default policy.
- `packages/horizon-ao/src/vbaoConstants.ts` matches the evidence verdict.
- No release-candidate wording claims half-res is promoted while evidence says
  it is not.
- `preset-policy-audit.md` records the source/evidence classification before
  implementation changes.

## Phase 3: Runtime Boundary Audit

Goal: keep product runtime free of evidence-only ambiguity.

- Audit `VBAOResolvePolishNode.ts` imports and benchmark usage.
- Decide whether it remains private runtime source, moves under a clearer
  evidence/debug boundary, or is archived.
- Audit internal benchmark and temporal options for public leakage.
- Audit renderer-state ownership in `VBAONode.ts`, `VBAOResolveNode.ts`, and
  `VBAOHalfResCleanupNode.ts`.

Acceptance:

- `packages/horizon-ao/src/index.ts` still exports only product API.
- Evidence-only nodes/options have one explicit end state: moved/quarantined,
  deleted/archived, or retained as private source with import restrictions.
- No public temporal, benchmark, resolve, polish, or denoise API is added.
- `runtime-boundary-audit.md` records current imports and state ownership.

## Phase 4: Pass Ownership Cleanup

Goal: reduce duplicated fullscreen-pass ownership without changing output.

- Audit `VBAOResolveNode` and `VBAOHalfResCleanupNode` against
  `VBAOEffectPass`.
- Refactor only if output, pass labels, and benchmark capture remain stable.

Acceptance:

- Source contracts prove pass labels and public exports are unchanged.
- Targeted source tests pass.
- Any screenshot/timing evidence touched by the refactor is refreshed.

## Phase 5: Comment and Constant Hygiene

Goal: remove product overclaiming and reference-only runtime exports.

- Replace `GT-VBAO++` comments with descriptive slice-orientation wording.
- Audit `VBAO_THETA_*` constants and move or delete them only if runtime-unused.
- Remove exact performance claims that lack measured cross-target evidence.

Acceptance:

- Runtime comments describe behavior, not marketing names.
- Constants left in runtime are used by runtime or public option normalization.
- Source tests cover any intentional compatibility/export decision.

## Guardrails

- No production build unless explicitly requested.
- No formula changes without fixture failure and spec update.
- No temporal promotion from this SDD.
- No resolve/polish fusion promotion without new evidence beating the rejected
  candidate.
- No broad runtime and demo refactor in the same patch.

## Verification

Planning-only verification:

```sh
git diff --check -- openspec/changes/vbao-product-node-review-hardening
```

OpenSpec-shape verification:

```sh
Test-Path openspec/changes/vbao-product-node-review-hardening/specs/vbao-node/spec.md
```

Implementation phases add targeted checks based on touched files:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts
pnpm --filter @horizonao/core typecheck
```
