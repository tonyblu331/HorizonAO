# Demo Evidence Boundary Audit

## Current State

`aoPipelines.ts` already exists and is used by multiple demo scenes. That means
the pasted review's broad "extract aoPipelines" item is mostly stale.

However, `MuseumScene.tsx` still owns bespoke evidence wiring for benchmark
modes, resolve-polish candidate selection, and product/raw route decisions. That
remaining coupling is real, but it should be reduced carefully because Museum is
the evidence scene.

## Findings

- General AO pipeline creation has already moved to `apps/demo/src/scenes/aoPipelines.ts`.
- `VbaoLabScene.tsx`, `VbaoScene.tsx`, and `vbaoGltfScene.ts` already import
  `createAoPipelines`.
- `MuseumScene.tsx` still contains custom VBAO benchmark pipeline logic because
  it exposes evidence-only states such as fused resolve-polish mode.

## Decision

Do not perform a broad Museum extraction in this roadmap. Treat the remaining
work as a future behavior-neutral extraction:

- keep evidence-only switches explicit;
- extract only small construction helpers that do not change benchmark rows;
- verify source contracts and benchmark captures after each extraction.

## Next Candidate Extraction

Move Museum's VBAO evidence pipeline selection into a small module only after
the current kernel/bilateral gates are settled. The module should preserve the
same product/raw/fused route strings so existing source contracts remain stable.
