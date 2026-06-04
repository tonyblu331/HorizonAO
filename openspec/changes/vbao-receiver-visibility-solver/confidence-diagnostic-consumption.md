# Confidence Diagnostic Consumption

## Decision

Phase 3.4 consumes the private receiver confidence sidecar as a diagnostic
reconstruction stage in the demo/evidence lane.

The diagnostic stage is selected with:

```text
vbaoComputeCandidate=sector-confidence-smoke
vbaoReconstructionStage=confidence
```

This keeps confidence private and inspectable without changing the default
product AO.

## Runtime Shape

`MuseumScene` now creates `VBAOReceiverConfidenceNode` only when the private
compute/candidate lane is requested. The node is added to stage disposal and can
be rendered through the reconstruction-stage pipeline as `confidence`.

The product scalar stays:

```text
vbaoProductScalar = product AO
```

not:

```text
vbaoProductScalar = product AO * confidence
```

## Why

Diagnostics are the right first consumption because confidence has not yet
proved that it improves labels or cost. Showing the sidecar separately lets the
evidence lane inspect support/agreement without silently changing the product
baseline.

## Still Blocked

Phase 3.5 remains open. Promotion needs screenshots, labels, and pass timings
against scalar control rows. Until then, confidence is a private diagnostic, not
a product reconstruction policy.
