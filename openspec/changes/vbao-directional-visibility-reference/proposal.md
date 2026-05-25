# Change: VBAO Directional Visibility Reference

## Summary

Add a reference-only directional reconstruction layer from visibility bitmasks. Bent normal is a debug/comparison compression; the next-gen output is visibility buckets/cones derived from open sector lobes.

## Goals

- Reconstruct scalar accessibility, bent normal, and open-sector lobes from masks.
- Prove two separated open lobes do not collapse into a misleading single direction.
- Cap the first bucket implementation at two buckets unless evidence proves four.
- Keep production `VBAONode` scalar-only until the reference math is backtested.

## Non-Goals

- No public directional output yet.
- No indirect diffuse integration yet.
- No bent-normal headline.
