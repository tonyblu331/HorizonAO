# Design: VBAO Ground-Truth Quality Oracle

## Reference Shape

The first oracle is intentionally small and deterministic:

- Fibonacci hemisphere rays around a supplied normal.
- Caller-provided `occludes(direction, index)` predicate.
- Accessibility = open ray count / ray count.
- Quality = `1 - abs(actual - expected)`, clamped to `[0, 1]`.

This is not a path tracer. It is the minimum reference layer needed to make
future claims falsifiable.

## Failure Labels

The classifier maps measured errors to the existing evidence labels:

- `noise` from structured variance.
- `scale-mismatch` from high absolute error.
- `false-curvature` from stair-step / quantized-depth error.
- Optional slots for `mud`, `halo`, `thin-gap`, and `edge-bleed`.

## Integration

The oracle lives in `packages/horizon-ao/src/vbaoGroundTruth.ts` and is imported
only by tests or future internal benchmark tools. `index.ts` remains unchanged.
The fixture matrix lives in `packages/horizon-ao/src/vbaoOracleFixtures.ts` and
is also internal-only.

Candidate filters are also evaluated against the oracle before promotion:

```text
rawScore = 1 - abs(raw - expected)
candidateScore = 1 - abs(candidate - expected)
accept only if candidateScore does not regress and no failure labels appear
```

This prevents a smoother filtered image from being accepted when it is actually
more wrong, muddier, or bleeding across edges.

The first fixture matrix covers:

- Flat plane / fully open hemisphere.
- Full hemisphere occlusion.
- Two-wall corner.
- Thin vertical occluder.
- Stair-step / false-curvature negative control.
- Museum-like mixed-scale fixture.

## Acceptance

- Fully open fixture returns accessibility `1`.
- Fully blocked fixture returns accessibility `0`.
- Quality scoring is deterministic and normalized.
- False curvature is labeled separately from ordinary noise.
- Filter candidates can be accepted/rejected from raw-vs-candidate oracle score
  and failure labels.
- The fixture matrix emits deterministic accessibility rows and keeps the
  stair-step row as a rejecting negative control.
