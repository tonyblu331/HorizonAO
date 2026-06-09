# Proposal: VBAO Product Quality Hardening 10x

## Summary

Harden VBAO from a well-shaped receiver-solver architecture into a release-grade
scalar AO product. The current architecture is strong, but product evidence is
not: screenshots still carry `noise`, reference observations are missing, and
private confidence/compute/temporal/directional lanes are not promotable.

This change defines the candidate lane, control lanes, evidence matrix, and
hardening tasks needed to move toward 10/10 quality without turning private
experiments into public claims.

## Candidate

The current best candidate is:

```text
VBAO product-preset
temporal off
compute off
private confidence-guided reconstruction enabled
scalar public output only
```

This is a candidate lane, not a promotion. It must beat the controls at the
same cost and clear reference/screenshot gates before product claims change.

## Controls

- `scalar-control`: disables confidence-guided reconstruction.
- `compute off`: default render-target path.
- `sector-confidence-smoke`: storage/compute integration proof only.
- `temporal off`: public product baseline.
- `velocity-internal`: private temporal evidence only.
- `spatial same-cost`: spend candidate overhead on more raw sampling instead.
- `full-res product`: quality ceiling/control for half-res reconstruction.
- directional reference: reference-only, not runtime product.

## Why

The receiver-solver SDD made the architecture honest. This change makes the
quality gate honest. A 10/10 product needs visible quality, fixture truth,
same-cost comparisons, and clean evidence packaging. It cannot ship on a good
mental model alone.

## Non-Goals

- No public temporal option.
- No public confidence, metadata, compute, mask, bent-normal, or directional
  output.
- No release-ready README claim until gates pass.
- No production build unless explicitly requested.
- No broad rewrite or architecture churn to hide unresolved image quality.
