# Design: VBAO Product Evidence Truthfulness

## Product Preset Evidence Path

The Museum scene is the main product benchmark path. Its VBAO options must use:

```ts
quality: 'quality'
resolutionScale: fullResolution ? 1.0 : 0.5
```

It must not pass `samples` or `slices` for product rows. `VBAONode.resolveRawLoopShape()` only marks the raw loop as fixed when a quality preset is supplied without explicit sample overrides.

## Debug Override Separation

Explicit `samples`/`slices` remain useful, but they are not product evidence. If needed later, add a separate benchmark dimension and label those rows as `debug-override` so they cannot be mistaken for release-candidate product preset measurements.

## Evidence Labels

The UI can keep the shared toggle for cross-algorithm comparison, but generated reports must describe VBAO as `raw-debug` vs `product`. Any legacy `denoised` labels in historical rows stay historical and should not be used as current product claims.

## Release-Candidate Gate Register

The review blockers stay as gates:

- package/archive self-contained verification;
- product preset evidence;
- half-resolution quality gate;
- noise-source comparison including procedural/no-texture IGN where possible;
- runtime/reference/debug boundary trim;
- generated shader inspection for fixed loops and duplicate-name warnings.