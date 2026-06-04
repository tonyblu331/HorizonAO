# ADR-014: Reject Camera-Only AO Temporal Accumulation

## Status

Accepted

## Context

The first VBAO temporal smoke path accumulated AO history without a host-owned
motion vector contract. It could render static frames, but static screenshots
cannot prove stable temporal reuse under camera motion, object motion, or
disocclusion.

Three's TRAA path and temporal supersampling practice both rely on motion-aware
history lookup plus explicit rejection and reset behavior. For Horizon AO, that
means temporal evidence must explain history reuse and rejection before any
tuning or public API discussion.

## Decision

Reject camera-only AO temporal accumulation as a promotion path.

Continue only the private velocity-backed path:

- host owns velocity, previous depth, and previous normal guides;
- VBAO owns only AO history and private diagnostics targets;
- diagnostics explain reset, viewport, depth, normal, velocity, and
  clamp/history-range rejection reasons;
- verifier/reporting treat missing diagnostics, target inventory, reset
  evidence, or motion evidence as incomplete candidate evidence.

## Consequences

- No public `temporal` option is added.
- No temporal threshold knobs are exposed.
- No private previous depth/normal guide copies are introduced.
- Static evidence can support smoke validation only; it cannot justify
  temporal promotion.
- Candidate review requires same-cost static evidence, reset/lifetime evidence,
  and camera-motion/object-motion/disocclusion evidence.
