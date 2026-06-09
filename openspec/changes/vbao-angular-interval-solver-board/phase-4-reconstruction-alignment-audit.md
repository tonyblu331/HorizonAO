# Phase 4 Audit: Reconstruction Alignment

## Purpose

Audit cleanup, resolve, and polish against the receiver-solver model:

```text
reconstruction = spatial repair of compatible receiver signal
```

not:

```text
reconstruction = generic blur of final AO
```

## Source Shape

| Stage | File | Current alignment |
| --- | --- | --- |
| Half-res cleanup | `packages/horizon-ao/src/VBAOHalfResCleanupNode.ts` | Consumes depth, normal, radius, and optional confidence. Uses centralized bilateral geometry weight. |
| Resolve | `packages/horizon-ao/src/VBAOResolveNode.ts` | Manual reconstruction/upsample with depth/normal compatibility; no public output. |
| Full-res polish | `packages/horizon-ao/src/VBAOFullResPolishNode.ts` | Consumes depth, normal, radius, and optional confidence. Uses centralized bilateral geometry weight. |
| Geometry compatibility | `packages/horizon-ao/src/vbaoBilateralWeight.ts` | Centralized plane-distance and normal-agreement weighting. |
| Product owner | `packages/horizon-ao/src/VBAONode.ts` | Owns private confidence sidecar lifecycle when cleanup/polish need it. |

## Receiver Compatibility Contract

Current reconstruction already has the right shape:

```text
weight = depthPlaneWeight * normalAgreementWeight
```

This rejects taps that are not compatible with the receiver surface. The new
fixture matrix adds a scalar edge-compatibility fixture so future edits can be
judged as receiver compatibility work, not raw-estimator work.

## Raw/Product Separation

Current public semantics remain correct:

- `getRawTextureNode()` exposes raw AO for debug/readback only;
- `getTextureNode()` returns product AO;
- confidence diagnostic rows are private evidence, not product AO;
- reconstruction-stage captures can render raw, cleanup, resolve, polish, final,
  and confidence for evidence.

## Risk

Confidence-guided reconstruction is already wired privately. The remaining risk
is product evidence, not architecture:

- product polish can reduce visible noise while raw labels remain failed;
- confidence can increase reconstruction influence in low-support areas without
  proving the raw estimator improved;
- half-resolution resolve can still mix incompatible receivers if edge metrics
  are too weak.

## Decision

Keep the current reconstruction architecture. Do not widen polish or add public
denoise controls.

The next runtime change should require a row that proves:

```text
edge-bleed label improves
AND thin-gap label does not regress
AND raw AO row remains separately visible
AND pass timing is counted
```

Until then, Phase 4 is an audit-confirmed alignment with product-promotion
still blocked by evidence.
