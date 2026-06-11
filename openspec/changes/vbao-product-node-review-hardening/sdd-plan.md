# SDD Plan: VBAO Product Node Review Hardening

## Current State

The product node is close to the intended shape: compact public API, bitmask raw
kernel, internal reconstruction, and evidence-driven benchmarks. The pasted
review correctly identifies the remaining discipline problems, but the repo has
already resolved or rejected some of those items.

The original non-negotiable contradiction was:

```text
source presets: all quality tiers default to half-resolution
evidence: half-resolution remains unpromoted
```

Current source resolves that default-policy contradiction by keeping
`performance` half-resolution, moving `balanced` above half-resolution, and
making `quality` / `ultra` full-resolution. The remaining release-readiness
blocker is evidence: explicit half-resolution rows must still not be described
as promoted while committed evidence marks them unpromoted.

## Phase 1: Contrast Ledger

Goal: prevent stale or rejected review claims from becoming duplicated work.

- Record each major pasted claim as keep, open, rejected, or delegated.
- Link open claims to current source/evidence.
- Add a competitor benchmark contrast so GTAO/SSAO/N8AO claims are treated as
  evidence pressure, not unverified product truth.
- Do not edit runtime code in this phase.

Acceptance:

- `current-state-contrast.md` exists.
- `benchmark-contrast.md` exists.
- Half-resolution default-policy contradiction is explicitly marked resolved or
  reopened against current source.
- Temporal and fused resolve/polish promotion are explicitly rejected here.

## Phase 2: Preset Policy Gate

Goal: make product defaults match evidence.

- Compare current product presets against latest half/full evidence.
- Keep the evidence-compatible policy unless fresh evidence changes it:
  - `performance` may remain half-resolution;
  - `balanced` uses higher-than-half raw resolution;
  - `quality` and `ultra` use full-resolution raw AO;
  - explicit half-resolution remains available only through advanced/evidence
    routes.
- Update source tests to pin the chosen policy.

Acceptance:

- `EVIDENCE.md` has pass/fail rows for the chosen default policy.
- `packages/horizon-ao/src/vbaoConstants.ts` matches the evidence verdict.
- No release-candidate wording claims explicit half-res rows are promoted while
  evidence says they are not.
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
- Defer refactor if the audit cannot prove evidence capture stability in the
  same patch.

Acceptance:

- Source contracts prove pass labels and public exports are unchanged.
- Targeted source tests pass.
- Any screenshot/timing evidence touched by the refactor is refreshed.
- `pass-ownership-audit.md` records whether this SDD refactors or defers.

## Phase 5: Comment and Constant Hygiene

Goal: remove product overclaiming and reference-only runtime exports.

- Replace `GT-VBAO++` comments with descriptive slice-orientation wording.
- Audit `VBAO_THETA_*` constants and move or delete them only if runtime-unused.
- Remove exact performance claims that lack measured cross-target evidence.
- Record temporal prototype constants separately so magic-number cleanup does
  not accidentally reopen temporal promotion.

Acceptance:

- Runtime comments describe behavior, not marketing names.
- Constants left in runtime are used by runtime or public option normalization.
- Source tests cover any intentional compatibility/export decision.
- `temporal-constant-contrast.md` exists and keeps temporal constants out of
  the spatial product-default patch.

## Phase 6: Evidence Reconciliation Gate

Goal: reconcile the pasted numeric review with the latest committed evidence.

- Treat pasted GTAO/SSAO/N8AO numbers as review input until reproduced or
  superseded by committed artifacts.
- Prefer latest committed `EVIDENCE.md` rows when review claims conflict with
  repo state.
- Keep noise-source promotion blocked unless a fresh gate beats the current
  `phase-atlas-stable-hash` control with reference-safe evidence.
- Plan 6.3 and 6.4 as separate gates:
  - 6.3 captures the current competitor benchmark matrix;
  - 6.4 attaches required reference fixture observations before any promotion.

Acceptance:

- Competitor claims name whether they are pasted-review, committed evidence, or
  unresolved.
- FAST-like/STBN promotion is blocked unless a newer gate reverses the
  2026-06-04 evidence decision.
- Release/preset claims remain blocked while product rows carry unresolved
  reference-observation gaps.
- `evidence-reconciliation-plan.md` defines capture commands, required rows,
  required fixture IDs, and non-acceptance criteria for 6.3 and 6.4.

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
