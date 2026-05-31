# Design: VBAO Edge Confidence Metadata

## Metadata Shape

The internal reference metadata is:

```text
edgeDepth = abs(dot(Pq - Pp, Np))
edgeNormal = 1 - max(dot(Np, Nq), 0)
confidence = validSampleRatio
           · exp(-depthRange / σrange)
           · normalAgreement
           · maskCoverage
```

This intentionally stays in `packages/horizon-ao/src/vbaoEdgeConfidence.ts` and
is not exported from `@horizonao/core`.

## Reference Filter Formula

The reference filter weight is now:

```text
w = kernelWeight · confidence · exp(-edgeDepth / σd) · pow(max(dot(Np,Nq),0), σn)
```

where `confidence` is clamped to `[0, 1]`.

## GPU Demo Debug View

The Museum route now exposes an internal-only VBAO metadata debug selector:

- `none`: normal VBAO output.
- `edge-depth`: tone-mapped max tangent-plane neighbor depth delta.
- `edge-normal`: max one-minus-normal-agreement across four direct neighbors.
- `confidence`: `validSampleRatio * depthConfidence * normalConfidence`.

The debug pass samples the existing prepass depth and normal data. It does not
write a public metadata render target, does not add `VBAONodeOptions`, and does
not change `@horizonao/core` exports. The goal is inspection discipline before
the next filter candidate: a denoise proposal must prove that its weights are
driven by visible edge/confidence signals instead of a generic blur.

Known limitation: the current `edge-depth` view is a local neighbor diagnostic,
not a final depth hierarchy or filter confidence channel. It is useful for
finding discontinuities, but broad bright fields in the Museum screenshot prove
it can become a `false-curvature` source if used blindly.

## Acceptance

- Invalid/background samples still contribute zero.
- Normal/depth discontinuities still reject or attenuate.
- A low-confidence same-surface neighbor contributes proportionally less.
- A suspicious neighbor can be suppressed by metadata even when its raw
  position/normal pair looks same-surface to the old filter.
- GPU debug views expose `edge-depth`, `edge-normal`, and `confidence` for
  screenshot review before any metadata-aware filter promotion.
- Public API remains unchanged.
