# Metadata Representation Decision

## Decision

Phase 3.2 chooses a private `R16F` confidence/support sidecar as the smallest
locally supported runtime candidate.

The active product runtime remains unchanged:

```text
raw receiver estimate: RedFormat + HalfFloatType
product AO: scalar TextureNode
public API: no confidence/metadata controls
```

The runtime candidate adds:

```text
VBAO.ReceiverConfidence: RedFormat + HalfFloatType
```

and keeps it private to reconstruction diagnostics or confidence-guided
reconstruction experiments.

## Evidence

Current source evidence:

- `VBAONode` uses `RedFormat + HalfFloatType` for `rawEstimateTarget`;
- `VBAOEffectPass`, `VBAOResolveNode`, and `VBAOHalfResCleanupNode` use the same
  scalar half-float target shape;
- reconstruction passes sample scalar `.r` AO today;
- the local demo dependency is `three@0.184.0`;
- local token search did not prove an available `RGFormat` import in the
  installed Three package layout.

Because `RGFormat` support was not verified locally, `RG16F` is not selected for
the next implementation slice. It can replace the sidecar only after a focused
format-support spike proves the import, render target creation, TSL sampling,
and downstream pass assumptions.

## Why

A private R16F sidecar is not the final architecture dream. It is the smallest
truth-preserving candidate that:

- avoids changing the existing scalar raw AO target;
- avoids changing shader formulas in the same step;
- avoids widening every reconstruction pass before confidence has evidence;
- gives future benchmarks a separate target to time and reject;
- keeps public `VBAONodeOptions` clean.

## What It Must Replace

The sidecar candidate must replace blind reconstruction ambiguity:

```text
uniform softness or polish
```

with receiver-state evidence:

```text
support/confidence guides where reconstruction is trusted
```

If it does not improve a named label or reduce pass cost against a scalar
control, it remains private or is rejected.

## Non-Promotion

This decision does not add:

- public `confidence`, `metadata`, `support`, or `mask` options;
- public confidence texture output;
- temporal reuse;
- directional output;
- README or release claims.
