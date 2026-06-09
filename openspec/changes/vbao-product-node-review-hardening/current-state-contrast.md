# Current-State Contrast: Product Node Review

## Summary

The pasted review is directionally right about product discipline, but it is not
equally current on every point. Some claims are already addressed by existing
SDDs. The strongest unresolved issue is the contradiction between all product
presets defaulting to half-resolution and evidence that says half-resolution is
not promoted.

## Contrast Table

| Review claim | Current repo state | Verdict |
| --- | --- | --- |
| Product API is compact: `VBAONode` plus `vbao()`. | `packages/horizon-ao/src/index.ts` is tested not to export private pass classes. | Keep. |
| Raw kernel direction is credible. | Root spec requires 32-sector bitmask VBAO, required normals, cosine-weighted reduction, and no depth-derived normal fallback. | Keep; kernel changes stay fixture-gated. |
| All presets are half-resolution and may be too aggressive. | `packages/horizon-ao/src/vbaoConstants.ts` sets `performance`, `balanced`, `quality`, and `ultra` to `resolutionScale: 0.5`; `EVIDENCE.md` says half-res remains unpromoted and labels it with `noise,false-curvature,scale-mismatch`. | Open contradiction; highest-priority policy gate. |
| `VBAOResolvePolishNode.ts` is evidence-only runtime bloat. | The file exists in `src`, is hidden from public exports, and benchmark/source tests intentionally use it as an evidence-only fused candidate. Existing evidence rejects fusion unless new data appears. | Open boundary question, not a product feature. Either quarantine more explicitly or justify keeping private source. |
| `VBAOEffectPass` is only partially used. | `VBAOFullResPolishNode`, `VBAOResolvePolishNode`, and `VBAOVelocityTemporalNode` extend it; `VBAOResolveNode` and `VBAOHalfResCleanupNode` remain standalone. | Open cleanup candidate; behavior-neutral only. |
| Module-global renderer state remains in several passes. | `VBAONode.ts`, `VBAOResolveNode.ts`, and `VBAOHalfResCleanupNode.ts` use module-level renderer state; `VBAOEffectPass` already owns per-instance state. | Open audit task; files are named in `runtime-boundary-audit.md`. |
| Hidden benchmark and temporal options are creeping into runtime. | `VBAONode` has internal `benchmark?.noiseTexture` and `temporalMode?: 'host' | 'velocity-internal'`; specs forbid public benchmark/diagnostic options. Temporal remains private and rejected for promotion. | Open boundary task; keep private unless evidence justifies promotion. |
| `GT-VBAO++` wording overclaims. | `VBAONode.ts` still contains `// GT-VBAO++ axial slice orientation...`. | Open cleanup. |
| Runtime theta constants and exact popcount comments may be reference-only or over-specific. | `vbaoConstants.ts` exports `VBAO_THETA_*` and contains exact `countOneBits()` cycle/ALU wording; current runtime usage needs import audit before moving or softening. | Open audit task. |
| Resolve/polish fusion should be next. | Evidence reports fused resolve-polish was slower at high softness and must not become public without new evidence. | Rejected for now. |
| Temporal should become public later. | Existing temporal SDDs and evidence keep temporal private/rejected. | Rejected for this SDD. |

## Reconciled Direction

This SDD should not chase every review bullet. The correct order is:

1. Reconcile preset policy with half-resolution evidence.
2. Clean runtime/debug boundaries without changing public API.
3. Normalize internal pass ownership if source audit proves it is safe.
4. Remove overclaiming comments and unused runtime constants.
5. Leave temporal and fused resolve/polish closed until separate evidence gates
   prove they deserve reopening.
