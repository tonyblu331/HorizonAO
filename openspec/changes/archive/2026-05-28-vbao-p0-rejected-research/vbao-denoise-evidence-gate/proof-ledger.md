# Proof Ledger: VBAO Denoise Evidence Gate

## 2026-05-26 Findings

### Evidence From Local Screenshots

Status: SUPPORTED.

- Single GTAO capture is clean and stable but visually subtle.
- Single VBAO capture is fast, but visibly has `noise,mud,edge-bleed`.
- Single N8AO capture is smoother, but shows a soft `halo` around contacts.
- Split-composer capture was not trustworthy: GTAO/VBAO panels could be black
  while N8AO rendered. This is now guarded by an E2E canvas pixel smoke that
  fails any selected segment with black/missing pixels.
- The 2026-05-26 matrix capture produced 32 WebGPU screenshot rows across
  `1920x1080` and `1280x720`. Raw adaptive VBAO is fast, but still visibly has
  `noise,mud,edge-bleed`; the current generic denoise trades that patterning for
  `mud,edge-bleed,thin-gap`. That is evidence for the denoise gate, not a win.
- The raw high-sample comparison (`8` vs `16` samples at `3` slices) does not
  solve the visible failure. It keeps the structured sampling pattern and pushes
  broader darkening in AO-only screenshots. This means the next pressure should
  be sampling schedule backtests, not blindly raising samples or adding blur.
- Code review found the direct root cause for that behavior: production VBAO
  rotated samples per pixel but still marched every sample on the same fixed
  radial fractions. More samples therefore reinforced a coherent screen-space
  lattice instead of decorrelating it.
- The schedule matrix run captured and labelled 56 WebGPU rows with
  `AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1`. R2 and blue-noise reduce the old
  diagonal regularity in some AO-only captures, but no schedule clears
  `noise,mud,edge-bleed`. Hilbert-style sampling produces an obvious
  checker/grid pattern in this harness. Production remains `magic-square`.
- The denoise gate matrix captured and labelled 48 WebGPU rows with raw
  baseline, raw high-sample, generic denoise, and a demo-only custom bilateral
  candidate. Generic denoise smooths by introducing `mud,edge-bleed,thin-gap`.
  Custom-bilateral keeps better edge behavior and acceptable median/p95 timings,
  but it does not materially remove the coherent VBAO pattern and remains
  labelled `noise,mud,edge-bleed`.

### Evidence From Local Code

Status: SUPPORTED.

- Current VBAO uses the proven adaptive-thickness TSL path, but still feeds a
  generic Three `DenoiseNode` in the demo.
- Current VBAO defaults to magic-square sampling in production. R2, Hilbert,
  and blue-noise-like schedules are now wired as benchmark-only options, and
  radial jitter is encoded in the noise texture alpha so schedule captures can
  test the actual shader path without exposing a public quality API.
- Current demo denoise uses Three's generic luma/depth/normal bilateral shape
  with `radius=4`, `depthPhi=3`, and `normalPhi=8`.
- A reference-only scalar spatial denoise helper now exists for gate testing.
  It stops invalid background samples, normal discontinuities, and large
  tangent-plane depth breaks before any demo or public denoise path is promoted.
- A demo-only custom bilateral candidate now exists behind
  `window.__aoBenchmark.setVbaoDenoiseFilter('custom-bilateral')`. It is not in
  `VBAONodeOptions` and is not exported from `@horizonao/core`.
- Local `n8ao-webgpu` uses a dedicated AO target, blue-noise texture, AO samples,
  blur samples, repeated denoise iterations, tangent-plane depth weighting, and
  normal weighting.
- `n8ao-webgpu` raw/denoised rows are not true raw-vs-filtered pairs in our
  harness yet: the demo routes both N8AO states through the same internal N8AO
  output. The benchmark collector now annotates those rows with `denoiseNote`.

### Evidence From External Sources

Status: SUPPORTED as design pressure, not proof for this repo.

- XeGTAO documents raw 18 spp plus a 5x5 spatial denoiser, then optional TAA;
  it also explains the Hilbert curve + R2 sequence and depth MIP bandwidth
  strategy.
- AMD CACAO 1.4 is an optimized ASSAO-derived pipeline with quality levels,
  adaptive highest quality, edge-aware blur, and bilateral upsampling.
- N8AO documents screen-space radius, denoise sample/radius presets, half-res
  depth-aware upsampling, and an optional accumulation mode that we explicitly
  do not adopt.
- Reddit/forum/Shadertoy/marketplace claims show active interest in GT-VBAO and
  visibility bitmask variants, but those claims are not direct evidence for our
  WebGPU TSL code.

## Decision

REJECT DENOISE PROMOTION, refine next algorithmic layer.

Neither generic denoise nor the custom-bilateral candidate earns production
promotion. A smoother image is not enough: generic denoise buys smoothness with
mud/edge bleed, and custom-bilateral preserves more structure but does not solve
the noise/mud problem.

## Next Pressure

1. Archive this denoise gate after final verification.
2. Design the next depth hierarchy experiment for large-radius/scale mismatch.
3. In parallel, keep bitmask confidence metadata as the filter-enabling path;
   do not add more blur without a confidence signal.
