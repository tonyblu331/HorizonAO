# Design: VBAO Sampling v2

## Formula

For each pixel, slice, and sample:

```text
φ_i = 2π · (i + ξ_angle(pixel)) / slices
t_j = (j + ξ_radius(pixel, i, j)) / samples
```

The current implementation uses deterministic low-discrepancy constants:

```text
ξ_radius = fract(radialBase + i · 0.5698402909980532 + j · 0.7548776662466927)
```

`radialBase` comes from the existing benchmark sampling texture. This keeps
schedule labels useful while changing the critical property: per-step gaps are
no longer one constant scale.

## Acceptance

- Step fractions remain monotonic and inside the marched segment.
- Same-pixel step gaps are not all equal.
- TSL source no longer contains the rejected `radialScale` formula.
- Public options remain unchanged.
