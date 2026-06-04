# Source Shape Audit: Receiver Visibility Solver

## Purpose

Identify the code refactors needed to make HorizonAO read as a receiver
visibility solver without changing shader math or public API.

This is the guardrail before runtime edits. Refactoring names and ownership
first is useful only if it prevents the old post-effect model from driving the
next implementation.

## Current Runtime Shape

| File | Current role | Receiver-solver reading |
| --- | --- | --- |
| `packages/horizon-ao/src/VBAONode.ts` | Public node, raw AO render target, raw kernel, product graph assembly | Receiver estimate owner and scalar product integrator |
| `packages/horizon-ao/src/VBAOHalfResCleanupNode.ts` | Half-resolution cleanup pass | Low-resolution receiver-state reconstruction |
| `packages/horizon-ao/src/VBAOResolveNode.ts` | JBU resolve/upsample | Full-resolution compatible receiver reconstruction |
| `packages/horizon-ao/src/VBAOFullResPolishNode.ts` | Rotated full-resolution polish | Final scalar receiver reconstruction |
| `packages/horizon-ao/src/VBAOVelocityTemporalNode.ts` | Private temporal candidate | Receiver-state reuse candidate |
| `packages/horizon-ao/src/VBAOEffectPass.ts` | Shared fullscreen pass boilerplate | Reconstruction/reuse pass host |
| `packages/horizon-ao/src/vbaoConstants.ts` | Public options and internal constants | Receiver estimate policy constants |
| `packages/horizon-ao/src/vbaoSampling.ts` | Phase atlas and sampling policy | Receiver estimate sampling policy |

## Refactor Candidates

### R1: Rename Private Graph Concepts

Replace private vocabulary that implies anonymous texture processing with
receiver-state vocabulary.

Candidate changes:

- `renderTarget` in `VBAONode.ts` can become `rawEstimateTarget`.
- `textureNode` in `VBAONode.ts` can become `rawEstimateTextureNode`.
- `outputTextureNode` can become `productAoTextureNode`.
- `outputGraphKey` can become `receiverProductGraphKey`.
- `outputGraphCreated` can become `receiverProductGraphCreated`.

Why:

The product node should read as "estimate then integrate product AO", not "make
a render target then output texture."

Risk:

Source tests may assert names or generated shader labels indirectly. Keep render
target texture names like `VBAO.Raw` stable unless evidence tooling is updated.

### R2: Keep Raw Kernel In Place For Now

Do not extract the raw shader loop yet.

Why:

The raw loop is performance-sensitive and heavily pinned by source/generator
tests. A premature `vbaoReceiverEstimate.ts` helper can make the shader harder
to inspect without reducing real duplication.

Replace only after:

- source tests become simpler;
- generated shader inspection remains clear;
- helper boundary removes repeated receiver reconstruction code or metadata
  wiring.

### R3: Treat Reconstruction Passes As Receiver Reconstruction

Keep class names stable for now, but update comments/docs/tests to describe:

- cleanup as low-resolution receiver-state cleanup;
- resolve as compatible receiver reconstruction;
- polish as final scalar receiver reconstruction.

Why:

Renaming files now would cause churn across imports, benchmarks, and evidence.
Conceptual ownership can change before file names do.

### R4: Metadata Lands Behind A Receiver-State Boundary

Do not sprinkle confidence terms through each pass as loose uniforms.

Target shape when confidence lands:

```text
raw receiver state texture
  R = AO
  G = confidence/support

reconstruction passes
  consume receiver state
  preserve scalar product output
```

Why:

Confidence is not a denoise knob. It is receiver trust metadata. If it enters as
one more polish strength scalar, the architecture regresses.

### R5: Temporal Remains A Reuse Node

Do not move velocity-backed temporal into `VBAONode.ts`.

Why:

Receiver reuse has different ownership than receiver estimation. It needs host
velocity, previous guides, AO history, reset, diagnostics, and evidence matrix.
Putting that in the estimator makes `VBAONode.ts` the coordinator for unrelated
lifetimes.

### R6: Benchmark Hooks Need Evidence Boundaries

Private benchmark options in source should be classified:

- product construction policy;
- evidence-only injection;
- private candidate route.

Why:

The old model let research gates and runtime shape blur together. Receiver
solver architecture needs candidate lanes that cannot be mistaken for public
product surface.

## Refactor Order

1. Update source comments and tests to receiver terminology where behavior is
   already stable.
2. Rename private `VBAONode.ts` fields only when tests confirm no evidence label
   churn.
3. Add receiver-state helper types only when confidence/support metadata lands.
4. Revisit file names only after imports and benchmark labels no longer depend
   on old pass nouns.

## Non-Refactors

- Do not rename public `VBAONode`.
- Do not rename `getTextureNode()` or `getRawTextureNode()`.
- Do not rename render target texture names used by evidence unless the evidence
  scripts are updated in the same change.
- Do not extract raw shader math before a failing maintainability or metadata
  gate proves the boundary.
- Do not move temporal into `VBAONode.ts`.

## Verification For The First Runtime Refactor

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
git diff --check -- packages/horizon-ao/src openspec/changes/vbao-receiver-visibility-solver
```
