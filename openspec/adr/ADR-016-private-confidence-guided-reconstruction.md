# ADR-016: Private Confidence-Guided Reconstruction

## Status

Accepted

## Context

`VBAONode` now has a private receiver-state confidence sidecar:

```text
VBAOReceiverConfidenceNode -> VBAO.ReceiverConfidence
```

The sidecar computes scalar confidence from receiver-compatible sample support
and per-slice accessibility agreement. Keeping it as an unconsumed diagnostic
would leave a parallel implementation path that can drift from the product
graph. Exporting it publicly would also leak receiver metadata before evidence
proves a user-facing API.

The previous fused `VBAOResolvePolishNode` candidate duplicated the separate
resolve and polish passes for evidence. It was not the product graph, added an
extra branch to benchmark/report plumbing, and conflicted with the no-wrapper
direction for the receiver solver.

## Decision

Wire confidence into the private reconstruction path owned by `VBAONode`.

- `VBAONode` owns, configures, and disposes `VBAOReceiverConfidenceNode`.
- The confidence texture is created only when cleanup or polish consumes it.
- `VBAOHalfResCleanupNode` and `VBAOFullResPolishNode` use low confidence to
  increase cleanup/polish influence and high confidence to preserve the raw
  receiver estimate.
- `VBAOReceiverConfidenceNode` remains private: no `@horizonao/core` export, no
  `VBAONodeOptions` field, and no public getter.
- The evidence-only fused resolve-polish node is removed instead of preserved as
  a legacy wrapper or alternate product branch.

## Consequences

Positive:

- Confidence now has one product-path responsibility instead of existing as a
  loose sidecar.
- The public API stays scalar and compact.
- Benchmark pass accounting can measure `VBAO.ReceiverConfidence` directly.
- Duplicate fused resolve-polish code and report labels are gone.

Negative:

- Product timing can include an extra private confidence pass when softness
  enables confidence-guided reconstruction.
- The confidence-guided policy still needs screenshot, label, and timing
  evidence before it can support any release-quality claim.

## Follow-Up

Phase 3.5 of `vbao-receiver-visibility-solver` must compare scalar control rows
against confidence-guided rows with screenshots, labels, and pass timings. If
confidence does not improve a named label or cost tradeoff, keep it private and
revise or remove the policy.

## 2026-06-05 Update

The product-quality hardening matrix keeps confidence-guided reconstruction as a
private candidate. It must be compared against:

- `scalar-control`;
- `same-cost-3x10`;
- `same-cost-2x16`;
- full-res product controls;
- `compute-off-control` and `temporal-off-baseline` axes.

Confidence is not promotable while `missing-reference-observation` remains, even
if screenshot proxies improve. If same-cost raw sampling beats confidence at a
similar or lower cost, confidence stays private and the next work moves toward
sampling/noise provenance instead of API promotion.
