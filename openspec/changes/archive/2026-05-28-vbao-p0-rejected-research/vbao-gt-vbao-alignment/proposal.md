# Change: VBAO GT/Reference Alignment

## Why

The parity report previously compared the live production VBAO shader against the cosine-weighted scalar path, but its `paperExpected` value was only a popcount reduction of the production mask. That made the report look like a paper/GT comparison while still reusing production mask construction.

## What Changes

- Keep production VBAO as the cosine-weighted WebGPU path.
- Treat GT/reference VBAO as a separate paper/community-GLSL-aligned scalar path:
  - normal-centered slice shift;
  - constant view-direction thickness;
  - paper-aligned mask construction;
  - popcount accessibility reduction.
- Expose both production and paper mask metadata in the internal parity rows.
- Keep all helpers internal; no public `@horizonao/core` export and no `VBAONodeOptions` change.

## Decision

This is an alignment/reporting hardening gate, not a production formula flip. If paper and production disagree, the row must say so through the existing `formulaComparison` labels. Promotion still requires visual/evidence review.
