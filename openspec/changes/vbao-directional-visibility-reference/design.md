# Design: VBAO Directional Visibility Reference

## Direction Formula

For each slice and sector:

```text
dir(slice, sector) =
  normalize(S_i * cos(theta_k) + V * sin(theta_k))

weight =
  open(mask, k) * max(0, cos(theta_k - gammaNorm))

bentNormal =
  normalize(sum(weight * dir))

accessibility =
  sum(weight) / sum(max(0, cos(theta_k - gammaNorm)))
```

## Bucket Formula

1. Find contiguous open-sector lobes per slice.
2. Convert each lobe to `{ direction, weight, aperture }`.
3. Merge similar directions across slices.
4. Return at most two buckets in the first reference implementation.

## Why Buckets Before Bent AO Productization

Classic bent normals compress all open visibility into one vector. VBAO's mask preserves multiple visibility cones, so collapsing too early can lie in two-window/two-gap cases. Bent normal is useful as a debug baseline, not the target representation.

## Uncertainty And Failure Cases

- Open-sector lobes are reference evidence, not a lighting product. The current
  bucket cap is two because the first debug use case is "do not collapse two
  separated openings"; four or more buckets need separate evidence.
- Merge similarity is intentionally private. A fixed dot threshold can merge
  nearby lobes too aggressively or leave noisy near-duplicates unmerged.
- Bent normal can look stable while buckets reveal two separated cones. Treat
  bent normal as a debug compression only.
- Thin-gap and edge-bleed failures from scalar AO are still unresolved. Direction
  data must not become a distraction from scalar evidence gates.
- No public directional API ships in this change. `VBAONodeOptions` and
  `@horizonao/core` exports stay scalar-only until screenshots, timings, and
  fixture comparisons prove a production use case.
