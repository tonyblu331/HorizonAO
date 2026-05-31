# vbao-product-resolve-readiness Proposal

## Summary

Align the product output path with the current one-node contract: `VBAONode` is the only public product, raw AO is debug/readback output, and low-resolution reconstruction plus full-resolution polish are lazy internal stages.

## Motivation

Current raw fixtures can pass while real scenes still show floor/wall patterning and AO-only banding. The product boundary must be explicit without exposing reconstruction stages as peer products: invalid screen-space samples cannot write mask sectors, low-resolution raw AO must be edge-aware reconstructed before product use, and optional smoothing belongs behind the `softness` control.

## Scope

- Keep local sample validity and effective-thickness clamping in the live `VBAONode` shader path.
- Keep `VBAOResolveNode` as an internal temporal-free pass texture with JBU4 edge-aware upsample when `resolutionScale < 0.99`.
- Keep cleanup/resolve/polish passes internal to `VBAONode`; public exports remain `VBAONode`, `vbao`, and option types.
- Keep public quality presets as `performance`, `balanced`, `quality`, and `ultra` with full-resolution defaults.

## Out of Scope

- Public reconstruction or filter nodes.
- Separate platform product presets.
- New sampling schedules or filter-aware tile replacement.
- GPU timestamp-query instrumentation.
