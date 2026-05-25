# Proposal: VBAO Adaptive Thickness Reference

## Intent

Prototype adaptive blocker thickness in the scalar VBAO reference before any TSL
kernel or public API changes. The goal is to prove whether same-surface run
continuity can reduce muddy broad occlusion and thin-gap artifacts caused by a
single global thickness value.

## Scope

### In Scope

- Add scalar reference helpers for same-surface run detection.
- Add scalar reference tests for isolated thin occluders, continuous thick
  walls, and gaps behind objects.
- Add an adaptive thickness estimate that clamps to internal defaults.
- Keep the prototype deterministic and CPU-only.
- Document how this reference work gates a later TSL port.

### Out of Scope

- No `VBAONode` shader/kernel changes.
- No public `VBAONodeOptions` changes.
- No denoise, temporal filtering, depth hierarchy, or visibility-bucket
  lighting.
- No render-target format changes.

## Capabilities

### Modified Capabilities

- `vbao-node`: Adds reference-only adaptive-thickness requirements that gate
  future shader work.

## Approach

Implement the smallest useful scalar model:

1. Identify consecutive samples that belong to the same apparent surface.
2. Estimate the run's view-space depth span along the sample view direction.
3. Convert that span to a blocker thickness using internal clamp defaults.
4. Feed the estimated thickness into the existing sample mask interval logic.

The reference module remains the proof oracle. TSL work starts only after these
tests describe the intended behavior.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `packages/horizon-ao/src/vbaoReference.ts` | Modified | Add reference-only adaptive thickness helpers |
| `packages/horizon-ao/src/__tests__/vbaoReference.test.ts` | Modified | Add RED/GREEN scalar behavior tests |
| `openspec/changes/vbao-adaptive-thickness-reference/*` | Created | Proposal, delta spec, design, tasks |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Adaptive logic becomes a tuning grab bag | Medium | Keep it reference-only with named clamps and tests |
| Same-surface heuristic misclassifies gaps | Medium | Add gap-behind-object tests before implementation |
| Shader port diverges from reference | Medium | Do not port until reference behavior is locked |

## Rollback Plan

Revert this change folder and the reference/test helper additions. No public API
or shader path is touched.

## Success Criteria

- [ ] Reference tests cover thin isolated occluder, continuous thick wall, and
  gap-behind-object cases.
- [ ] Adaptive thickness is clamped to internal defaults.
- [ ] Constant-thickness behavior remains available for existing parity tests.
- [ ] No `VBAONodeOptions`, quality-tier, shader, or render-target change lands.
