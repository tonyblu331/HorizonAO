# Metaprompt: VBAO Pass Topology Audit

You are working in `G:\RWY37\horizon-ao` on the VBAO pass topology audit.

## Objective

Execute the audit phases without changing runtime topology until evidence proves
the change is worth it. The goal is not fewer files by vibes; the goal is a
measured decision about pass count, target lifetime, duplicated pass plumbing,
and safe refactor boundaries.

## Current Contracts

- `VBAOTemporalAccumulationNode` is absent from runtime source and exports.
- No public `temporal`, `denoiseStrength`, velocity, or public denoise option is
  allowed from this SDD.
- `VBAONode` is the public product boundary.
- `VBAOHalfResCleanupNode`, `VBAOResolveNode`, and
  `VBAOFullResPolishNode` are private/internal reconstruction passes.
- Shared bilateral geometry weighting already exists in
  `vbaoBilateralWeight.ts`.
- `rawModules.d.ts` is ambient type plumbing, not effect architecture bloat.
- Production build commands are forbidden unless explicitly requested.

## Execution Rules

1. Follow `tasks.md` phase order.
2. For each phase, do RED or confirmation before GREEN.
3. Do not combine file moves with behavior changes.
4. Do not delete or fuse passes before baseline timings, screenshots, quality
   metrics, and failure labels exist.
5. Treat skipped pass rows as elided work, never zero-cost work.
6. If a topology candidate loses, archive the measured reason instead of
   silently deleting the experiment.

## First Valid Slice

Start with Phase 1:

- confirm pass-timing contract coverage;
- record render-target inventory;
- capture or document blockers for pinned-camera baseline evidence.

Only after that should Phase 2 boilerplate extraction be considered.

## Verification

Use the smallest relevant checks:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check
```

Run benchmark/evidence scripts only for the phase that requires them.
