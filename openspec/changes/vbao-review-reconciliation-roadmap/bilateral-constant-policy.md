# Bilateral Constant Policy

## Current Formula

`computeVbaoBilateralGeometryWeight` currently applies:

```text
geometryWeight = exp2(-abs(dot(tapPosition - centerPosition, centerNormal)) * 24 / max(radius, 1e-3))
               * clamp(dot(centerNormal, tapNormal), 0, 1)^8
```

The helper is shared by:

- `VBAOHalfResCleanupNode`
- `VBAOResolveNode`
- `VBAOResolvePolishNode`
- `VBAOFullResPolishNode`

## Policy Interpretation

The current constants are intentionally strict edge-preservation defaults:

- `24` makes tangent-plane disagreement decay aggressively relative to AO
  radius. At one radius of plane distance, the weight is effectively zero.
- `normal^8` makes normal disagreement a high-confidence rejection term. It
  preserves depth/normal discontinuities at the cost of potentially hard
  transitions on gentle curvature.

This is not a research-derived constant pair. It is a product reconstruction
policy. That means it may stay only because source contracts and evidence keep
it honest, not because the number looks sophisticated.

## Gates Before Tuning

Any softer candidate, such as `smoothstep(0.5, 1.0, dotNN)^2`, must provide:

- same-scene before/after screenshots;
- failure labels for noise, edge bleed, halo, thin gap, and false curvature;
- pass timing at 1920x1080 and 1280x720;
- source contract proving all reconstruction passes use the same helper;
- no public denoise or reconstruction API change.

## Decision

Keep the current constants for now. They are specified as a strict
edge-preserving reconstruction policy. Tuning is deferred until evidence shows
the strict policy causes a measurable quality blocker that a softer candidate
fixes without halo or edge-bleed regression.
