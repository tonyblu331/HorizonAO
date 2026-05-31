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
| Evidence baseline | Captured for Museum/WebGPU | Harness, schema, full-res evidence toggle, screenshots, median/p95 rows, and labels exist. A broader manual device pass is still useful but no longer blocks local decisions. |
| Adaptive thickness | Reference and TSL port complete | Scalar proof exists and the shader path now uses internal adaptive thickness. Do not add knobs without new evidence. |
| Sampling/resolution | Evidence gate complete, no promotion | Magic-square, R2, Hilbert-style, and blue-noise-like schedules were captured. None solved structured noise/mud without tradeoffs, so `magic-square` stays default. |
| Denoise | Evidence gate complete, no promotion | Generic denoise adds mud/edge bleed/thin-gap closure. Custom bilateral is safer but still leaves noise/mud/edge bleed. More blur is not the next fix. |
| Depth hierarchy | Evidence gate complete, experiment justified | Large-radius rows show `scale-mismatch`; reference selector predicts level `1`. Next is an internal depth-prefilter experiment, not a production option. |
| Visibility buckets | Reference-only direction complete | Directional reconstruction is useful future GT-VBAO++ pressure, but scalar AO quality still owns the next implementation slot. |

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

Status: automated Museum/WebGPU screenshots, median/p95 rows, and failure
labels are captured. A broader manual device review is optional, not a blocker.

Tasks:

- [x] Define evidence row schema and failure labels.
- [x] Add Museum evidence controls for raw/denoised/full-res VBAO.
- [x] Add Playwright route/control smoke coverage.
- [x] Keep full-res evidence mode demo-local.
- [x] Capture required WebGPU rows at `1920x1080`.
- [x] Capture required WebGPU rows at `1280x720`.
- [x] Fill screenshot paths and timing rows.
- [x] Classify failures: `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`, `scale-mismatch`.

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

- [x] Add shader-side tests or e2e smoke that exercise the adaptive path.
- [x] Port same-surface run logic to TSL behind internal constants.
- [x] Keep public options unchanged during comparison.
- [x] Preserve benchmark/source contracts around adaptive behavior.
- [x] Keep adaptive thickness internal by default.

Exit gate:

- Screenshots show less `mud` or fewer `thin-gap` artifacts without introducing
  `halo` or `edge-bleed`.

### Phase 3 - Sampling And Resolution

Goal: reduce structured noise before hiding anything with denoise.

Tasks:

- [x] Add reference sampling-pattern abstraction.
- [x] Compare current magic-square, R2, Hilbert, and blue-noise rotations.
- [x] Keep deterministic non-temporal fallback.
- [x] Validate full-res rows through explicit benchmark labels.
- [x] Record screenshots and timings for schedule and sample-preset rows.

Exit gate:

- Evidence rejects production sampling promotion for now. Keep `magic-square`
  until a candidate reduces structured noise without adding mud, edge bleed, or
  p95 cost outside the baseline envelope.

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

- [x] Start with `K_confidence = 1` depth/normal-only filtering.
- [x] Compare against higher-sample raw VBAO.
- [x] Defer bitmask metadata until generic/custom filtering fails a named evidence case.
- [x] Record raw, denoised, and higher-sample timings.
- [x] Reject filters that create `edge-bleed`, `halo`, or close `thin-gap` cases.

Exit gate:

- Evidence rejects production denoise promotion. Generic blur and custom
  bilateral filtering do not solve raw VBAO's structured noise without mud or
  edge costs.

### Phase 5 - Depth Hierarchy

Goal: stabilize large-radius and distant occluder behavior.

Tasks:

- [x] Write evidence-only depth hierarchy design.
- [x] Add reference selector for footprint-to-level pressure.
- [x] Capture radius stress tests.
- [ ] Write internal depth prefilter experiment design.
- [ ] Decide TSL render-target path vs WebGPU compute path.
- [ ] Implement internal depth hierarchy experiment.
- [ ] Compare against existing radius-stress screenshots and p95 envelope.

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
| Done | WebGPU evidence capture | Museum baseline, schedule, denoise, and radius-stress rows are captured with screenshots/timings. |
| Done | Finish adaptive thickness reference | Scalar proof now exists; use it as the TSL port gate. |
| Done | Adaptive thickness TSL port | Converts proven reference behavior into visuals. |
| Done | Sampling pattern comparison | Evidence says no schedule promotion yet. |
| Done | Non-temporal spatial denoise gate | Evidence says no production denoise yet. |
| P0 | Internal depth prefilter experiment | Large-radius evidence now shows `scale-mismatch`; this is the next falsifiable hypothesis. |
| P1 | Bitmask confidence metadata | Needed only if future filters still fail without metadata. |
| P2 | Visibility buckets | Richer GT-VBAO++ look, larger scope. |
| P2 | Temporal accumulation | Explicitly deferred; not part of the non-temporal denoise track. |

## Immediate Next Task Batch

Change: `vbao-depth-prefilter-experiment`

Target tasks:

- Add RED source/docs contract tests proving no public depth-MIP option exists.
- Add reference tests for depth prefilter level selection and representative-depth choice.
- Design the internal prefilter path against the existing radius-stress rows.
- Prototype an internal-only depth prefilter or hierarchy experiment.
- Compare baseline vs depth-prefilter rows at `1920x1080` and `1280x720`.
- Reject the experiment unless it improves `scale-mismatch` without adding mud, thin-gap closure, edge bleed, or p95 cost outside the current envelope.

Expected files:

- `packages/horizon-ao/src/vbaoDepthHierarchy.ts`
- `packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts`
- `apps/demo/src/scenes/MuseumScene.tsx`
- `apps/demo/scripts/collect-ao-benchmark.mjs`
- `EVIDENCE.md`
- `openspec/changes/vbao-depth-prefilter-experiment/*`

Verification:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts packages/horizon-ao/src/__tests__/vbaoEvidenceContract.test.ts
node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json
node apps/demo/scripts/collect-ao-benchmark.mjs
```

## Goal Prompt

Use this prompt to continue the next implementation pass:

```text
Start the next OpenSpec change `vbao-depth-prefilter-experiment`.
Strict TDD is active.

Goal:
Prototype an internal depth prefilter/hierarchy experiment only because
`EVIDENCE.md` now has radius-stress rows with `scale-mismatch`. Do not add public
`VBAONodeOptions`, quality tiers, denoise, temporal filtering, or visibility
bucket APIs.

Required task order:
1. Add RED tests for reference depth representative selection.
2. Add source/docs contract tests proving the public API remains unchanged.
3. Design the internal prefilter path and choose TSL render-target vs WebGPU compute.
4. Prototype internal-only depth prefilter controls in the benchmark harness.
5. Capture baseline vs prefilter radius-stress rows at both resolutions.
6. Reject the experiment unless screenshots improve `scale-mismatch` without worse p95 or new edge failures.

Acceptance:
- Public API remains unchanged.
- Baseline radius-stress rows remain available for comparison.
- Any claimed improvement has screenshot paths plus median/p95 rows in `EVIDENCE.md`.
- Large-radius `scale-mismatch` improves without extra mud, `thin-gap`, or `edge-bleed`.
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
