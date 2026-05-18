# Exploration: signed-horizon-tsl-v2

## Current State

`HorizonAoNode` is a Three TSL `TempNode<'float'>` with a `RedFormat` render target, `passTexture(...)` graph output, and a plain texture sampling path for denoise. The raw kernel samples depth/normal, builds slice frames, marches paired horizons, and resolves a scalar accessibility value.

The CPU reference in `horizonAoMath.ts` already defines signed-horizon accessibility over a visible arc and has tests for no-occluder, full-blocker, symmetric two-wall, far-background, and multi-slice intensity cases.

Three `GTAONode` remains the closest architecture reference, but its shader code also uses cosine-horizon intermediates. HorizonAO should use the same integration family while making the contract more auditable.

## Affected Areas

- `packages/horizon-ao/src/horizonAoNode.ts` — raw kernel helper naming and slice resolve.
- `packages/horizon-ao/src/horizonAoMath.ts` — CPU reference helpers and parity helper.
- `packages/horizon-ao/src/horizonAoMath.test.ts` — RED/GREEN math tests.
- `apps/demo/e2e/scene-routes.spec.ts` — existing scalar debug guard.
- `openspec/horizonao-current-shape-roadmap.md` — active change state.

## Approaches

1. **Terminology-first TSL alignment**
   - Pros: low risk, preserves visuals, makes next math swap safer.
   - Cons: does not radically change output quality.
   - Effort: Medium.

2. **Direct analytic TSL rewrite**
   - Pros: more complete math rewrite now.
   - Cons: high risk in TSL typings/runtime, likely visual regression without deeper fixtures.
   - Effort: High.

3. **Defer TSL and only expand CPU tests**
   - Pros: safest.
   - Cons: does not satisfy the port request.
   - Effort: Low.

## Recommendation

Use terminology-first TSL alignment plus a CPU parity helper for the current cos-horizon resolve. This makes the shader auditable against the signed-horizon contract without hiding regressions behind aesthetic tuning.

## Risks

- TSL lacks clean type coverage, so `@ts-nocheck` stays isolated.
- Local E2E remains WebGL fallback smoke, not true WebGPU validation.
- Current visual quality may remain weak even if math is clearer.

## Ready for Proposal

Yes. Use openspec artifacts and strict TDD.
