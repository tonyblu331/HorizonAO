# ADR-009: No Signed-Horizon Legacy in Active Source

- **Status:** Accepted
- **Date:** 2026-05-22
- **Related:** ADR-007 (pivot rationale), ADR-008 (AO-only scope).

## Context

The pre-pivot repository shipped `HorizonAoNode`, a signed-horizon GTAO-class kernel, plus a bilateral `HorizonAoDenoiseNode`, plus a `parityHarness` test infrastructure exposed via the public API. After ADR-007, the kernel pivots to VBAO.

Two paths exist for transitioning:

- **(L1) Dual kernel.** Keep `HorizonAoNode` alongside `VBAONode` (perhaps `@deprecated`) until a future major release.
- **(L2) No legacy.** Remove `HorizonAoNode` from active source entirely; archive for history only.

This is pre-1.0. No downstream consumers depend on `@horizonao/core` in production. There is no migration risk.

## Decision

Pick **L2 — no signed-horizon legacy in active source.**

Concrete actions in PR-00:

1. Move `packages/horizon-ao/src/horizonAoNode.ts`, `horizonAoMath.ts`, their test files, and `parityHarness.ts` to `packages/horizon-ao/archive/`. Single commit.
2. Move `openspec/horizonao-final-spec.md`, `horizonao-math-revision-2025.md`, `horizonao-current-shape-roadmap.md` to `openspec/archive/`. Single commit.
3. `packages/horizon-ao/src/index.ts` exports ONLY: `VBAONode`, `vbao`, `VBAO_QUALITY_TIERS`, `VBAONodeOptions` (type), `VBAOQualityPreset` (type). `parityHarness` is no longer public.
4. No deprecation period. No re-export shim. No backwards-compatibility alias.

The archive directory exists for git-blameability and to make resurrection a `git mv` away if VBAO collapses. It is not a supported import path. The package's published surface is whatever `index.ts` exports.

## Consequences

**Positive:**

- Exactly one active AO algorithm in source. Reviewers and contributors see one path, not two.
- The `parityHarness` API surface goes away cleanly. PR-06 (if it ships a denoise) can re-introduce harness internals without inheriting the prior shape.
- Smaller package size, smaller test runtime.

**Negative:**

- Anyone who pulled the repo at an earlier SHA and depends on `HorizonAoNode` must either pin that SHA or rewrite for `VBAONode` (which doesn't have a kernel yet — they should wait for PR-02).
- The `verify-horizonao-math-denoise` openspec change becomes a historical artefact with no active capability behind it.

**Risks:**

- Loss of confidence in the archive as a credible recovery path if it is not exercised. Mitigation: PR-00 verification step does NOT delete the archive, only moves it; a manual `git log --follow archive/horizonAoNode.ts` will show the full history.

## Implementation notes

- `packages/horizon-ao/archive/` is included in the tsdown build's *ignore* list. The archive is for git history, not for runtime consumption.
- `openspec/archive/` is referenced from this ADR and from `openspec/changes/vbao-pivot/proposal.md` so the historical specs remain discoverable.
- The package name stays `@horizonao/core` (R1 rename scope; see ADR-007). Renaming the package to `@vbao/core` is a separate infra PR.
