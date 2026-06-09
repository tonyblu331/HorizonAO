# Change: VBAO Angular Interval Solver Board

## Summary

Create a shared SDD board for the VBAO angular interval mental model: the math,
shader ownership, quirks, and product gates that together produce the represented
`VBAONode` signal.

This change does not add runtime code. It turns the current scattered quality
concerns into one solver model so future work can optimize, consolidate, and
delete with discipline.

## Motivation

The current implementation already uses finite-thickness visibility intervals,
but the problems are too easy to discuss as isolated bugs:

- near-contact thickness collapse;
- broad-contact thickness caps;
- 32-sector boundary instability;
- stochastic thin-sector variance;
- phase-atlas pattern residuals;
- edge bleed across incompatible depth/normal neighborhoods;
- reconstruction/polish that can hide raw signal defects;
- confidence metadata that explains some failures but is still private.

Those are not separate stories. They all flow through one represented receiver
visibility estimate:

```text
depth/normal/camera
-> view-space receiver P and sample Q
-> finite sample-local blocker interval
-> cosine-measure angular interval
-> 32-sector visibility mask
-> scalar accessibility
-> confidence-aware reconstruction
-> product AO
```

If we keep tuning the terms independently, we will accidentally make one gate
better by making another gate worse. The SDD board makes the dependencies
explicit before the next shader edit.

## Goals

- Define the canonical solver equation and the exact source terms that feed it.
- Map each known quirk to the term that creates or amplifies it.
- Contrast the current model with horizon AO, simpler VBAO, and WI/SPWI-style
  interval transport without conflating them.
- Identify optimization and consolidation opportunities that preserve the
  algorithm identity.
- Create a phase plan for reference tests, shader candidates, reconstruction
  changes, and evidence gates.

## Non-Goals

- No production build.
- No public `VBAONodeOptions` expansion.
- No public temporal, denoise, mask, confidence, sector-count, or directional
  output.
- No rewrite to world-space interval transport or Radiance Cascades/SPWI.
- No raw-kernel formula change without a failing fixture and spec amendment.
- No cleanup/refactor that hides a shader behavior change.

## Naming Decision

In conversation, "WI" may mean the interval mental model. In repo artifacts,
use precise names:

- **angular visibility interval**: the front/back blocker extent after projection
  into a VBAO slice measure domain;
- **finite-thickness visibility interval**: the same interval, emphasizing the
  thickness model;
- **world-space interval transport**: reserved for SPWI/Radiance Cascades-style
  distance-domain transport. It is not what `VBAONode` implements.

## Product Direction

The next product-quality improvements should be sequenced around the solver:

1. make the interval construction explainable;
2. prove which term causes each failure label;
3. improve raw interval/support quality before smoothing;
4. let confidence and edge compatibility guide reconstruction;
5. optimize only after the reduced equation is stable.

The desired outcome is not "more knobs." The desired outcome is a smaller
product architecture where each term has a reason to exist, a test, and a gate.
