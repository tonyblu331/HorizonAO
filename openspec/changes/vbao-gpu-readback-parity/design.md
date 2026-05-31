# Design: VBAO GPU Readback Parity Gate

## Fixture Scope

The first quantitative fixture is the existing synthetic flat-plane scene in
`/vbao-parity`:

- `64×64` render target;
- camera at `+Z`, looking at the origin;
- large XY plane filling the view;
- normals facing the camera;
- VBAO config: radius `0.4`, samples `4`, slices `2`, thickness `0.1`,
  scale `1`, magic-square sampling.

Named pixels:

- `flat-plane-center`;
- `flat-plane-left-quarter`;
- `flat-plane-upper-right`.

These are intentionally small and fixed. This is a correctness tripwire, not a
quality benchmark.

## Scalar Mirror

`packages/horizon-ao/src/vbaoParity/` reconstructs the same flat-plane
view-space positions the page renders, then uses the internal VBAO reference
helpers:

- `buildViewLocalFrame`;
- `sampleUniformSliceDirection`;
- `sampleVbaoRotation`;
- `sampleVbaoStepFraction`;
- `stepAlongProjectedSlice`;
- `estimateAdaptiveThickness`;
- `sampleBlockerInterval`;
- `accumulateVbaoSupportBitmask`;
- `cosineWeightedReduction`.

The expected scalar value is quantized to the RedFormat readback byte before
comparison:

```text
expectedQuantized = round(expected * 255) / 255
tolerance         = 1 / 255 + epsilon
```

## Browser Contract

`apps/demo/src/scenes/VbaoParityPage.tsx` exposes:

```ts
window.__vbaoParity.fixtures
window.__vbaoParity.fixturePixels
```

The E2E test asserts every named row passes when `E2E_WEBGPU_PARITY=1`.

## Review Findings

Peer review caught two harness-level mismatches before the passing WebGPU run:

- Three's WebGPU `getViewPosition` and `getScreenPosition` helpers flip `y`.
  The scalar mirror now follows those helpers instead of using pure math UVs.
- WebGPU readback buffers are row-padded to 256-byte alignment. The parity page
  strips row padding before converting readback bytes into one AO value per
  pixel.

## Caveat

The local `E2E_WEBGPU_PARITY=1` run now passes for the fixed flat-plane fixture.
That proves the route-level readback contract, not full production quality. The
next parity fixtures still need two-wall corner and thin-occluder coverage.
