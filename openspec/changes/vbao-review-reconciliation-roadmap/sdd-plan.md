# SDD Plan: VBAO Review Reconciliation Roadmap

## Current State

The pasted north-star review correctly pressures the project toward provable
math, lower maintenance cost, and honest evidence. However, it is stale against
the current repository in several places. `VBAOEffectPass`,
`vbaoBilateralWeight`, `VBAOResolvePolishNode`, `sourceResolution`,
`vbaoRawNoisePixel`, and `aoPipelines.ts` are already present.

The remaining useful work is narrower:

- prove or reject slice weighting changes through fixtures;
- document/tune bilateral constants through evidence;
- characterize raw signal noise/edge bleed;
- reduce remaining demo/evidence coupling;
- define a migration policy for deprecated option aliases.

Principal constraint: this SDD is not allowed to turn stale review claims into
work. Anything already present in source is closed unless current tests or
evidence fail.

## Phase 1: Review Reconciliation Ledger

Goal: prevent stale review claims from becoming duplicated work.

- Record each major pasted claim as already done, still open, rejected, or
  delegated.
- Link each verdict to current source/spec evidence.
- Do not edit runtime code in this phase.

Acceptance:

- `current-state-contrast.md` exists.
- Completed claims are explicitly closed.
- Open claims have an owner SDD or a new task.

## Phase 2: Route Kernel Formula Claims

Goal: keep math changes behind the right gate.

- Keep cosine/slice reduction under
  `vbao-kernel-canonical-drift-triage`.
- Require a multi-slice/non-axis fixture before changing production slice
  accumulation.
- Record whether the formula change is a correction, double-weighting risk, or
  research variant.

Acceptance:

- No direct `VBAONode.ts` slice weighting change from this roadmap.
- Any formula change cites a failing fixture and spec update.
- Research citations may motivate the fixture, but they do not replace the
  fixture.

## Phase 3: Bilateral Constant Rationale

Goal: make the shared bilateral helper explainable.

- Document the current `exp2(-planeDistance * 24 / radius)` and `normal^8`
  behavior.
- Add a small range/contract test or evidence note that explains the practical
  cutoff.
- Only after documentation, consider a softer candidate such as smoothstep-based
  normal weighting.

Acceptance:

- Current constants have a named policy.
- Any tuning candidate has before/after labels and GPU timing.

## Phase 4: Phase Atlas Hoist Spike

Goal: test a small shader-cost improvement without changing stochastic behavior.

- Prototype hoisting slice-invariant phase atlas terms.
- Inspect generated shader output.
- Compare screenshots, labels, and GPU timing.

Acceptance:

- No stochastic thin-sector regression.
- No generated shader readability regression.
- Optimization only lands if evidence shows value.

## Phase 5: API Alias Migration Policy

Goal: remove deprecated aliases deliberately, not abruptly.

- Decide whether `preset`, `scale`, and `intensity` stay through v1 or move to a
  compatibility shim.
- Add source/API tests for the chosen policy.
- Do not delete aliases without a migration note.

Acceptance:

- Public API migration path is documented.
- Runtime option normalization stays simple or is moved to a shim.

## Phase 6: Demo Evidence Boundary Cleanup

Goal: reduce benchmark/demo coupling without breaking evidence capture.

- Contrast `aoPipelines.ts` users with remaining `MuseumScene.tsx` custom VBAO
  pipeline wiring.
- Extract only behavior-neutral pipeline code.
- Keep benchmark-specific evidence switches explicit.

Acceptance:

- Evidence capture still produces the same product/raw rows.
- Unit source contracts no longer need to inspect large scene internals where a
  smaller pipeline module can own the contract.

## Guardrails

- No production build unless explicitly requested.
- No public temporal, denoise, resolve, polish, or velocity API from this SDD.
- No pass fusion without new evidence beating the rejected fused candidate.
- No formula change without fixture failure and spec update.
- No broad cleanup that touches runtime behavior and demo behavior in the same
  patch.
- No resurrecting completed work as new tasks.

## Verification

For this reconciliation-only phase:

```sh
git diff --check -- openspec/changes/vbao-review-reconciliation-roadmap
```

For later implementation phases, add targeted tests based on touched files:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
pnpm --filter @horizonao/core typecheck
```
