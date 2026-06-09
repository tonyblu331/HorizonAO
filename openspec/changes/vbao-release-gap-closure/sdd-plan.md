# SDD Plan: VBAO Release Gap Closure

## Current State

Verified from current repo evidence:

- Core `VBAONode` shape is strong: 32-sector bitmask, required normals, fixed
  loop product preset, raw/product boundary, and compact public exports.
- Targeted source/reference tests pass.
- Quality candidates have not been promoted.
- Temporal remains private and rejected for promotion.
- Thin-geometry rendered proxy evidence exists. Ray-cast fixtures and the
  production reference gate exist, but tracked product observations for the
  hard thin/contact cases still need to be wired into the release verdict.
- The worktree contains active benchmark/temporal changes, so clean-checkout
  reproducibility must be treated as a gate, not assumed.

Verified from external primary sources:

- SSILVB/VBAO is specifically motivated by horizon methods failing around thin
  surfaces and by replacing two horizon angles with a visibility bitmask.
- GTAO production discipline is reference-first: compare to ray-traced/Monte
  Carlo ground truth and report runtime budget.
- CACAO production discipline separates depth/normal preparation, AO
  generation, edge metadata, blur/apply/upscale, and quality levels.
- Three.js GTAONode gives the local integration shape; Three TSL/WebGPU docs
  justify generated-shader and compute/storage inspection when using nodes.
- N8AO is useful as a product smoothness/control baseline, not as ground truth.

## Release Gap Thesis

The blocker is not "write more AO code." The blocker is proof discipline:

1. prove the hard visual cases against reference truth;
2. define objective promotion thresholds;
3. isolate experimental lanes from the default release path.

## Phase 0: Freeze Scope

- [x] 0.1 Create `research-ledger.md` with source-backed claims and local
  implications.
- [x] 0.2 Confirm no public `VBAONodeOptions` fields are added.
- [x] 0.3 Confirm no production build is run unless explicitly requested.
- [x] 0.4 Record current dirty worktree boundaries before editing source.
- [x] 0.5 Confirm the default product path is `quality` preset, not explicit
  debug sample/slice override.

## Phase 1: Reference Truth Gate

- [x] 1.1 Inspect existing `RAYCAST_AO_FIXTURES` and map fixture IDs to source
  pressure: SSILVB thin-gap, GTAO reference truth, CACAO edge/discontinuity.
- [x] 1.2 RED: Add a missing-observation test for
  `thin-gap-separated-slabs`.
- [x] 1.3 RED: Add required product-lane observation names for broad contact,
  two-wall corner gap, grazing normal, normal-sensitive contact, and edge
  discontinuity.
- [x] 1.4 GREEN: Feed the required fixture observations through the existing
  production reference gate instead of creating a parallel report path.
- [x] 1.5 REFACTOR: Keep reference truth code under
  `packages/horizon-ao/reference/`.
- [x] 1.6 VERIFY: Missing observations produce `incomplete`, not `pass`.
- [x] 1.7 Add a research note explaining why screenshots cannot promote
  thin-surface claims without ray-cast/reference observations.

## Phase 2: Product Promotion Matrix

- [x] 2.1 RED: Add report tests for required VBAO/GTAO/N8AO rows per scene,
  resolution, view, and output.
- [x] 2.2 Define initial threshold fields for reference error, noise, stripe,
  edge bleed, thin-gap, median timing, and p95 timing.
- [x] 2.3 GREEN: Emit one promotion verdict per product row.
- [x] 2.4 REFACTOR: Ensure debug override and private candidate rows are labeled
  as non-product evidence.
- [x] 2.5 VERIFY: A missing screenshot or timing row blocks promotion.
- [x] 2.6 Document GTAO/N8AO as baselines and ray-cast rows as truth so the
  report cannot imply GTAO/N8AO are ground truth.

## Phase 3: Thin-Gap And Contact Capture

- [ ] 3.1 Capture `/lab` and `/museum` at `1920x1080` and `1280x720` using
  pinned cameras.
- [ ] 3.2 Include raw-debug/product and AO/beauty rows.
- [ ] 3.3 Add screenshot paths and timing rows to `EVIDENCE.md`.
- [ ] 3.4 Compare rendered proxies against the new reference observations.
- [ ] 3.5 Decide whether current contact/thickness policy remains acceptable.
- [ ] 3.6 If current policy fails, open a separate implementation SDD for the
  smallest candidate; do not patch constants inside this planning SDD.

## Phase 4: Release Cleanliness Gate

- [ ] 4.1 Audit public exports and package files.
- [ ] 4.2 Assert temporal, compute, benchmark noise, reconstruction-stage, and
  sample override lanes remain private/demo-only.
- [ ] 4.3 Update README/package docs only with claims proven by tracked
  evidence.
- [ ] 4.4 Keep rejected candidates recorded with reasons, not deleted.
- [ ] 4.5 Add generated-shader inspection to any release verdict that depends
  on TSL loop shape, expression hoisting, temporal, or compute/storage nodes.

## Phase 5: Final Evidence Verdict

- [ ] 5.1 Produce one release-readiness report with `pass`, `fail`,
  `incomplete`, or `candidate-only`.
- [ ] 5.2 Link every verdict to tracked artifacts or mark it not clean-checkout
  reproducible.
- [ ] 5.3 Update `EVIDENCE.md` with the final gate result.
- [ ] 5.4 Update `apply-progress.md` with commands and outcomes.

## Verification Plan

Use targeted verification first:

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/reference
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
git diff --check
```

Run demo/e2e benchmark captures only for phases that need screenshots or GPU
timings. Do not run production builds.

Research verification already performed for this planning pass:

- SSILVB/VBAO paper: https://arxiv.org/abs/2301.11376
- Activision GTAO report:
  https://www.activision.com/cdn/research/PracticalRealtimeStrategiesTRfinal.pdf
- AMD CACAO technique/docs:
  https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- Three GTAONode docs: https://threejs.org/docs/pages/GTAONode.html
- Three TSL docs: https://threejs.org/docs/TSL.html
- N8AO README: https://github.com/N8python/n8ao

## Guardrails

- No screenshot-only acceptance for reference truth.
- No private candidate promotion by label drift.
- No public API expansion from this SDD.
- No changing thresholds after seeing a candidate result without recording why.
- No release claim from untracked or dirty-only artifacts.
