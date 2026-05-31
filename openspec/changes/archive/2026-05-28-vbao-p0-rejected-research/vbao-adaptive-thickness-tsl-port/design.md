# Design: VBAO Adaptive Thickness TSL Port

## Decision

`VBAONode` SHALL estimate a local blocker thickness per depth sample by scanning the same marched slice side and finding the contiguous same-surface run that contains the current sample index.

The scan intentionally mirrors the scalar reference:

1. Reconstruct each candidate sample only if its UV is inside the viewport and its depth is not background.
2. Compare adjacent candidates using:
   - depth delta along the shaded pixel view direction;
   - view-space normal dot product.
3. Track the contiguous same-surface segment containing the current sample.
4. Convert that segment's view-depth span into:

   `adaptiveThickness = clamp(minThickness + span * scale, minThickness, maxThickness)`

5. Use `samplePos - sampleViewDir * adaptiveThickness` as the blocker back face.

## Internal Constants

No public option is added. The first port uses constants already covered by the scalar reference tests:

- `minThickness = 0.02`
- `thicknessScale = 10`
- `continuityDepthTolerance = 0.08`
- `continuityNormalDot = 0.95`
- `maxThickness = this.thickness`

`this.thickness` remains public because it already exists. Its shader role becomes the maximum adaptive-thickness cap, which preserves compatibility with existing presets while removing the constant-thickness over-occlusion path from production.

## Why The O(samples^2) Scan Is Accepted For This Batch

The first TSL port is correctness-first and evidence-gated. It resamples the slice run inside each sample contribution because TSL does not expose a simple temporary array for all marched samples. Sampling backtests and performance work are separate changes; they must measure whether this estimator needs a cheaper approximation before claiming a Pareto win.

## Invariants

- The mask remains 32 sectors.
- `maskRange` remains count-clamped.
- Background depth contributes no sector bits.
- Back-face offset remains sample-local: `Q - adaptiveThickness * normalize(-Q)`.
- Reduction remains cosine-weighted accessibility: `1 = open`, `0 = blocked`.
- No temporal/frame input participates in the estimator.

## Risks

- The nested scan increases kernel cost. Benchmark rows must decide whether a cheaper approximation is needed.
- `this.thickness` changing from constant thickness to maximum thickness is a behavioral change, but not an API-surface change. Evidence must compare constant reference vs adaptive output before performance claims.
