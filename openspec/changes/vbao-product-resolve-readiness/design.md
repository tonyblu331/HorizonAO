# vbao-product-resolve-readiness Design

## Kernel Validity Gate

Before a reconstructed sample writes any visibility sectors, the shader computes:

- `sampleDelta = samplePos - P`
- `sampleDist2 = dot(sampleDelta, sampleDelta)`
- `sampleAlong = dot(sampleDelta, sampleDir)`
- `maxValidRadius = radius + thickness`

A sample is valid only when it is non-zero distance, inside `(radius + thickness)²`, and broadly on the marched side. Effective thickness is clamped to `min(thickness, 0.85 * sampleDist)` before computing the back point.

## Product Output Boundary

`VBAONode` owns the product texture contract. `getRawTextureNode()` is raw debug/readback output. `getTextureNode()` returns final product AO after lazy internal reconstruction/polish as needed.

`VBAOResolveNode` is an internal pass-rendered texture node:

- owns a Red/HalfFloat render target
- exposes `getTextureNode()` as `passTexture(...)` only to `VBAONode`
- renders once per frame via `updateBefore`
- reconstructs center/tap view positions from depth and camera inverse projection
- resolves raw AO with manual 2×2/JBU4 weights from bilinear weight, tangent-plane distance, and normal agreement

The raw AO and internal reconstruction targets use nearest filtering because the shader owns interpolation and blur explicitly.

## Polish Contract

Extra smoothing is controlled by `softness`. `VBAOFullResPolishNode` is an internal spatial polish pass, not a public filter toolkit. It can be lazily elided when `softness <= 0`; it does not require history, frame indices, reprojection, or temporal accumulation.

## Presets

The public product preset names are:

- `performance`: 1.0 resolution, 2 slices, 4 samples
- `balanced`: 1.0 resolution, 3 slices, 6 samples
- `quality`: 1.0 resolution, 4 slices, 8 samples
- `ultra`: 1.0 resolution, 4 slices, 10 samples