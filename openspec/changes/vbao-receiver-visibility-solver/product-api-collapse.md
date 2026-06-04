# Product API Collapse: Contact Over Thickness

## Decision

The product model moves away from exposing internal AO math as equal artist
controls.

Primary product controls:

```ts
vbao(depth, normal, camera, {
  quality: 'balanced',
  radius: 0.35,
  strength: 0.9,
  contact: 0.55,
  softness: 0.2,
})
```

Low-level controls remain available only as compatibility aliases or
`advanced` overrides:

```ts
vbao(depth, normal, camera, {
  radius: 0.35,
  contact: 0.55,
  advanced: {
    thickness: 0.08,
    samples: 10,
    slices: 4,
    resolutionScale: 1.0,
  },
})
```

## Why

`thickness` is a screen-space prior, not measured geometry. Treating it as a
first-class product dial makes users tune an implementation guess as if it were
real physical thickness.

`contact` is the right product concept:

```text
low contact  = thinner finite slab, sharper contact, lower halo risk
high contact = broader finite slab, stronger local contact
```

Internally:

```text
thickness = radius * mix(0.12, 0.30, contact)
```

The existing near-sample clamp remains:

```text
effectiveThickness = min(baseThickness, sampleDistance * 0.85)
```

This does not remove thickness from the solver. It stops pretending thickness is
the product concept.

## What This Replaces

Replace:

```text
radius, thickness, slices, samples, softness, resolutionScale as peer knobs
```

with:

```text
radius, strength, contact, softness, quality as product controls
```

and:

```text
advanced.* for escape hatches and evidence lanes
```

## Preset Policy

All named quality presets should not default to half-resolution.

Chosen policy for this slice:

```text
performance: 0.50 raw scale, 2x4
balanced:    0.75 raw scale, 3x6
quality:     1.00 raw scale, 4x8
ultra:       1.00 raw scale, 4x10
```

Why:

- half-resolution remains useful for performance;
- balanced should be a product compromise, not the same raw scale as
  performance;
- quality/ultra should remove low-resolution reconstruction from the baseline
  product claim.

Evidence lanes can still force `advanced.resolutionScale` for comparisons.

## Confidence Comes Next

This API collapse does not add confidence yet. It prepares for it:

```text
softness = how much uncertain receiver state may be reconstructed
```

not:

```text
softness = generic blur radius
```

The next metadata candidate should make `softness` confidence-guided instead of
uniform across every pixel.
