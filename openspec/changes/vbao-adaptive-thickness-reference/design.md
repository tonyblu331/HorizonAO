# Design: VBAO Adaptive Thickness Reference

## Technical Approach

Add a reference-only adaptive thickness model beside the existing constant
thickness path. The existing `sampleBlockerInterval` and `buildSampleMask`
remain unchanged for current tests. New helpers estimate a thickness for a
sample from a same-surface run, then feed that estimate into the existing mask
logic.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| First implementation layer | `vbaoReference.ts` only | Direct TSL shader change | Strict TDD needs scalar behavior before shader port |
| Public API | No public knobs | Add `minThickness`, `maxThickness`, `adaptiveThickness` options | Evidence has not justified a public API yet |
| Continuity signal | View-space position plus optional normal | Depth only | Normal/depth discontinuities are the main gap-preservation signal |
| Stochastic jitter | Deferred | Add jitter immediately | Jitter can hide failures; reference model must be deterministic first |

## Proposed Reference Model

Inputs:

```ts
interface AdaptiveThicknessSample {
  readonly position: Vec3
  readonly normal?: Vec3
  readonly valid?: boolean
}

interface AdaptiveThicknessOptions {
  readonly minThickness: number
  readonly maxThickness: number
  readonly thicknessScale: number
  readonly continuityDepthTolerance: number
  readonly continuityNormalDot: number
}
```

Continuity:

```txt
sameSurface(a, b) =
  a.valid && b.valid
  && abs(depthAlongView(a) - depthAlongView(b)) <= continuityDepthTolerance
  && (normal missing || dot(n_a, n_b) >= continuityNormalDot)
```

Estimate:

```txt
runSpan = max(depthAlongView(run)) - min(depthAlongView(run))
thickness = clamp(
  minThickness + runSpan * thicknessScale,
  minThickness,
  maxThickness
)
```

The exact helper names can adjust to the existing reference style during
implementation, but the behavior must remain covered by tests.

## Testing Strategy

Strict TDD is active.

| Layer | What to Test | Approach |
| --- | --- | --- |
| Unit | Same-surface classification | Vitest RED before helper implementation |
| Unit | Isolated thin occluder | Estimate clamps near minimum and mask stays narrow |
| Unit | Continuous thick wall | Estimate grows and mask widens |
| Unit | Gap behind object | Discontinuity breaks the run and preserves narrow mask |

## Migration / Rollout

No migration. No package API changes. No shader changes. Later TSL work must
cite these reference tests and preserve existing constant-thickness behavior.

## Open Questions

| Question | Default for this change |
| --- | --- |
| Should normals be mandatory for continuity? | No; use them when supplied |
| Should depth tolerance be screen-space or view-space? | View-space reference first |
| Should jitter be included? | No; defer to a later evidence-gated change |
