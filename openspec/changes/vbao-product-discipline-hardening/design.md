# Design: VBAO Product Discipline Hardening

## 1. JBU Fallback Reconstruction

`VBAOResolveNode` already computes the four raw AO tap coordinates and bilinear
weights for the edge-aware JBU resolve. The fallback should reuse that same
sample set instead of sampling `rawAo` at the full-resolution UV.

Implementation shape:

```txt
for each 2x2 raw tap:
  fallbackAo += tapAo * bilinearWeight
  fallbackWeight += bilinearWeight
  if center/tap edge checks pass:
    weightedAo += tapAo * bilinearWeight * depthWeight * normalWeight
    totalWeight += weightedEdgeWeight

return edge-aware result when totalWeight is valid,
otherwise return fallbackAo / fallbackWeight
```

This preserves the intended fallback semantics while keeping the raw target
nearest-filtered.

## 2. Full-Resolution Polish Tap Budget

The default `VBAOFullResPolishNode` path should visit `POISSON8` only. The wide
taps can stay as private implementation material, but they must not run in the
default product path.

Wide taps require a later evidence gate:

- screenshots for raw/product AO-only and beauty output;
- pass-level timing for the additional taps;
- failure-label comparison showing lower noise without mud, halo, or contact
  loss.

Until that evidence exists, the runtime answer is simple: default polish is 8
taps, not 16.

## 3. Low-Resolution Softness Budget

Low-resolution product output should spend `softness` on half-resolution cleanup
first. Full-resolution polish should only receive the remaining budget.

Internal mapping:

```txt
cleanupStrength = softness
polishStrength = max(0, softness - 0.5) * 2
```

Product graph:

```txt
resolutionScale < 0.99:
  raw
    -> half cleanup when cleanupStrength > 0
    -> JBU resolve
    -> full polish only when polishStrength > 0

resolutionScale >= 0.99:
  raw
    -> full polish when softness > 0
```

The public API stays unchanged. The discipline is internal pass budgeting.

## 4. Product Preset Loop Shapes

Product presets should compile fixed hot-loop shapes:

| Quality | Slices | Samples |
| --- | ---: | ---: |
| `performance` | 2 | 4 |
| `balanced` | 3 | 6 |
| `quality` | 4 | 8 |
| `ultra` | 4 | 10 |

Advanced `slices`/`samples` overrides can stay available for development and
debug comparison, but the main preset path should not depend on uniform loop
bounds.

Implementation direction:

- resolve a `loopShape` during construction/configuration;
- use numeric loop bounds for known product tiers;
- preserve current uniform values for diagnostics and debug overrides;
- reject post-graph loop-shape changes the same way `softness` and
  `resolutionScale` are currently graph-stability constraints.

## 5. Pass-Level Timing Evidence

Evidence should report timing by internal pass:

- raw;
- half cleanup;
- resolve;
- full polish;
- total product output.

The benchmark collector should distinguish absent passes from zero-cost passes.
For example, full-resolution output with `softness = 0` should mark cleanup,
resolve, and polish as `skipped`, not `0 ms`.

## 6. Noise Source Comparison Gate

The current hash phase atlas remains the default until another source wins a
frozen comparison.

Candidate sources:

- current stable hash atlas;
- IGN-style deterministic tile;
- static STBN tile;
- FAST-like tile.

Acceptance requires the candidate to improve a named failure label without
regressing cost, thin-gap behavior, or temporal stability for non-TAA scenes.

## 7. Canonical/Product Drift Stays Visible

The canonical/product drift report is not a nuisance; it is the brake that keeps
the product from pretending polish is truth.

Implementation rule:

- product VBAO may diverge from canonical VBAO;
- divergence must remain visible in the drift report;
- improvements can only be described as improvements after ray-cast/render
  evidence shows they beat the relevant baseline without hiding drift.

## 8. Runtime/Reference Source Boundary

Reference and report modules should move away from runtime modules:

```txt
packages/horizon-ao/
  src/
    runtime product nodes
  reference/
    aoRaycastReference.ts
    aoReferenceReport.ts
    canonicalVbaoReference.ts
    vbaoCanonicalDriftReport.ts
    vbaoReference.ts
```

The package `index.ts` must remain clean: no reference/report exports.

Tests may import reference modules through explicit internal paths. Runtime code
must not depend on reference/report modules.
