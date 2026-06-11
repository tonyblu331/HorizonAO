# Metaprompt: VBAO Product Node Review Hardening

You are working in `G:\RWY37\horizon-ao` on the
`vbao-product-node-review-hardening` SDD.

## Goal

Turn the pasted product-node review into executable SDD work without
reintroducing stale tasks or shipping runtime behavior changes from planning.

## Current Verified Facts

- `packages/horizon-ao/src/vbaoConstants.ts` defaults `performance` to
  `resolutionScale: 0.5`, `balanced` to `0.75`, and `quality` / `ultra` to
  `1.0`.
- `EVIDENCE.md` currently says half-resolution remains demoted/not promoted and
  records `noise,false-curvature,scale-mismatch` labels for product-preset
  half-res rows.
- `VBAOResolvePolishNode.ts` no longer exists in active
  `packages/horizon-ao/src`; fused resolve/polish remains rejected unless a
  fresh evidence gate reopens it.
- `VBAOEffectPass` exists, but `VBAOResolveNode` and
  `VBAOHalfResCleanupNode` still own standalone fullscreen-pass state.
- `VBAONode.ts`, `VBAOResolveNode.ts`, and `VBAOHalfResCleanupNode.ts` use
  module-level renderer state; `VBAOEffectPass` uses per-instance state.
- `VBAO_THETA_*` constants are retained as a shared source/reference contract;
  exact `countOneBits` performance wording has been softened.

## Instructions

1. Start from `current-state-contrast.md`, `sdd-plan.md`, `tasks.md`, and this
   metaprompt.
2. Do not run production build commands.
3. Do not promote temporal, benchmark, denoise, resolve, polish, or velocity
   APIs.
4. Do not change the VBAO kernel formula in this SDD.
5. Treat half-resolution promotion as blocked unless current evidence reverses
   it; do not regress product defaults back to all-half-resolution.
6. Runtime changes must be small, source-backed, and followed by targeted tests.

## First Implementation Target

Phase 2 is source-resolved; keep it verified before touching cleanup:

- Product defaults are honest in current source.
- Source tests pin the chosen policy.
- Evidence notes must keep explicit half-resolution rows separate from product
  default claims.

Runtime boundary cleanup and comment/constant hygiene are source-resolved for
this SDD. Next proceed to pass ownership work.
