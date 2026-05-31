# Design: VBAO Production-Readiness Audit + Temporal-Free Roadmap

## 1. Paper / GLSL Reference Path

`packages/horizon-ao/src/vbaoPaperReference.ts` is a second scalar reference,
separate from the current production-candidate `vbaoReference.ts`.

It models the paper/community GLSL convention:

```text
normalShift = signed angle between view direction and projected normal
front       = normalize(angle(sample - pixel) + normalShift)
back        = normalize(angle(sample - pixel - viewDir * thickness) + normalShift)
mask        = sectors in [min(front, back), max(front, back)]
access      = 1 - popcount(mask) / 32
```

This is not a shader swap. It is an audit tool that lets tests compare:

- paper popcount accessibility;
- current cosine-weighted accessibility;
- constant-thickness behavior;
- normal-centered slice shift.

## 2. Depth-MIP Candidate Guardrail

`resolveVbaoDepthMipCandidate(...)` accepts a coarse depth only when all are
true:

- projected footprint selects a hierarchy level above base;
- coarse/base view-depth delta is within tolerance;
- `edgeDepth` is below threshold;
- `edgeNormal` is below threshold;
- `confidence` is above threshold.

Otherwise it returns base depth with an explicit rejection reason. This keeps the
previous depth-prefilter experiment diagnostic-only and prevents broad depth
bands from becoming production truth.

## 3. Temporal-Free Spatial-Filter Report

`filterVbaoTemporalFreeAccessibility(...)` wraps the current spatial-filter
weight with a candidate-level metadata gate:

- `temporalFramesUsed` is always `0`;
- low confidence and low mask coverage reject a neighbor;
- high edge depth or high edge normal rejects a neighbor;
- accepted/rejected neighbor counts are reported for evidence review.

The function is internal reference infrastructure, not a public API.

## 4. Promotion Rule

The next GPU candidate must pass all of these before promotion:

- CPU paper/current reference tests;
- GPU readback parity against scalar fixtures;
- Museum screenshots at `1920x1080` and `1280x720`;
- timing rows against raw VBAO, GTAO, N8AO, and candidate variants;
- failure labels showing reduced `noise`, `mud`, `edge-bleed`, and
  `false-curvature` without worse `scale-mismatch`.
