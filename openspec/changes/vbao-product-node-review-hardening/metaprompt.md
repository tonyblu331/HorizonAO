# Metaprompt: VBAO Product Node Review Hardening

You are working in `G:\RWY37\horizon-ao` on the
`vbao-product-node-review-hardening` SDD.

## Goal

Turn the pasted product-node review into executable SDD work without
reintroducing stale tasks or shipping runtime behavior changes from planning.

## Current Verified Facts

- `packages/horizon-ao/src/vbaoConstants.ts` defaults all quality tiers to
  `resolutionScale: 0.5`.
- `EVIDENCE.md` currently says half-resolution remains demoted/not promoted and
  records `noise,false-curvature,scale-mismatch` labels for product-preset
  half-res rows.
- `VBAOResolvePolishNode.ts` is private from `src/index.ts` but is imported by
  `apps/demo/src/scenes/MuseumScene.tsx` for evidence-only fused
  resolve/polish capture.
- `VBAOEffectPass` exists, but `VBAOResolveNode` and
  `VBAOHalfResCleanupNode` still own standalone fullscreen-pass state.
- `VBAONode.ts`, `VBAOResolveNode.ts`, and `VBAOHalfResCleanupNode.ts` use
  module-level renderer state; `VBAOEffectPass` uses per-instance state.
- Runtime source still contains `GT-VBAO++` wording and exact `countOneBits`
  performance claims that need audit before product hardening.

## Instructions

1. Start from `current-state-contrast.md`, `sdd-plan.md`, `tasks.md`, and this
   metaprompt.
2. Do not run production build commands.
3. Do not promote temporal, benchmark, denoise, resolve, polish, or velocity
   APIs.
4. Do not change the VBAO kernel formula in this SDD.
5. Treat half-resolution default policy as the first blocking contradiction.
6. Runtime changes must be small, source-backed, and followed by targeted tests.

## First Implementation Target

Resolve Phase 2 before touching cleanup:

- If evidence still says half-res fails, make product defaults honest.
- Update source tests to pin the chosen policy.
- Update evidence notes so no release-candidate claim says half-res is promoted.

Only after that, proceed to runtime boundary cleanup and pass ownership work.
