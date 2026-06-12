# Current-State Contrast: Product Node Review

## Summary

The pasted review is directionally right about product discipline, but it is not
equally current on every point. Some claims are already addressed by existing
SDDs. The prior contradiction between all product presets defaulting to
half-resolution and evidence saying half-resolution was not promoted is resolved
in current source: only `performance` remains half-resolution by default.

## Contrast Table

| Review claim | Current repo state | Verdict |
| --- | --- | --- |
| Product API is compact: `VBAONode` plus `vbao()`. | `packages/horizon-ao/src/index.ts` is tested not to export private pass classes. | Keep. |
| Raw kernel direction is credible. | Root spec requires 32-sector bitmask VBAO, required normals, cosine-weighted reduction, and no depth-derived normal fallback. | Keep; kernel changes stay fixture-gated. |
| All presets are half-resolution and may be too aggressive. | Current `packages/horizon-ao/src/vbaoConstants.ts` sets `performance` to `0.5`, `balanced` to `0.75`, and `quality` / `ultra` to `1.0`; source tests pin this table. `EVIDENCE.md` still says explicit half-res rows are not promoted. | Resolved for defaults; keep half-res promotion blocked for explicit evidence rows. |
| `VBAOResolvePolishNode.ts` is evidence-only runtime bloat. | The file no longer exists in active `packages/horizon-ao/src`, and `src/index.ts` exports only `VBAONode`, `vbao`, and public option types. Existing evidence still rejects fusion unless new data appears. | Resolved by removal from active runtime source; do not reintroduce without a fresh evidence gate. |
| `VBAOEffectPass` is only partially used. | `VBAOFullResPolishNode`, `VBAOResolvePolishNode`, and `VBAOVelocityTemporalNode` extend it; `VBAOResolveNode` and `VBAOHalfResCleanupNode` remain standalone. | Open cleanup candidate; behavior-neutral only. |
| Module-global renderer state remains in several passes. | `VBAONode.ts`, `VBAOResolveNode.ts`, and `VBAOHalfResCleanupNode.ts` use module-level renderer state; `VBAOEffectPass` already owns per-instance state. | Open audit task; files are named in `runtime-boundary-audit.md`. |
| Hidden benchmark and temporal options are creeping into runtime. | `VBAONode` has internal `benchmark?.noiseTexture` and `temporalMode?: 'host' | 'velocity-internal'`, but `VBAONodeOptions` and package exports do not expose them; `velocity-internal` is mapped out of product behavior. | Resolved as private/demo-internal evidence boundary; keep tests guarding public leakage. |
| `GT-VBAO++` wording overclaims. | `VBAONode.ts` now uses descriptive axial slice wording instead of `GT-VBAO++` branding. | Resolved cleanup. |
| Runtime theta constants and exact popcount comments may be reference-only or over-specific. | `VBAO_THETA_*` constants are imported by reference math and sector-table tests; exact `countOneBits()` cycle/ALU wording has been softened. | Retain theta constants as shared source/reference contract for now; exact performance wording resolved. |
| Resolve/polish fusion should be next. | Evidence reports fused resolve-polish was slower at high softness and must not become public without new evidence. | Rejected for now. |
| Temporal should become public later. | Existing temporal SDDs and evidence keep temporal private/rejected. | Rejected for this SDD. |
| FAST-like noise should replace the default. | The pasted review rates FAST-like highly, but later committed `EVIDENCE.md` keeps `phase-atlas-stable-hash` and rejects FAST-like/STBN candidates from the 2026-06-04 gate. | Rejected until a newer evidence gate reverses that decision. |
| `historyWeight`, `maxVelocityUv`, and `depthThreshold` are underived prototype constants. | `packages/horizon-ao/src/VBAOVelocityTemporalNode.ts` still contains those defaults, but temporal promotion is blocked and public options do not expose them. | Keep as temporal follow-up only; do not mix into spatial default policy. |

## Reconciled Direction

This SDD should not chase every review bullet. The correct order is:

1. Keep preset policy reconciled with half-resolution evidence.
2. Clean runtime/debug boundaries without changing public API.
3. Normalize internal pass ownership if source audit proves it is safe.
4. Remove overclaiming comments and unused runtime constants.
5. Leave temporal and fused resolve/polish closed until separate evidence gates
   prove they deserve reopening.
6. Treat pasted competitor numbers as review pressure unless reproduced by
   committed evidence from the current harness.
