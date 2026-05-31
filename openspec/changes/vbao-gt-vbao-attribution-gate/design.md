# Design: VBAO GT-VBAO Attribution Gate

## Intent

The gate is scalar-first. It adds a readable attribution report beside the
support-bitmask parity result so the next implementation can tell whether the
observed drift is most likely from fixture/depth selection, support-mask
accumulation, sector-boundary/quantization risk, shader math, or readback
tolerance.

## Variants

The report emits five internal rows:

1. `baseline-current`
2. `point-sample-quantized-mask`
3. `perspective-sample-view-thickness`
4. `acos-free-angle-path`
5. `support-bitmask-attribution`

Only `support-bitmask-attribution` changes visibility reduction today. The
other rows document which GT-VBAO axes are currently represented by the scalar
mirror and prevent accidental promotion-by-name.

## Safety

The canonical mask helper uses sorted, clamped `[min, max)` intervals and
delegates to the existing count-clamped `maskRange`, so it never requires
`1u << 32`.

The route remains internal: `window.__vbaoParity.supportBitmaskCandidate`
receives attribution data, but package exports and production defaults remain
unchanged.

## GPU Correlation

The support-bitmask fixture comparison also emits
`attributionGpuCorrelation`. This is still diagnostic-only: it joins the scalar
attribution target with the candidate GPU fixture row and reports scalar
support lift, observed GPU lift, unresolved support lift, and candidate
absolute error.

For the original `subpixel-thin-left-upper-receiver` drift, the useful rejected
label was `partial-support-mask-divergence`: the GPU candidate moved in the
same direction as the scalar support-bitmask candidate, but left a roughly
`6/255` unresolved lift. After the scalar fixture frontmost-depth parity fix,
the target correlation is `no-candidate-gpu-drift`; the candidate may move to
internal label review, but still does not promote production.

## Shader Accumulation Guard

The live TSL path SHALL snapshot the previous hit mask before updating either
support plane:

```text
previousHitMask = hitMask
broadSupportMask = broad(sampleMask)
nextSupportedMask = supportedMask | (previousHitMask & sampleMask) | broadSupportMask
nextHitMask = previousHitMask | sampleMask
```

This avoids depending on reads from a mutable mask while the same block is
also assigning to it. The change is internal to the rejected
`support-bitmask-v1` benchmark path; the production binary/cosine path and
public API remain unchanged.

## Per-Sample Mask Attribution

The scalar attribution rows now keep the per-sample interval that produced each
sample mask:

```text
sliceIndex, sideIndex, sampleIndex, sampleOrderIndex
theta0, theta1
rawK0, rawK1Exclusive
clampedK0, clampedK1Exclusive
mask, popcount, sectors
boundaryRiskFlags
```

For the known upper-anchor drift, this exposes two high-sector contributors:

- slice `0`, side `1`, sample `3`: sectors `[28, 29]`, popcount `2`,
  `rawK0=28`, `rawK1Exclusive=30`, with theta boundary risk.
- slice `1`, side `0`, sample `2`: sector `[29]`, popcount `1`.

Those samples are narrow high-angle intervals, exactly where WGSL `atan`,
`floor`, `ceil`, and unsigned mask generation can diverge by one sector or one
8-bit AO step. This is evidence for the next diagnostic, not a production
promotion.

## Boundary-Sector Perturbation Hypotheses

The first perturbation tested a blunt hypothesis: promote all high-sector
single-hit sectors `[28, 29]` to fully supported. That was refuted: it produces
the baseline quantized value `0.854902`, not the live GPU `0.905882`.

The closest subset search is more informative. Promoting only sector `28` from
slice `0`, side `1`, sample `3` produces quantized AO `0.905882`, exactly the
known rejected WebGPU readback for the target. This means the `6/255` gap is
consistent with a one-sector classification mismatch around the high-angle
boundary, not with the entire support-mask accumulation model being wrong.

This remains diagnostic-only. It narrows the next implementation question to
WGSL/scalar parity for the specific interval:

```text
slice=0 side=1 sample=3
theta0=1.276090982663153
theta1=1.2852648789144832
rawK0=28 rawK1Exclusive=30
```

## Sector Interval Precision Envelope

The WGPU precision envelope now evaluates that interval directly. Simulated
f32 constants do **not** change the sector indices: both f64 and f32 paths
produce `[28, 30)`. However, `theta0` is only about `0.001844` sector units
below boundary `29`, so the interval remains a boundary-risk case with
boundary-adjacent sectors `[28, 29]`.

That matters: the likely mismatch is no longer "JavaScript double versus WGSL
float changes the floor/ceil result" by itself. The next useful shader
diagnostic must inspect the live WGSL-generated `thetaFront/thetaBack/k0/k1`
or equivalent debug output for that sample, because a one-sector difference is
still plausible at the generated shader/math path.

## Live Shader-Side Sample Diagnostic

`/vbao-parity` now performs an internal debug readback for the exact rejected
sample:

```text
fixture=subpixel-thin-occluder
anchor=subpixel-thin-left-upper-receiver
pixel=[27,33]
slice=0 side=1 sample=3
```

The route asks `VBAONode` to re-render that fixture through one diagnostic
field at a time, using a temporary float readback target. Mask values are read
as two 16-bit halves and reassembled in the route payload so high u32 sectors
are not lost to f32 mantissa limits. The diagnostic payload is:

```text
thetaFront, thetaBack
k0, k1
sampleMask, hitMask, supportedMask
quantizedAo
```

Observed live WebGPU readback for the target:

```text
thetaFront=1.28526771068573
thetaBack=1.2579689025878906
k0=28
k1=30
sampleMask=0x30000000
hitMask=0x3001ff80
supportedMask=0x2001ff80
quantizedAo=0.905882
```

This closes one important branch: the live shader does **not** generate a
different sector interval or sample mask for the target sample. It still
produces `[28,30)` and `0x30000000`. The scalar-vs-live gap remains in mask
accumulation / slice reduction state, not in the basic interval quantization.
`support-bitmask-v1` remains rejected and production VBAO remains unchanged.

## Live Shader-Side Slice Diagnostic

The next `/vbao-parity` debug readback compares the final per-slice accumulated
state for the same target. It exposes live and scalar values for:

```text
hitMask
supportedMask
gammaNorm
numerator
denominator
accessibility
quantizedAo
```

Observed live/scalar comparison:

```text
live quantizedAo=0.905882
scalar quantizedAo=0.929412
quantizedAoDelta=0.023529

slice 0:
  live   hitMask=0x3001ff80 supportedMask=0x2001ff80 accessibility=0.857427
  scalar hitMask=0x3001ff80 supportedMask=0x0001ff80 accessibility=0.907302

slice 1:
  live   hitMask=0x2001fff0 supportedMask=0x0001fff0 accessibility=0.952347
  scalar hitMask=0x2001fff0 supportedMask=0x0001fff0 accessibility=0.952347
```

This classifies the remaining rejected-candidate drift more tightly: slice `1`
matches, and slice `0` has the same `hitMask` but a different `supportedMask`.
The live shader includes high sector `0x20000000` in slice `0` support while
the scalar mirror does not. That means the next fix must target support-mask
accumulation/reduction semantics for the internal candidate, not interval
generation, public API, spatial filtering, or production defaults.

## Live Shader-Side Transition Diagnostic

`/vbao-parity` now also reads the target sample's support-mask transition:

```text
sampleMask
previousHitMask
previousSupportedMask
repeatedSupportMask
broadSupportMask
nextHitMask
nextSupportedMask
```

Observed live/scalar comparison for slice `0`, side `1`, sample `3`:

```text
sampleMask=0x30000000

live:
  previousHitMask=0x2001ff80
  previousSupportedMask=0x0001ff80
  repeatedSupportMask=0x20000000
  broadSupportMask=0x00000000
  nextHitMask=0x3001ff80
  nextSupportedMask=0x2001ff80

scalar:
  previousHitMask=0x0001ff80
  previousSupportedMask=0x0001ff80
  repeatedSupportMask=0x00000000
  broadSupportMask=0x00000000
  nextHitMask=0x3001ff80
  nextSupportedMask=0x0001ff80
```

This closes the transition branch: the live shader is not self-supporting the
target via the broad interval path. It is taking the repeated-support path
because sector `29` (`0x20000000`) is already present in live `previousHitMask`
before the target sample runs. The scalar mirror does not have that prior high
sector. The next diagnostic must find which earlier live sample contributes
sector `29`, or the candidate remains rejected.

## Live Shader-Side Prior Sample Trace

The prior-sample trace reads live sample masks for the seven samples that run
before the target transition in slice `0`. It reconstructs the live hit-mask
prefix and compares it to the scalar prefix.

Observed contributor:

```text
live contributingSampleOrderIndexes=[6]

sampleOrderIndex=6
side=1 sample=2
live sampleMask=0x20000000
scalar sampleMask=0x0001f000

live nextHitMask=0x2001ff80
scalar nextHitMask=0x0001ff80
```

This identifies the source of the prior-hit divergence: live slice `0`, side
`1`, sample `2` becomes a high-sector-only interval at sector `29`, while the
scalar mirror keeps it in low sectors `[12,16)`. The later target sample then
repeats sector `29` and promotes it to supported. The remaining branch is no
longer "which support update path fired"; it is the earlier sample-2
view/depth/thickness/angle mismatch. `support-bitmask-v1` remains rejected.

## Live Shader-Side Prior Sample Detail

The next diagnostic reads geometric/math facts for the identified contributor
sample: slice `0`, side `1`, sample `2`.

Observed live/scalar detail:

```text
sampleScreen:
  live   [0.4889061749, 0.5469606519]
  scalar [0.4889061705, 0.5469606252]

samplePosition:
  live   [-0.03100023, -0.13122533, -2.41999364]
  scalar [-0.04099216, -0.17352147, -3.2]

adaptiveThickness:
  live   0.05701448
  scalar 0.1

theta interval:
  live   [1.32906914, 1.35077512] -> [k0=29, k1=30], mask=0x20000000
  scalar [-0.33511940, 0.06527196] -> [k0=12, k1=17], mask=0x0001f000
```

This classifies the sample-2 mismatch as a geometry/depth selection mismatch,
not sampling jitter: live and scalar sample the same screen coordinate, but live
hits the thin foreground occluder at about `z=-2.42` while the scalar mirror
selects the rear plane at `z=-3.2`. The next fix must target fixture scene
depth/frontmost-surface parity or explicitly reject `support-bitmask-v1` for
this subpixel-thin case. It still does not justify production promotion.

## Scalar Fixture Frontmost-Depth Parity Fix

The scalar fixture mirror now models the subpixel occluder as a raster-covered
foreground surface at the known contributor coordinate. The frontmost-depth
selection logic was already correct; the bug was that the exact analytic
rectangle bounds rejected the subpixel blocker even though the live depth path
saw it through the pixel footprint.

The fix adds an internal `scalarCoveragePaddingPixels` field on
`VbaoParityFrontalRectSurface` and applies `0.5px` coverage padding only to the
`subpixel-thin-occluder` foreground blocker. This is local to the internal
fixture mirror; it does not affect production shader math, public exports,
constructor options, spatial filtering, or Museum defaults.

Updated observed target facts:

```text
sample order 6:
  live   position z=-2.41999364 mask=0x20000000 k0=29 k1=30
  scalar position z=-2.42       mask=0x20000000 k0=29 k1=30

slice 0:
  live   hitMask=0x3001ff80 supportedMask=0x2001ff80
  scalar hitMask=0x3001ff80 supportedMask=0x2001ff80

target quantized AO:
  live   0.905882
  scalar 0.905882
  delta  0
```

Classification is now closed for this target: the prior `6/255` gap was a
scalar fixture frontmost/depth coverage mismatch, not a target-sample sector
interval mismatch, plain f64-vs-f32 precision mismatch, or support-mask update
semantic mismatch. `support-bitmask-v1` is therefore `ready-for-label-review`
inside `/vbao-parity`, with `promoteProduction=false`.

## Support-Bitmask Label-Review Gate

`ready-for-label-review` is not a production or Museum-matrix verdict. It only
means the candidate cleared scalar/live parity and can now be judged with the
fixture artifact labels.

The internal label-review gate requires reviewed rows for these fixtures:

```text
thin-gap-parallel-planes
large-flat-floor-no-curvature
small-contact-object-on-plane
grazing-wall-corner
subpixel-thin-occluder
```

Each fixture must include both variants:

```text
baseline-current
support-bitmask-v1
```

The gate returns:

- `requires-label-review` when rows are missing or labelled `pending-review`.
- `reject-support-bitmask-labels` when the candidate worsens any reviewed
  fixture label or improves none.
- `requires-gpu-parity` when reviewed labels pass but hardened GPU/scalar parity
  is absent.
- `ready-for-museum-matrix` only when labels improve, none worsen, and parity
  has passed.

The current route payload intentionally emits a 10-row pending review template:
each required fixture has both `baseline-current` and `support-bitmask-v1`
rows, each labelled `pending-review`. It therefore reports
`labelGate.verdict=requires-label-review` while the candidate-level verdict
remains `ready-for-label-review`. This distinction is the guardrail: parity is
green, visual labels are explicitly pending, and production remains unchanged.

The same pending template is recorded as the label-review handoff artifact at
`artifacts/analysis/vbao_support_bitmask_label_review_decision.json`. That
artifact is governance evidence, not a reviewed-label claim: `reviewedAt` stays
`pending`, every row stays `pending-review`, and it exists so the next reviewer
has the exact fixture/variant rows to replace with real labels.

When reviewed rows are supplied to the internal GPU fixture comparison result,
the same label gate processes them instead of the pending template. If reviewed
labels improve at least one fixture label, worsen none, and GPU/scalar parity is
still green, the support-bitmask candidate result may advance to
`ready-for-museum-matrix`. Even then, `promoteProduction=false`; the verdict
only unlocks Museum matrix planning.
