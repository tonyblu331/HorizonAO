# Runtime Boundary Audit

## Fused Resolve/Polish Candidate

`packages/horizon-ao/src/VBAOResolvePolishNode.ts` is no longer active runtime
source. Current source audit found no file at that path and no package export for
that candidate.

Resolved end state for this SDD: deleted/removed from active runtime source.
Future fused resolve/polish work must reopen through a fresh evidence gate; it
must not reappear as public API or as an unlabelled product path.

## Private Benchmark And Temporal Options

Current source keeps benchmark and temporal controls private:

- `packages/horizon-ao/src/index.ts` exports only `VBAONode`, `vbao`, and public
  option types.
- `VBAONodeOptions` does not expose `benchmark`, `noiseTexture`,
  `temporalMode`, `historyWeight`, velocity, or denoise controls.
- `VBAONode.ts` has an internal-only `VbaoInternalBenchmarkOptions` type for
  demo/evidence noise texture injection and host temporal phase mode.
- `resolveInternalTemporalMode` maps unsupported internal temporal requests,
  including `velocity-internal`, back to product `off`.
- `apps/demo/src/scenes/MuseumScene.tsx` and benchmark scripts may carry
  `velocity-internal` labels for rejected/private evidence rows, but those do
  not cross the package export boundary.

Resolved end state for this SDD: retain benchmark/temporal evidence hooks as
private/demo-internal only, with package tests guarding public option leakage.

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
