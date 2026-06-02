# SDD Plan: VBAO Pass Topology Audit

## Current State

The pasted refactor proposal correctly pressures the current VBAO graph on pass
count, render-target churn, and duplicated pass boilerplate. It is not directly
actionable as written because it assumes runtime temporal accumulation exists in
`@horizonao/core`.

Verified repo state:

- `VBAOTemporalAccumulationNode` is absent from runtime source and public
  exports by source-contract test.
- The public product boundary remains `VBAONode`, with cleanup, resolve, and
  polish as private/internal reconstruction passes.
- `VBAOHalfResCleanupNode`, `VBAOResolveNode`, and
  `VBAOFullResPolishNode` are intentionally temporal-free.
- `ADR-007` currently keeps cleanup/resolve/polish split so hidden
  axis-aligned blur cannot sneak back into resolve.
- Existing gates require screenshots and GPU timings for passes that ship.

## Contrast Against Pasted Proposals

Three pasted reviews were evaluated:

- a narrow refactor proposal that deletes half-res cleanup, extracts a base pass,
  and merges temporal/spatial polish;
- a broader implementation evaluation that praises the VBAO kernel but recommends
  default temporal, public denoise controls, and more aggressive pass trimming.
- a file-consolidation proposal that merges core math/noise/constants, replaces
  cleanup/resolve/polish with one filter node, and keeps a lean temporal node.

### Accept

- The repo does have repeated `TempNode` pass plumbing: render target setup,
  `QuadMesh`, `NodeMaterial`, `updateBefore`, sizing, and dispose behavior.
- A shared internal pass base may reduce code size if it preserves generated
  shader shape, render-target format, pass timing labels, and source-contract
  coverage.
- Pass count is a valid performance concern. Removing a full-screen pass or
  render target is worth testing.
- Half-res cleanup may be redundant in some configurations. That is a hypothesis
  worth measuring against edge bleed, thin gaps, haloing, and noise.
- The broader evaluation correctly identifies the 32-sector visibility bitmask,
  fixed quality tier loop shapes, phase-atlas sampling, JBU resolve, and
  bilateral geometry-aware cleanup/polish as the current production shape.
- Raw-kernel cost is a legitimate concern. Per-sample view-position
  reconstruction, depth/normal sampling, normalization, and noise lookup should
  be measured before adding more passes.
- Ground-truth/reference comparison remains valuable, but it must use the
  existing reference tests and evidence scripts rather than new product knobs.
- File count can be improved if the change preserves behavioral boundaries.
  `vbaoConstants.ts`, `vbaoSampling.ts`, and `vbaoNoise.ts` are related enough to
  review together, but a merge is only useful if it makes ownership clearer.

### Reject As Written

- Do not create `VBAODenoiseNode` by merging temporal and spatial polish. Runtime
  temporal accumulation is deliberately absent and currently blocked from
  promotion.
- Do not delete `VBAOHalfResCleanupNode.ts` immediately. `ADR-007` documents why
  cleanup remains separate from JBU resolve, and the source-contract tests assert
  the current internal topology.
- Do not claim a 40% line-count reduction or GPU win until pass-level timings and
  visual regressions prove it.
- Do not frame this as GTAO temporal denoise architecture. The active product is
  Visibility Bitmask AO with selected GT-VBAO corrections.
- Do not say `VBAOTemporalAccumulationNode` exists. Source-contract tests require
  it to stay absent from runtime internals and exports.
- Do not enable temporal by default. Public `VBAONodeOptions` has no `temporal`
  key, and the benchmark only accepts `off` or host phase animation; AO-owned
  internal temporal is rejected pending a velocity-backed proposal.
- Do not add `denoiseStrength` or public denoise controls. Current public
  controls are `softness`, `quality`, `radius`, `thickness`, `strength`,
  `contrast`, `slices`, `samples`, and `resolutionScale`.
- Do not assume the package owns velocity, previous depth, previous normal, or
  renderer G-buffer history. `@horizonao/core` is a node package, not a full
  renderer integration.
- Do not call the current product "shippable today" in docs without preserving
  the repo's evidence language. Product claims must cite committed screenshots,
  pass timings, and reference gates.
- Do not treat shared bilateral math as missing. The repo already has
  `vbaoBilateralWeight.ts` exporting `computeVbaoBilateralGeometryWeight`, and
  source-contract tests require resolve, cleanup, and polish to use it.
- Do not keep or slim `VBAOTemporalAccumulationNode`; there is no runtime
  temporal node to slim.
- Do not count `rawModules.d.ts` as effect architecture bloat. It is ambient type
  plumbing, not a render pass.
- Do not merge constants, sampling, noise generation, and bilateral TSL helpers
  into a generic `vbaoCore.ts` just to reduce file count. That risks creating a
  grab-bag module; prove cohesion before moving exports.

### Defer

- Fusing JBU resolve and full-res polish may be valid, but it belongs to a
  topology experiment after baseline timing and failure labels are captured.
- Replacing the three pass classes with `VBAOEffectPass` may be valid, but only
  after a small spike proves TypeScript, TSL setup, render-state restore, and
  source-contract tests stay clean.
- Velocity-aware temporal accumulation is a separate future SDD, not part of
  this pass-topology audit.
- Multi-bounce, bent normals, and directional occlusion are algorithm extensions.
  They should not share a change with cleanup/resolve/polish topology.
- A file-layout cleanup may follow the topology audit, but it should be a pure
  refactor with tests first and no pass behavior changes.

## Decision

Treat the pasted proposal as a performance/topology audit, not an implementation
plan. The first SDD slice is evidence and source-contract work. Runtime
refactors only happen after the current graph has a measured baseline.

## Plan

### Phase 1: Baseline The Current Graph

Goal: know what each pass costs before touching topology.

- Capture pass timings for raw AO, half-res cleanup, JBU resolve, full-res
  polish, and total product output.
- Record render-target inventory: name, format, resolution scale, lifetime, and
  allocation owner.
- Keep AO-only and beauty screenshots for the pinned evidence cameras at
  1920x1080 and 1280x720.
- Preserve failure labels for noise, edge bleed, halo, thin-gap, mud, stripe, and
  scale mismatch.

Acceptance:

- Every candidate pass has timing and visual evidence.
- No pass-removal claim is accepted without a same-scene before/after row.

### Phase 2: Boilerplate Extraction Spike

Goal: reduce duplication without changing output.

- Prototype an internal shared pass base for `RenderTarget`, `QuadMesh`,
  `NodeMaterial`, render-state reset/restore, sizing, and dispose.
- Migrate one pass first, preferably `VBAOFullResPolishNode`, because it is
  already optional and full-resolution.
- Keep pass texture behavior and render-target settings identical.
- Inspect generated shader/source-contract coverage for accidental behavior
  changes.

Acceptance:

- Tests and typecheck pass.
- Screenshots and timings are equivalent within noise.
- The abstraction does not hide pass-specific sizing or timing labels.

### Phase 2b: File Cohesion Audit

Goal: decide whether file consolidation improves ownership rather than hiding
complexity.

- Keep `vbaoBilateralWeight.ts` unless the call sites prove a better home.
- Evaluate whether `vbaoSampling.ts` and `vbaoNoise.ts` should remain split:
  deterministic sampling math is testable without Three texture construction,
  while noise generation owns runtime texture data.
- Keep `vbaoConstants.ts` as the public option/preset boundary unless moving it
  improves package API readability.
- Do not create `vbaoCore.ts` as a miscellaneous bucket.

Acceptance:

- Any file move preserves public exports and source-contract tests.
- No shader or pass behavior changes in the same commit as file movement.
- The resulting module names describe responsibilities, not just categories.

### Phase 3: Half-Res Cleanup Removal Experiment

Goal: test whether JBU resolve makes the half-res cleanup pass redundant.

- Add a private/internal toggle or branch for evidence capture only.
- Compare low-resolution VBAO with cleanup enabled vs. cleanup skipped.
- Test both AO-only and beauty output on the pinned cameras.
- Check thin occluders and depth/normal discontinuities carefully.

Acceptance:

- Cleanup can be removed only if total timing improves and failure labels do not
  regress.
- If cleanup improves thin-gap stability or edge rejection, keep it and document
  why the extra pass earns its cost.

### Phase 4: Resolve/Polish Fusion Experiment

Goal: test whether one full-resolution pass can replace separate JBU resolve and
full-res polish.

- Keep the existing path as the reference.
- Implement a private fused candidate that resolves half-res raw AO and applies
  the 8-tap polish in one pass.
- Do not add temporal history, reprojection, frame indices, or public denoise
  controls.

Acceptance:

- Candidate must improve total timing or reduce target count.
- Candidate must not regress edge bleed, halo, thin-gap, or scale mismatch.
- If fusion makes the shader hard to inspect or weakens the resolve boundary,
  reject it even if line count improves.

### Phase 5: Architecture Decision

Goal: commit only the topology that evidence supports.

Possible outcomes:

- Keep current split passes and only extract safe boilerplate.
- Remove half-res cleanup when skipped cleanup wins.
- Fuse resolve and polish if the fused path wins without regressions.
- Archive the proposal if no candidate beats current behavior.

### Phase 6: Future Work Triage

Goal: prevent unrelated good ideas from sneaking into the topology PR.

- File separate proposals for velocity-backed AO-owned temporal, multi-bounce,
  bent normals, directional occlusion, or public API changes.
- Keep public option simplification out of this SDD unless the topology evidence
  proves a current option has become meaningless.
- Keep advanced-node export discussion closed; cleanup, resolve, and polish stay
  internal unless a separate API proposal proves otherwise.

Acceptance:

- This change exits with either a measured topology adjustment or a documented
  rejection.
- No temporal, denoise, or algorithm-extension work lands under the topology
  audit label.

## Verification

Run targeted checks only; production build remains out of scope unless explicitly
requested.

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
pnpm --filter @horizonao/demo benchmark:ao
git diff --check
```

## Guardrails

- No public temporal API.
- No `VBAOTemporalAccumulationNode` reintroduction.
- No production denoise naming unless a denoise ADR/spec exists.
- No `temporal`, `denoiseStrength`, or velocity option in public
  `VBAONodeOptions` from this SDD.
- No pass deletion based on architectural taste alone.
- No README/product claim until screenshots and GPU timings are committed to
  `EVIDENCE.md`.
