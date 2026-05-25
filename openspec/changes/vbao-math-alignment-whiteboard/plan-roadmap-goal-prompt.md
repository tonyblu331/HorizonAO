# VBAO Complete Plan, Roadmap, and Goal Prompt

Date: 2026-05-26

## North Star

Make `VBAONode` read as geometric visibility, not as a muddy darkening filter.

The renderer should preserve open gaps, distinguish thin occluders from thick
continuous geometry, remove noise without washing edges, and keep scalar
accessibility semantics intact: `1` means open, `0` means blocked.

## Current Position

| Track | Status | Truth |
| --- | --- | --- |
| Core VBAO contract | Strong | 32-sector bitmask, cosine-weighted accessibility, required normals, and no GTAO falloff soup are already locked. |
| Evidence baseline | Implemented, awaiting manual captures | Harness, schema, full-res evidence toggle, and tests exist; WebGPU screenshots/timings are still pending. |
| Adaptive thickness | Reference complete | Scalar reference now proves continuity, deterministic thickness estimation, adaptive mask widening, and gap preservation. TSL port is next. |
| Sampling/resolution | Planned | Current magic-square pattern may be structured/noisy; no sampling abstraction yet. |
| Denoise | Researched, gated | Spatial-only denoise formula is drafted; no implementation until evidence proves the failure class. |
| Depth hierarchy | Planned | Needed for large-radius stability, but not before thickness/sampling evidence. |
| Visibility buckets | Future | This is the richer GT-VBAO++ lighting direction, not the next AO correctness fix. |

## Non-Negotiable Rules

- No production build commands unless explicitly requested.
- Strict TDD is active.
- Scalar reference tests come before TSL shader changes.
- Visual claims require screenshots in `EVIDENCE.md`.
- Performance claims require timing rows in `EVIDENCE.md`.
- No public `VBAONodeOptions` knobs until evidence proves they deserve to exist.
- No denoise implementation before a written formula and failure labels.
- No renamed XeGTAO/CACAO preset. Either port a system honestly or keep VBAO clean.

## Roadmap

### Phase 0 - Evidence Baseline

Goal: prove what is actually wrong before changing math.

Status: implementation complete; manual WebGPU data pending.

Tasks:

- [x] Define evidence row schema and failure labels.
- [x] Add Museum evidence controls for raw/denoised/full-res VBAO.
- [x] Add Playwright route/control smoke coverage.
- [x] Keep full-res evidence mode demo-local.
- [ ] Capture required WebGPU rows at `1920x1080`.
- [ ] Capture required WebGPU rows at `1280x720`.
- [ ] Fill screenshot paths and timing rows.
- [ ] Classify failures: `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`, `scale-mismatch`.

Exit gate:

- `EVIDENCE.md` contains real screenshots, device/browser/backend data, timing
  method, median timings, and failure labels for GTAO, VBAO, and N8AO.

### Phase 1 - Adaptive Thickness Reference

Goal: fix the main blocker-model cause of mud and weird thin-gap behavior.

Status: complete in scalar reference; ready to archive and use as the gate for a TSL port.

Tasks:

- [x] Add same-surface continuity/discontinuity tests.
- [x] Add reference-only `areSameSurfaceSamples`.
- [x] Add tests for isolated thin occluder thickness estimate.
- [x] Add tests for continuous thick wall thickness estimate.
- [x] Add tests for gap-behind-object discontinuity.
- [x] Implement deterministic adaptive thickness estimate with clamp defaults.
- [x] Add reference-only adaptive mask helper.
- [x] Compare adaptive vs constant mask sector counts in tests.
- [x] Run targeted Vitest, package typecheck, and tsgo for the estimator and mask slices.

Exit gate:

- Scalar reference proves thin occluders stay narrow, thick continuous walls get
  thicker, and gaps do not merge into false blockers.

### Phase 2 - Adaptive Thickness TSL Port

Goal: port only the proven reference behavior into the shader.

Tasks:

- [ ] Add shader-side tests or e2e smoke that exercise the adaptive path.
- [ ] Port same-surface run logic to TSL behind internal constants.
- [ ] Keep constant-thickness behavior available during comparison.
- [ ] Capture side-by-side adaptive vs constant evidence rows.
- [ ] Decide whether adaptive thickness becomes default.

Exit gate:

- Screenshots show less `mud` or fewer `thin-gap` artifacts without introducing
  `halo` or `edge-bleed`.

### Phase 3 - Sampling And Resolution

Goal: reduce structured noise before hiding anything with denoise.

Tasks:

- [ ] Add reference sampling-pattern abstraction.
- [ ] Compare current magic-square, R2, Hilbert, and blue-noise rotations.
- [ ] Keep deterministic non-temporal fallback.
- [ ] Validate half-res only with explicit upsample/denoise path.
- [ ] Record screenshots and timings for full-res vs half-res.

Exit gate:

- Evidence shows which sampling schedule improves noise/cost without damaging
  geometry readability.

### Phase 4 - Non-Temporal Spatial Denoise

Goal: clean noise without temporal dependency or edge smear.

Formula:

```text
A_filtered(p) =
  sum(q in N(p)) W(p, q) * A_raw(q)
  -----------------------------------
        sum(q in N(p)) W(p, q)

W(p, q) =
  K_spatial(|p - q|)
* K_depth(|z_p - z_q|)
* K_normal(1 - dot(n_p, n_q))
* K_confidence(c_p, c_q)
```

Tasks:

- [ ] Start with `K_confidence = 1` depth/normal-only filtering.
- [ ] Compare against higher-sample raw VBAO.
- [ ] Add bitmask metadata only if the baseline fails a named evidence case.
- [ ] Record raw, denoised, and higher-sample timings.
- [ ] Reject filters that create `edge-bleed`, `halo`, or close `thin-gap` cases.

Exit gate:

- Denoise reduces `noise` without hiding adaptive-thickness failures or washing
  geometric edges.

### Phase 5 - Depth Hierarchy

Goal: stabilize large-radius and distant occluder behavior.

Tasks:

- [ ] Write depth prefilter/MIP design.
- [ ] Add reference cases where direct depth samples are unstable.
- [ ] Decide TSL render-target path vs WebGPU compute path.
- [ ] Implement internal depth hierarchy experiment.
- [ ] Capture radius stress tests.

Exit gate:

- Large-radius evidence improves without breaking near-field thin geometry.

### Phase 6 - Visibility Buckets / GT-VBAO++ Direction

Goal: move beyond scalar AO toward richer directional ambient visibility.

Tasks:

- [ ] Define sector-to-direction bucket reconstruction.
- [ ] Estimate distant light contribution from open sectors.
- [ ] Keep scalar accessibility path intact.
- [ ] Add debug view for bucket direction/visibility.
- [ ] Compare against AO-only scenes with directional ambient.

Exit gate:

- Bucket lighting is clearly better than scalar AO in scenes where direction
  matters, without compromising the existing AO contract.

## Priority Stack

| Priority | Work | Why |
| --- | --- | --- |
| P0 | Manual WebGPU evidence capture | Without real evidence, math work has no target. |
| Done | Finish adaptive thickness reference | Scalar proof now exists; use it as the TSL port gate. |
| Done | Adaptive thickness TSL port | Converts proven reference behavior into visuals. |
| P0 | Sampling pattern comparison | Reduces noise before denoise. |
| P1 | Non-temporal spatial denoise | Presentation polish after raw behavior is correct. |
| P1 | Depth hierarchy | Needed for larger radius stability. |
| P2 | Visibility buckets | Richer GT-VBAO++ look, larger scope. |
| P2 | Temporal accumulation | Explicitly deferred; not part of the non-temporal denoise track. |

## Immediate Next Task Batch

Change: `vbao-sampling-backtest`

Target tasks:

- Add a reference sampling abstraction.
- Compare magic-square rotation against deterministic R2/Hilbert-style schedules.
- Keep frame/time/history out of all schedules.
- Add benchmark labels without exposing public API.
- Capture 1920x1080 and 1280x720 rows before selecting any production sampling change.

Expected files:

- `packages/horizon-ao/src/vbaoReference.ts`
- `packages/horizon-ao/src/__tests__/vbaoReference.test.ts`
- `apps/demo/src/scenes/MuseumScene.tsx`
- `EVIDENCE.md`
- `packages/horizon-ao/src/vbaoReference.ts`
- `openspec/changes/vbao-adaptive-thickness-reference/archive-report.md`
- New OpenSpec artifacts for the TSL port change

Verification:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoReference.test.ts
node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json
node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p packages/horizon-ao/tsconfig.json
```

## Goal Prompt

Use this prompt to continue the next implementation pass:

```text
Archive `vbao-adaptive-thickness-reference`, then start the next OpenSpec change
for the adaptive-thickness TSL port.
Strict TDD is active.

Goal:
Port only the already-proven scalar adaptive thickness behavior into the TSL
kernel. Do not add public `VBAONodeOptions`, quality tiers, render-target
formats, denoise, temporal filtering, or depth hierarchy.

Required task order:
1. Archive the completed scalar reference change.
2. Run the safety net:
   `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoReference.test.ts`
3. Add shader-side or e2e smoke coverage for adaptive behavior before changing `VBAONode`.
4. Port same-surface/adaptive thickness logic behind internal constants.
5. Keep constant-thickness behavior available for comparison.
6. Verify with targeted Vitest, package `tsc --noEmit`, package `tsgo --noEmit`, and relevant e2e smoke.
7. Capture adaptive vs constant evidence rows before making default decisions.

Acceptance:
- Adaptive thin isolated masks stay narrow.
- Adaptive continuous-wall masks block more sectors than thin isolated masks in the shader path.
- Adaptive gap masks do not widen by merging the back sample into the front blocker.
- Existing 63 reference tests remain green.
- No public API changes.
```

## Definition Of Done For The Whole VBAO Improvement Track

- Evidence rows are real, not pending placeholders.
- Adaptive thickness is proven in scalar reference and then matched visually in
  TSL.
- Sampling improvements are measured against screenshots and timings.
- Denoise has formula, evidence, and rejection gates.
- Depth hierarchy is justified by large-radius evidence.
- Visibility buckets remain separate from scalar AO unless proven valuable.
- `VBAONode` keeps its accessibility contract unless a separate lighting path is
  explicitly introduced.
