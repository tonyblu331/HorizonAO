# Runtime Confidence Sidecar

## Decision

Phase 3.3 adds a private runtime confidence sidecar:

```text
VBAOReceiverConfidenceNode
-> VBAO.ReceiverConfidence
-> RedFormat + HalfFloatType
```

It computes confidence from observable receiver-state terms:

- receiver candidate sample count;
- receiver accepted sample count;
- per-slice visibility masks;
- per-slice accessibility;
- slice agreement.

The output is:

```text
confidence = sqrt(receiver support * slice agreement)
```

where support is accepted receiver-compatible samples divided by candidate
samples, and agreement is derived from reduced per-slice accessibility variance.

## Scope

This is an internal source file:

- `packages/horizon-ao/src/VBAOReceiverConfidenceNode.ts`

It is not exported from `@horizonao/core`, not reachable through
`VBAONodeOptions`, and not exposed through a public getter.

## Why This Shape

The candidate keeps scalar product AO stable while making confidence computable
with the same receiver inputs and the same 32-sector visibility-mask contract.
It avoids pretending that confidence can be recovered from final AO darkness.

This closes the runtime computation gate and wires confidence into private
cleanup/polish reconstruction when softness needs it. It does not yet prove a
release-quality claim; that still requires scalar control comparisons,
screenshots, labels, and pass timings.

## Product Wiring

`VBAONode` owns the sidecar lifecycle:

- create/configure it only when cleanup or polish consumes confidence;
- pass its texture to `VBAOHalfResCleanupNode` and `VBAOFullResPolishNode`;
- dispose it with the product graph;
- keep it out of `@horizonao/core` exports and `VBAONodeOptions`.

Low confidence increases reconstruction influence; high confidence preserves the
raw receiver estimate. Benchmark pass timing maps `VBAO.ReceiverConfidence` as a
private `confidence` pass.

## Next Gate

Phase 3.5 must compare scalar control rows against confidence-guided rows. It
still must not add public confidence, metadata, support, mask, temporal, or
denoise controls.
