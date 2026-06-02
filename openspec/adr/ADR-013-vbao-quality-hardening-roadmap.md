# ADR-013: VBAO Quality Hardening Roadmap

- **Status:** Accepted
- **Date:** 2026-06-01
- **Related:** ADR-007, ADR-011, ADR-012

## Context

The current `VBAONode` is a real visibility-bitmask AO implementation with selected
GT-VBAO corrections, but the live visual result in `/lab` still differs strongly from
N8AO:

- N8AO is a tuned production-style SSAO/N8AO compositor with screen-space radius,
  many samples, denoise iterations, and artist-facing intensity.
- VBAO is currently a visibility-bitmask signal plus internal spatial polish. Its
  raw signal has meaningful thin-visibility semantics, but it is not yet calibrated
  against a path-traced AO reference.
- Full-resolution VBAO removed the half-resolution line/scale artifact, but the
  product output still carries fine stochastic grain and edge sensitivity.

That means the current state is **not ready to claim "most ground-truth AO"**. It is
paper-inspired and architecturally promising, not yet evidence-proven as a better
production AO product than N8AO/GTAO on the repo scenes.

## Decision

Treat the next phase as **quality hardening**, not feature expansion.

No new public `VBAONodeOptions` knobs should be added until the reference/evidence
loop proves they are needed. The product boundary remains:

```ts
new VBAONode(depthNode, normalNode, camera, {
  radius,
  thickness,
  strength,
  contrast,
  softness,
  slices,
  samples,
  resolutionScale,
})
```

The next work must improve three things in this order:

1. **Reference truth:** add a small CPU/path-traced or ray-cast AO reference for fixed
   fixtures and camera pins.
2. **Raw signal quality:** reduce stochastic/edge artifacts before relying on more
   filtering.
3. **Product polish:** make denoise edge-aware and confidence-aware, but keep it
   internal behind `getTextureNode()`.

## Candid Quality Position

### Why N8AO looks different

N8AO is tuned to look good as a screen-space post effect:

- it uses screen-space radius;
- it has explicit denoise iterations and radius;
- it emphasizes contact shadows with high intensity;
- its output is composited as an AO product, not a paper-reference visibility
  diagnostic.

VBAO is solving a different core problem: representing multiple open/blocked sectors
inside a slice so thin occluders do not collapse into one horizon. That can be more
physically meaningful for thin geometry, but only if the sampling, thickness model,
and denoise preserve the signal.

### Current verdict

VBAO is currently:

- **more paper-aligned than SSAO/N8AO in representation** because it uses sector
  visibility masks;
- **not proven closer to path tracing** because no committed path-traced AO reference
  matrix exists;
- **not yet visually as tuned as N8AO** because N8AO has mature screen-space
  denoise/composite heuristics;
- **better architecturally than the old HorizonAO path** because the public API is
  now a single product node and debug/raw outputs are separated.

## Missing Pieces

### Reference and acceptance

- Committed reference AO images/values for fixed fixtures.
- A pixel/error metric comparing VBAO, GTAO, SSAO, and N8AO against that reference.
- A human label pass tied to screenshots: `noise`, `mud`, `halo`, `edge-bleed`,
  `thin-gap`, `scale-mismatch`, `false-curvature`.

### Raw kernel

- Confidence/support tracking per sector. A sector blocked by one stochastic sample
  should not have the same authority as a sector supported by repeated/broad samples.
- Better sample sequence pressure: compare the current phase atlas against IGN/STBN
  or another stable blue-noise tile under the same filter.
- Early-out and cheaper math audits:
  - early exit when mask is full;
  - avoid work for samples outside the projected radius/on-screen bounds;
  - keep the no-atan CDF path unless a reference gate proves a different solve is
    more accurate.

### Denoise/product polish

- The current full-res polish is a spatial filter, not a reference-aware denoiser.
- It lacks explicit confidence/variance input.
- It should reject cross-edge taps by view-space plane distance and normal as it does
  now, but eventually needs a signal confidence term derived from mask support.

### Optimization

- The code is display-pass TSL, not compute-tiled like CACAO/XeGTAO.
- There is no depth hierarchy/MIP path yet.
- There are no GPU timestamp rows committed for current full-res product defaults.

## Plan

### P0 — Freeze the verifier

Deliverables:

- Add a committed `EVIDENCE.md` section for the current full-res VBAO/N8AO/GTAO state.
- Capture `/lab` and `/museum` at 1920×1080 and 1280×720.
- Store rows for raw/product, AO-only/beauty, timing, and failure labels.

Acceptance:

- No quality claim without screenshots and timing.

### P1 — Reference AO gate

Deliverables:

- Add a small fixed-fixture ray-cast AO reference for canonical cases:
  flat plane, wall corner, thin gap, sphere-on-plane, box-on-plane, grazing wall.
- Compare current VBAO/GTAO/SSAO/N8AO against the same cameras.

Started:

- `packages/horizon-ao/reference/aoRaycastReference.ts` freezes deterministic
  cosine-hemisphere ray-cast fixtures for flat/open, sphere contact, box contact,
  two-wall corner, thin-gap slabs, and out-of-radius rejection.
- `packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts` verifies the
  fixture contract and deterministic reference accessibility ordering.
- `packages/horizon-ao/reference/aoReferenceReport.ts` turns fixture observations into
  pass/warn/fail candidate rows and algorithm summaries.
- `packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts` verifies that
  missing candidate rows warn instead of pretending a renderer passed.
- `packages/horizon-ao/reference/canonicalVbaoReference.ts` adds a strict canonical
  VBAO lane based on the paper/blog `UpdateSectors` model: constant pixel-view
  thickness, ceil-touch sector updates, and `1 - popcount(mask) / 32`.
- `packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts` verifies the
  canonical lane and makes the product-lane thickness drift observable.
- `packages/horizon-ao/reference/vbaoCanonicalDriftReport.ts` compares canonical VBAO
  against the current product scalar VBAO lane on identical synthetic samples.
- `packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts` freezes
  the drift cases and verifies that drift is surfaced as pass/warn/fail evidence,
  not hidden by product polish.

Acceptance:

- Product VBAO cannot be called "closer to path tracing" until it beats baselines
  and the canonical VBAO lane on this reference gate without worsening labels.

### P2 — Raw signal hardening

Candidates:

- sector support/confidence bitmask;
- IGN/STBN sampling atlas comparison;
- sample/radius schedule tuned for the denoise filter;
- early full-mask exit and on-screen/radius rejection cleanup.

Acceptance:

- Improve at least one target label (`noise`, `thin-gap`, `edge-bleed`,
  `false-curvature`) and worsen none.

### P3 — Product polish hardening

Candidates:

- confidence-aware spatial polish;
- edge-aware separable pass only if a 2D filter beats the current Poisson polish;
- half-resolution path stays disabled for product claims until scale artifacts are
  solved.

Acceptance:

- Product AO must beat raw AO in noise without adding mud/halo/edge bleed.

### P4 — Performance path

Candidates:

- depth hierarchy / min-max or linear-depth MIP;
- compute/tiled implementation experiment;
- sample early-outs and packed metadata.

Acceptance:

- GPU timings must show the optimized path is better than spending the same cost on
  more samples or a stronger polish pass.

## Rejected Shortcuts

- Do not call N8AO "ground truth"; it is a tuned screen-space baseline.
- Do not claim VBAO is path-tracing-close until the reference AO gate exists.
- Do not add public denoise knobs to compensate for weak raw signal.
- Do not revive half-resolution product output for evidence unless scale artifacts
  are fixed first.
- Do not replace the visibility-bitmask core with SSAO-style heuristics unless the
  project explicitly pivots away from SSILVB/VBAO.

## Consequences

Positive:

- Keeps the project honest: paper-inspired does not become paper-proven by naming.
- Gives the AI/code loop a hard verifier instead of visual vibes.
- Separates raw-signal fixes from denoise cosmetics.

Negative:

- The repo cannot honestly market VBAO as production-quality yet.
- Reference fixtures and evidence capture add work before more shader experiments.
- Some visually pleasing N8AO behavior may remain heuristic and not worth copying.

## Status Summary

Current status: **promising prototype / internal product candidate**.

Not yet:

- path-tracing validated;
- visually superior to N8AO;
- performance-optimized;
- ready for broad upstream claims.

Target status after this ADR: **evidence-gated production candidate**.
