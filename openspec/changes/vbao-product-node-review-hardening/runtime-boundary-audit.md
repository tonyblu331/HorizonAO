# Runtime Boundary Audit

## VBAOResolvePolishNode

`packages/horizon-ao/src/VBAOResolvePolishNode.ts` is not public API, but it is
still runtime source:

- source tests import it as raw text;
- `apps/demo/src/scenes/MuseumScene.tsx` imports it directly for evidence-only
  fused resolve/polish capture;
- `packages/horizon-ao/src/index.ts` is tested not to export it.

Acceptable end states for this SDD:

1. Move the fused candidate behind a clearer evidence/debug boundary and update
   demo imports.
2. Keep it in `src` only if tests explicitly prove it is private, evidence-only,
   and not part of product output.
3. Delete/archive it if no current evidence command needs it.

Do not promote it to public API.

## Renderer State Ownership

The review concern is source-backed:

- `packages/horizon-ao/src/VBAONode.ts` uses module-level `rendererState`.
- `packages/horizon-ao/src/VBAOResolveNode.ts` uses module-level
  `resolveRendererState`.
- `packages/horizon-ao/src/VBAOHalfResCleanupNode.ts` uses module-level
  `halfResCleanupRendererState`.
- `packages/horizon-ao/src/VBAOEffectPass.ts` stores renderer state per
  instance.

The next implementation patch should audit whether these states can become
per-instance without changing pass labels, output, or evidence capture.
