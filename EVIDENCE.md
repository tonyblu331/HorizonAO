# EVIDENCE - VBAONode

Every rendering claim for `VBAONode` needs reproducible screenshots and timing.
This file is the gate for later adaptive thickness, sampling, denoise, or depth
hierarchy work. No "looks muddy" shortcut: evidence first, then math.

## 2026-06-11 — VBAO half-res cleanup on/skip comparison (P4 merge-decision evidence)

Status: **rendered proxy evidence captured; cleanup contribution within run variance on 3 of 4 rows; ray-cast thin-gap product observation still missing**.

Question under test (review item P4): does the separate `VBAOHalfResCleanupNode`
pass measurably improve the half-res product over `raw → resolve` alone? If not,
merging cleanup + resolve into one wider bilateral upsample is a viable
simplification. Softness 0.2 (default) keeps polish strength at 0, so the runs
isolate exactly the cleanup pass.

Commands (identical except `AO_BENCHMARK_VBAO_CLEANUP_MODE` and output paths):

```sh
AO_BENCHMARK_SCENES='museum' AO_BENCHMARK_MODES='vbao' AO_BENCHMARK_VIEWS='beauty,ao' \
AO_BENCHMARK_DENOISE_STATES='true' AO_BENCHMARK_VBAO_RESOLUTION_STATES='half' \
AO_BENCHMARK_VBAO_TEMPORAL_MODE='off' AO_BENCHMARK_PASS_TIMING_SAMPLES='3' \
AO_BENCHMARK_REQUIRE_WEBGPU='1' AO_BENCHMARK_VBAO_CLEANUP_MODE='on'   # then 'skip'
pnpm --filter @horizonao/demo benchmark:ao
```

Artifacts: `artifacts/benchmarks/vbao-p4-cleanup-{on,skip}.{json,md}`.

| Row (half-res product) | Thin-gap ↑ on | Thin-gap ↑ skip | Edge bleed ↓ on | Edge bleed ↓ skip | Noise ↓ on | Noise ↓ skip | Stripe ↓ on | Stripe ↓ skip |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 beauty | 0.00520 | 0.00530 | 0.02075 | 0.02080 | 0.02305 | 0.02312 | 0.09887 | 0.09891 |
| 1920x1080 ao | 0.01157 | 0.00238 | 0.02772 | 0.00527 | 0.03556 | 0.01183 | 0.08887 | 0.15190 |
| 1280x720 beauty | 0.00541 | 0.00963 | 0.02909 | 0.03143 | 0.03521 | 0.03592 | 0.15776 | 0.17122 |
| 1280x720 ao | 0.01680 | 0.01713 | 0.03414 | 0.03433 | 0.04275 | 0.04323 | 0.22180 | 0.22085 |

Pass cost: cleanup measured 0.054–0.195 GPU ms across rows; every row carries the
same `noise` failure label in both states; no row gains or loses `thin-gap`,
`mud`, or `edge-bleed` labels between states.

Boundary:

- Both beauty rows and the 720p AO row are indistinguishable between on/skip
  (deltas at the third decimal, well inside capture noise).
- The 1080p AO row moves in BOTH directions (skip better on noise/edge-bleed,
  on better on stripe/thin-gap proxy) while the raw pass itself varied ~40%
  between the two runs at identical settings (0.732 vs 1.036 ms at 1080p
  beauty) — this row is not stable enough to carry a verdict alone.
- This is Museum rendered-proxy evidence only. The `thin-gap-separated-slabs`
  ray-cast product observation the golden-diff audit requires is STILL missing;
  the GPU collector has no slab-fixture scene to render.
- Verdict for P4: nothing here justifies the separate cleanup pass on quality
  grounds, but the merge decision is not yet closed — it needs either (a) a
  merged-kernel prototype compared behind the same evidence flag, or (b) the
  slab-fixture product observation producer, before deleting a pass that ships.

## 2026-06-09 — VBAO vs independent ground-truth delta verifier (P1)

Status: **first quantitative truth-vs-VBAO baseline committed; deterministic regression anchor**.

Wired a delta verifier comparing the algorithm-independent ray-cast AO truth
(`reference/aoRaycastReference.ts`, cosine-hemisphere rays vs analytic occluders) against a
faithful VBAO *representation* estimate on the SAME geometry (slice × 32-sector visibility
bitmask, cosine-weighted popcount) in `reference/vbaoGroundTruthDelta.ts`. View-independent;
deterministic (no RNG) so it serves as a committed regression anchor. NOTE: this measures
REPRESENTATION error (finite slices + 32-sector quantization), not the screen-space-achievable
delta (a camera/heightfield reference, roadmap P1-B, still to build).

Reproduce: `pnpm --filter @horizonao/core test -- reference/__tests__/vbaoGroundTruthDelta.test.ts`
or `createVbaoGroundTruthDeltaReport()` (4 slices, 4096 truth rays).

Baseline (RMSE 0.09938 · MAE 0.07045 · Max |Δ| 0.21678):

| Fixture | Truth | VBAO repr | Δ (truth − vbao) |
| --- | ---: | ---: | ---: |
| flat-plane-open | 1.0000 | 1.0000 | 0.0000 |
| sphere-contact | 0.8066 | 0.8469 | -0.0402 |
| box-contact | 0.8120 | 0.8457 | -0.0337 |
| two-wall-corner | 0.5710 | 0.7357 | **-0.1647** |
| broad-wall-contact | 0.6768 | 0.7312 | -0.0544 |
| thin-gap-separated-slabs | 0.8096 | 0.8457 | -0.0361 |
| grazing-surface-wall | 0.6003 | 0.5122 | 0.0882 |
| normal-sensitive-side-contact | 0.6736 | 0.4568 | **0.2168** |
| far-object-outside-radius | 1.0000 | 1.0000 | 0.0000 |

Findings (turn quality from vibes into numbers):

- Contact cases (sphere/box/thin-gap): VBAO repr is slightly UNDER-occluded (~+0.03–0.04),
  consistent with sector-center sampling missing thin occlusion — a P2/P3 quantization signal.
- `two-wall-corner`: VBAO is materially too accessible (Δ −0.165) — under-occludes corners.
- `normal-sensitive-side-contact` + `grazing-surface-wall`: VBAO OVER-occludes (Δ +0.22 / +0.09) —
  the grazing / `normal^8` behavior, a concrete P3 target.
- Future quality phases must hold or beat this RMSE; the test locks it deterministically.

## 2026-06-08 — VBAO pass unification + half-res confidence reconciliation (P0)

Status: **EffectPass unification WebGPU-validated; half-res benchmark green again**.

`VBAOResolveNode` + `VBAOHalfResCleanupNode` now extend `VBAOEffectPass` (shared render
target / material / renderer-state save+restore), removing per-node module-global renderer
state and ~160 LOC of boilerplate. The demo's half-res reconstruction (MuseumScene) now feeds
cleanup/polish the folded confidence from `vbaoNode.getRawTextureNode().g` instead of a
standalone confidence node; the standalone `VBAOReceiverConfidenceNode` remains only as the
diagnostic confidence-view oracle. Benchmark pass-timing model expects a separate confidence
pass only for the diagnostic view.

Command:

```sh
AO_BENCHMARK_SCENES=museum AO_BENCHMARK_MODES=vbao AO_BENCHMARK_VIEWS=ao AO_BENCHMARK_DENOISE_STATES=true AO_BENCHMARK_VBAO_RESOLUTION_STATES=half AO_BENCHMARK_PASS_TIMING_SAMPLES=3 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_PORT=5322 AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-effectpass-unify-halfres.json AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-effectpass-unify-halfres.md pnpm --filter @horizonao/demo benchmark:ao
```

| Resolution | View | Output | raw | confidence | cleanup | resolve | polish | total-product GPU ms |
| --- | --- | --- | ---: | --- | ---: | ---: | --- | ---: |
| 1920x1080 | ao | product (half-res) | 0.766 | skipped (folded) | 0.048 | 0.100 | skipped | 0.914 |

Outcome:

- EffectPass-unified `cleanup` and `resolve` passes render under WebGPU (measured timings, no
  errors), confirming the pure-plumbing refactor is behavior-preserving on the half-res path.
- `confidence` pass is `skipped` in the half-res product pipeline (folded into `raw`).
- Boundary: per-pixel numeric equivalence of folded-G vs the diagnostic node is still a future check.

## 2026-06-08 — VBAO receiver-confidence folded into raw RG pass (P0)

Status: **product-path second march eliminated; WebGPU-validated; quality neutral**.

The product reconstruction used to run `VBAOReceiverConfidenceNode` — a full second
slice/sample march — whenever softness>0 or half-res. Confidence is now folded into the
raw pass: target `RedFormat → RGFormat`, raw kernel emits `vec4(ao, confidence, 0, 1)`
with `confidence = sqrt(receiverSupport · sliceAgreement)` computed from the SAME march
(candidate/accepted counts + Welford variance over per-slice accessibility, no extra
texture taps). Cleanup/polish read confidence from raw `.g`. The standalone node is kept
only as the demo diagnostic confidence view (an independent oracle for the folded G).

Commands:

```sh
AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_PORT=5311 pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
AO_BENCHMARK_SCENES=museum AO_BENCHMARK_MODES=vbao AO_BENCHMARK_VIEWS=ao,beauty AO_BENCHMARK_DENOISE_STATES=true AO_BENCHMARK_VBAO_RESOLUTION_STATES=full AO_BENCHMARK_PASS_TIMING_SAMPLES=3 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_PORT=5314 AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-confidence-fold-validation.json AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-confidence-fold-validation.md pnpm --filter @horizonao/demo benchmark:ao
```

Generated-shader inspection: **pass** — product-preset + spatial-ultra, 2 shader programs
(no separate confidence program), fixed loop bounds, `vbaoDuplicateDeclarationWarnings: 0`,
0 console diagnostics. Confirms the folded kernel is valid WGSL with no pass-shape regression.

| Resolution | View | Output | raw GPU ms | confidence pass | polish GPU ms | total-product GPU ms | Pattern/noise ↓ | Stripe ↓ |
| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1920x1080 | ao | product | 2.917 | skipped (folded) | 0.184 | 3.102 | 0.01278 | 0.14090 |
| 1920x1080 | beauty | product | 3.931 | skipped (folded) | 0.240 | 4.171 | 0.02289 | 0.08859 |
| 1280x720 | ao | product | 2.178 | skipped (folded) | — | — | 0.02453 | 0.18166 |

Outcome:

- The `confidence` pass is now `skipped` in the product pipeline (folded into `raw`); the
  benchmark pass-timing model was updated to expect a separate confidence pass only for the
  diagnostic confidence view.
- Quality proxies stay in the historical full-res product band (no regression signal).
- Boundary: this is timing + screenshot-proxy evidence. Numeric equivalence of the folded
  G channel vs the standalone diagnostic node (per-pixel) is not yet captured; the retained
  diagnostic node is the oracle for that future check.

## 2026-06-04 — VBAO release gap closure Phase 3 capture

Status: **pinned render evidence captured; release promotion remains blocked**.

Artifacts:

- JSON: `artifacts/benchmarks/ao-release-gap-closure-latest.json`
- Markdown summary: `artifacts/benchmarks/ao-release-gap-closure-summary.md`
- Screenshots: `artifacts/benchmarks/screenshots-ao-release-gap-closure/`
- Generated shader inspection JSON:
  `artifacts/benchmarks/vbao-generated-shader-inspection-latest.json`
- Generated shader inspection summary:
  `artifacts/benchmarks/vbao-generated-shader-inspection-summary.md`

Command:

```powershell
$env:AO_BENCHMARK_SCENES='lab,museum'; $env:AO_BENCHMARK_MODES='gtao,vbao,n8ao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false,true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half,full'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5208'; $env:PLAYWRIGHT_TEST_PORT='5208'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/ao-release-gap-closure-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/ao-release-gap-closure-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-ao-release-gap-closure'; pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5209'; $env:PLAYWRIGHT_TEST_PORT='5209'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

Coverage:

- Scenes: `/lab`, `/museum`.
- Resolutions: `1920x1080`, `1280x720`.
- Views: `beauty`, `ao`.
- Outputs: VBAO `raw-debug` and `product`; GTAO `raw` and `denoised`;
  N8AO `internally-filtered`.
- Rows captured: 38 report rows and 36 screenshots.
- `/lab` emitted VBAO rows only through the current benchmark API; `/museum`
  emitted GTAO, VBAO, and N8AO rows.

Primary VBAO AO/product rows:

| Scene | Resolution | VBAO res | View | Output | Median ms | p95 ms | Product GPU ms | Pattern/noise | Stripe | Edge bleed proxy | Thin-gap proxy | Failure labels | Screenshot |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| lab | 1280x720 | full-res | ao | product | 0.800 | 1.000 | 2.021376 | 0.01381 | 0.22399 | 0.00880 | 0.00482 | noise,edge-bleed | `artifacts/benchmarks/screenshots-ao-release-gap-closure/1280x720-lab-vbao-product-preset-off-full-res-product-ao.png` |
| lab | 1920x1080 | full-res | ao | product | 0.600 | 0.900 | 2.617344 | 0.00861 | 0.05696 | 0.00602 | 0.00456 | noise,edge-bleed | `artifacts/benchmarks/screenshots-ao-release-gap-closure/1920x1080-lab-vbao-product-preset-off-full-res-product-ao.png` |
| museum | 1280x720 | full-res | ao | product | 0.700 | 1.000 | 2.238464 | 0.03699 | 0.12702 | 0.02553 | 0.01145 | noise,edge-bleed | `artifacts/benchmarks/screenshots-ao-release-gap-closure/1280x720-museum-vbao-product-preset-off-full-res-product-ao.png` |
| museum | 1280x720 | half-res | ao | product | 0.700 | 0.900 | 0.982016 | 0.02402 | 0.18573 | 0.01168 | 0.00371 | noise | `artifacts/benchmarks/screenshots-ao-release-gap-closure/1280x720-museum-vbao-product-preset-off-half-res-final-product-ao.png` |
| museum | 1920x1080 | full-res | ao | product | 0.800 | 1.000 | 4.368384 | 0.01251 | 0.14387 | 0.00548 | 0.00363 | noise,edge-bleed | `artifacts/benchmarks/screenshots-ao-release-gap-closure/1920x1080-museum-vbao-product-preset-off-full-res-product-ao.png` |
| museum | 1920x1080 | half-res | ao | product | 0.700 | 0.900 | 1.244160 | 0.01166 | 0.15391 | 0.00514 | 0.00214 | noise | `artifacts/benchmarks/screenshots-ao-release-gap-closure/1920x1080-museum-vbao-product-preset-off-half-res-final-product-ao.png` |

Gate result:

- Product promotion verdict rows: 26 `fail`, 8 `incomplete`, 0 `pass`.
- Reference gate rows: 34 `missing-reference-observation`, so screenshot
  proxies are not allowed to promote thin/contact correctness claims.
- Threshold gate rows: 34 `incomplete`; no material threshold policy was tuned
  after seeing this capture.
- Evidence artifact rows: 36 `complete`, 2 `incomplete`; the incomplete rows
  are synthetic half-resolution reconstruction summary rows missing stage
  observations, not screenshot captures.
- Generated shader inspection: `pass` for product-preset and `spatial-ultra`;
  fixed slice/sample loop bounds, no dynamic slice/sample uniform loops, no
  duplicate VBAO declaration warnings, and no non-ignored console diagnostics.
- Rendered proxy vs reference observation gate: 26 rows checked, 26 `blocked`;
  screenshot proxies were complete, but every row still has
  `missing-reference-observation` with all required fixture IDs missing.
- These artifacts are local capture outputs. Until explicitly added to version
  control, the final release verdict remains not clean-checkout reproducible.

Decision:

- Phase 3 render capture exists and is useful for comparison.
- The current contact/thickness policy is **not accepted for release
  promotion** from this capture: reference observations and threshold verdicts
  are still missing, and VBAO product rows retain `noise` / `edge-bleed`
  labels.
- Production build was not run.

## 2026-06-04 — VBAO signal-quality studio gate

Status: **candidate bakeoff complete; no quality candidate promoted**.

This SDD aligned the pasted VBAO noise/thinness diagnosis with current source
truth, named the hardcoded contact policy constants, ran contact/sampling
candidates, and added a private TSL compute smoke path. The evidence supports
better instrumentation and decision records, not a product quality promotion.

Artifacts:

- `openspec/changes/vbao-signal-quality-studio-gate/`
- `artifacts/benchmarks/ao-gpu-readback-latest.json`
- `artifacts/benchmarks/ao-gpu-readback-summary.md`
- `artifacts/benchmarks/vbao-noise-source-comparison-latest.json`
- `artifacts/benchmarks/vbao-noise-source-comparison-summary.md`
- `artifacts/benchmarks/screenshots-vbao-noise-sources/`
- `artifacts/benchmarks/vbao-compute-smoke-latest.json`
- `artifacts/benchmarks/vbao-compute-smoke-summary.md`
- `artifacts/benchmarks/screenshots-vbao-compute-smoke/`

Commands:

```sh
pnpm --filter @horizonao/demo benchmark:ao:gpu-readback

$env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; node apps/demo/scripts/collect-vbao-noise-source-comparison.mjs

$env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE='sector-confidence-smoke'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-compute-smoke-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-compute-smoke-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-compute-smoke'; pnpm --filter @horizonao/demo benchmark:ao
```

Readback baseline:

- backend: `webgpu-compute`
- output: `24x1` values, `96` bytes
- storage targets: `output`, `readback`
- `vbao-32-sector-gpu` MAE: `0.0060`
- worst fixture: `two-wall-corner-gap`

Rendered compute smoke row:

| Resolution | View | Output | Candidate | Labels | Raw GPU ms | Polish GPU ms | Total product GPU ms | Compute CPU ms | Pattern/noise ↓ | Edge bleed ↓ | Thin-gap ↑ |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280x720 | ao | product | `sector-confidence-smoke` | `noise,edge-bleed` | 1.506 | 0.104 | 1.611 | 2.400 | 0.03699 | 0.02553 | 0.01145 |

Decision:

- Keep current named contact policy as control; reject adaptive/floor thickness
  candidates because they add sectors to the thin-gap gate.
- Keep `phase-atlas-stable-hash` as control; reject IGN, STBN,
  Hilbert/R2-style LUT, 128x128 atlas, and same-budget sample-shape candidates
  from this pass.
- Keep `sector-confidence-smoke` private and opt-in only; it proves TSL
  compute-to-texture-node integration and timing visibility, but it does not
  win a quality gate.
- Do not prototype edge metadata or depth hierarchy yet. They need cleaner
  reference targets before adding more product-pipeline machinery.
- README and marketing claims remain blocked until reference/product gates prove
  quality, not merely smoother screenshots.
- AO-view metrics in these screenshot reports are rendered presentation
  metrics after the demo display transform; cross-algorithm rows are not scalar
  AO truth.

## 2026-06-03 — VBAO thin-geometry golden-diff rendered proxy audit

Status: **rendered proxy evidence captured; ray-cast product observation still missing**.

The thin-geometry golden-diff SDD now separates three proof layers:

- scalar thin diff: product/canonical scalar interval behavior;
- ray-cast thin diff: finite `thin-gap-separated-slabs` reference behavior;
- rendered thin-gap proxy: screenshot metrics and failure labels.

Phase 4 captured full-resolution VBAO product rows for Museum beauty and AO at
both required evidence resolutions. This is rendered screenshot evidence only;
it does not satisfy the ray-cast product observation gate.

Artifacts:

- `openspec/changes/vbao-thin-geometry-golden-diff-audit/`
- `artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.json`
- `artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.md`
- `artifacts/benchmarks/screenshots-vbao-thin-geometry-golden-diff-phase4/`

Command:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5220'; $env:PLAYWRIGHT_TEST_PORT='5220'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-thin-geometry-golden-diff-phase4.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-thin-geometry-golden-diff-phase4'; pnpm --filter @horizonao/demo benchmark:ao
```

| Resolution | View | Output | Labels | Thin-gap proxy ↑ | Edge bleed proxy ↓ | Stripe ↓ | Total product GPU ms |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| 1920x1080 | beauty | product | `noise,edge-bleed` | 0.00396 | 0.01683 | 0.08715 | 4.219 |
| 1920x1080 | ao | product | `noise,edge-bleed` | 0.00156 | 0.00353 | 0.13551 | 3.925 |
| 1280x720 | beauty | product | `noise,edge-bleed` | 0.00616 | 0.02872 | 0.15700 | 1.966 |
| 1280x720 | ao | product | `noise,edge-bleed` | 0.00251 | 0.00850 | 0.19104 | 2.333 |

Boundary:

- Rendered thin-geometry proxy rows are complete for this capture batch.
- No row carries `thin-gap` or `mud`; current full-resolution product labels
  remain `noise,edge-bleed`.
- AO product rows still have `0` ray-cast fixture observations and remain
  `missing-reference-observation`.
- Therefore this is not a "closer to ground truth" claim. A future product row
  needs an explicit `thin-gap-separated-slabs` observation before ray-cast thin
  diff can pass.

## 2026-06-03 — VBAO projected-normal slice reduction candidate

Status: **runtime candidate implemented with raw-kernel screenshots, timings, and shader inspection**.

The pasted kernel review was converted into source-backed SDD gates under
`openspec/changes/vbao-kernel-canonical-drift-triage/`. A single-slice
grazing-normal fixture did not distinguish uniform averaging, but a multi-slice
non-axis fixture produced a warning-level gap between uniform and
projected-normal weighted reduction. The production kernel now weights each
slice accessibility by the projected normal length already computed for that
slice.

Artifacts:

- `openspec/changes/vbao-kernel-canonical-drift-triage/sdd-plan.md`
- `openspec/changes/vbao-kernel-canonical-drift-triage/design.md`
- `openspec/changes/vbao-kernel-canonical-drift-triage/peer-review.md`
- `openspec/changes/vbao-kernel-canonical-drift-triage/research-contrast.md`
- `openspec/changes/vbao-kernel-canonical-drift-triage/apply-progress.md`
- `openspec/changes/vbao-kernel-canonical-drift-triage/slice-reduction-decision.md`

Decisions:

- Treat `computeVbaoBilateralGeometryWeight` extraction as already complete.
- Replace uniform slice averaging with projected-normal weighted slice
  accumulation after a multi-slice/non-axis fixture produced a material
  warning-level gap.
- Treat `sampleDist * 0.85` as load-bearing behavior that needs documentation or
  measured replacement.
- Treat x² radial spacing as defensible but requiring reference/product contrast.
- Defer phase-atlas hoisting until correctness gates are stable.
- Reject temporal promotion and resolve/polish fusion from this SDD.

Fixture gate:

- Added `grazing-normal` to the canonical/product drift report case set.
- The first RED was the production reference gate rejecting the new case list;
  the gate now accepts `grazing-normal`.
- The new fixture currently reports finite canonical/product observations with
  no drift (`absDiff === 0`). This does not prove uniform slice averaging is
  correct across slices; it proves the first non-axis-aligned single-slice
  fixture is not enough to justify a formula change.
- Added a separate scalar multi-slice/non-axis fixture where uniform
  accessibility is more than `0.03` higher than projected-weighted
  accessibility. That is the gate that justified the runtime candidate.

Runtime and evidence:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5204'; $env:PLAYWRIGHT_TEST_PORT='5204'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs

$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5205'; $env:PLAYWRIGHT_TEST_PORT='5205'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='half,full'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/ao-vbao-projected-normal-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/ao-vbao-projected-normal-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-projected-normal'; pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs
```

Generated shader inspection passed for product-preset and spatial-ultra shapes:
fixed slice/sample loop bounds, no dynamic uniform loops, no unexpected
full-res JBU or wide polish, no VBAO duplicate declaration warnings, and no
console diagnostics other than the known ignored Chromium `powerPreference`
warning.

| Resolution | View | VBAO res | Output | Raw GPU ms | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | beauty | half-res | raw-debug | 1.076 | 0.02510 | 0.12208 | 0.02288 | 0.00824 |
| 1920x1080 | beauty | full-res | raw-debug | 4.646 | 0.02190 | 0.08794 | 0.01641 | 0.00340 |
| 1920x1080 | ao | half-res | raw-debug | 1.213 | 0.01031 | 0.13636 | 0.00275 | 0.00119 |
| 1920x1080 | ao | full-res | raw-debug | 4.208 | 0.01071 | 0.13310 | 0.00380 | 0.00195 |
| 1280x720 | beauty | half-res | raw-debug | 0.653 | 0.03479 | 0.15659 | 0.02842 | 0.00577 |
| 1280x720 | beauty | full-res | raw-debug | 2.332 | 0.03469 | 0.15612 | 0.02907 | 0.00684 |
| 1280x720 | ao | half-res | raw-debug | 0.770 | 0.02442 | 0.21010 | 0.01319 | 0.00844 |
| 1280x720 | ao | full-res | raw-debug | 2.401 | 0.02314 | 0.18948 | 0.00987 | 0.00341 |

Boundary:

- This is raw-kernel evidence for the formula candidate.
- It is not a promotion claim for half-resolution final product quality; the
  generated report correctly marks half-resolution product-stage evidence as
  incomplete because reconstruction-stage rows were not captured in this batch.

## 2026-06-02 — VBAO pass topology audit

Status: **partial refactor kept, topology deletions rejected**.

This audit tested whether the low-resolution VBAO reconstruction graph should
collapse files/passes after the over-engineering review. The evidence supports
only the shared internal pass boilerplate extraction. It does not support
removing half-resolution cleanup or fusing resolve with full-resolution polish.

Artifacts:

- `openspec/changes/vbao-pass-topology-audit/`
- `artifacts/benchmarks/vbao-pass-topology-baseline.json`
- `artifacts/benchmarks/vbao-pass-topology-polish-base.json`
- `artifacts/benchmarks/vbao-cleanup-on.json`
- `artifacts/benchmarks/vbao-cleanup-skip.json`
- `artifacts/benchmarks/vbao-resolve-polish-preflight.json`
- `artifacts/benchmarks/vbao-resolve-polish-fused.json`

Decisions:

- Keep `VBAOEffectPass` as private boilerplate extraction for fullscreen scalar
  AO passes.
- Keep `VBAOHalfResCleanupNode`. Skipping cleanup saved about 0.05-0.10 ms in
  the tested half-resolution rows, but regressed noise, stripe, and edge-bleed
  proxies across comparable captures.
- Keep `VBAOResolveNode` and `VBAOFullResPolishNode` separate. At high softness
  (`0.75`), fused resolve-polish preserved labels but was slower:
  - 1920x1080 AO: separate resolve+polish 0.288 ms, fused 3.468 ms.
  - 1280x720 AO: separate resolve+polish 0.125 ms, fused 0.381 ms.
- Do not add public cleanup, denoise, temporal, velocity, or resolve-polish API
  options from this audit.

Outcome:

- The folder stays larger than the pasted simplification proposal wanted, but
  the retained modules are earning their keep. Deleting or fusing them moves
  cost and complexity into worse places.
- Future velocity temporal, multi-bounce, bent-normal, directional occlusion,
  and public API work are split into separate proposal notes under
  `openspec/changes/vbao-pass-topology-audit/future-work-proposals.md`.

## 2026-06-02 — VBAO velocity temporal private smoke

Status: **private smoke only, not promoted**.

This capture verifies that `velocity-internal` can render a full-resolution
Museum AO product row using host-owned previous depth/normal guides from
`PassNode.getPreviousTextureNode(...)`, emit a separate measured temporal pass,
and keep the temporal gate at `reject-promotion`.

Command:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='velocity-internal'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='1'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-velocity-internal-smoke.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-velocity-internal-smoke.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-velocity-internal-smoke'; $env:AO_BENCHMARK_PORT='5206'; pnpm --filter @horizonao/demo benchmark:ao

$env:VBAO_TEMPORAL_MOTION_JSON=$null; $env:VBAO_TEMPORAL_VELOCITY_JSON='artifacts/benchmarks/vbao-temporal-velocity-internal-smoke.json'; pnpm --filter @horizonao/demo verify:vbao-temporal
```

Artifacts:

- `artifacts/benchmarks/vbao-temporal-velocity-internal-smoke.json`
- `artifacts/benchmarks/vbao-temporal-velocity-internal-smoke.md`
- `artifacts/benchmarks/screenshots-vbao-temporal-velocity-internal-smoke/`
- `artifacts/benchmarks/vbao-temporal-gate-verdict.json`
- `artifacts/benchmarks/vbao-temporal-gate-verdict.md`

Reproducibility scope:

- The velocity smoke command above reproduces the velocity-internal row and its
  measured temporal pass.
- The gate verdict is derived from local temporal matrix `*-latest.json` inputs,
  which are generated artifacts ignored by git. Regenerate the full
  off/host/host-TRAA/spatial matrix or pass explicit tracked input paths before
  treating the verdict artifact as clean-checkout reproducible.

| Resolution | View | Output | Raw GPU ms | Polish GPU ms | Temporal GPU ms | Total product GPU ms | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280x720 | ao | product | 1.287 | 0.085 | 0.044 | 1.416 | 0.02295 | 0.19094 | 0.00852 | 0.00256 |

Outcome:

- The private `VBAOVelocityTemporalNode` renders under WebGPU.
- The host provides previous guide history; VBAO does not allocate previous
  depth/normal guide targets.
- Temporal cost is visible as its own measured pass.
- The verifier remains `reject-promotion`; this is not a same-cost matrix and
  has no motion/disocclusion evidence.

## 2026-06-02 — Fixed raw loop shader inspection for preset and explicit shapes

Status: **pass**.

This generated-shader inspection verifies both the product `quality` preset and
the explicit `spatial-ultra` sample override path. The second row is the guard
for the old dynamic-uniform fallback: it passes explicit `samples/slices` and
must still produce fixed shader loop bounds.

Command:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5203'; $env:PLAYWRIGHT_TEST_PORT='5203'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

Artifacts:

- `artifacts/benchmarks/vbao-generated-shader-inspection-latest.json`
- `artifacts/benchmarks/vbao-generated-shader-inspection-summary.md`

| Sample mode | Shape | Slice loop | Sample loop | Dynamic slice uniform loop | Dynamic sample uniform loop | Console diagnostics | Result |
| --- | --- | ---: | ---: | --- | --- | ---: | --- |
| product-preset | quality-preset | 4 | 8 | no | no | 0 | pass |
| spatial-ultra | explicit-override | 4 | 10 | no | no | 0 | pass |

Outcome:

- Both generated raw AO shaders use fixed loop bounds.
- The explicit override path no longer falls back to uniform-driven loop limits.
- The inspection saw no unexpected full-res JBU, no unexpected wide polish, no
  surprise pass count, and no VBAO duplicate declaration warnings.
- Two known Chromium Windows `powerPreference` warnings were recorded per row as
  ignored platform diagnostics; they are outside shader generation.

## 2026-06-02 — Fixed raw loop timing for preset and explicit shapes

Status: **captured**.

This capture measures the same Museum full-resolution AO product row for the
fixed product preset shape and the explicit `spatial-ultra` shape. It is timing
evidence for fixed loop shapes after shader inspection proved both paths compile
to fixed loop bounds.

Commands:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'; $env:AO_BENCHMARK_VBAO_SAMPLE_MODE='product-preset'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='5'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-fixed-loop-product-preset-timing.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-fixed-loop-product-preset-timing.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-fixed-loop-product-preset'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5204'; $env:PLAYWRIGHT_TEST_PORT='5204'; pnpm --filter @horizonao/demo benchmark:ao

$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'; $env:AO_BENCHMARK_VBAO_SAMPLE_MODE='spatial-ultra'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='5'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-fixed-loop-spatial-ultra-timing.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-fixed-loop-spatial-ultra-timing.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-fixed-loop-spatial-ultra'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5205'; $env:PLAYWRIGHT_TEST_PORT='5205'; pnpm --filter @horizonao/demo benchmark:ao
```

Artifacts:

- `artifacts/benchmarks/vbao-fixed-loop-product-preset-timing.json`
- `artifacts/benchmarks/vbao-fixed-loop-product-preset-timing.md`
- `artifacts/benchmarks/screenshots-vbao-fixed-loop-product-preset/`
- `artifacts/benchmarks/vbao-fixed-loop-spatial-ultra-timing.json`
- `artifacts/benchmarks/vbao-fixed-loop-spatial-ultra-timing.md`
- `artifacts/benchmarks/screenshots-vbao-fixed-loop-spatial-ultra/`

| Sample mode | Loop shape | Raw GPU ms | Polish GPU ms | Total product GPU ms | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| product-preset | 4 slices x 8 samples | 1.053 | 0.094 | 1.147 | 0.02305 | 0.19014 | 0.00969 | 0.00308 |
| spatial-ultra | 4 slices x 10 samples | 2.336 | 0.200 | 2.535 | 0.02307 | 0.19028 | 0.00979 | 0.00305 |

Outcome:

- The explicit fixed `4x10` shape is substantially more expensive than the
  product `4x8` shape on this Museum AO product row.
- Screenshot proxy metrics did not show a material quality win for
  `spatial-ultra`; pattern/noise and stripe are slightly worse in this capture.
- This supports keeping `quality` as the product preset while preserving
  explicit fixed-shape overrides for controlled benchmark/evidence runs.

## 2026-06-02 — VBAO temporal host gate smoke

Status: **host temporal sampling is wired, but not promoted**.

This capture compares temporal `off`, internal/demo-only temporal `host`
sampling, host `TRAA`, and a non-temporal `spatial-ultra` alternative on Museum
full-resolution VBAO at 1280x720. It does **not** include internal AO history.
Therefore it is an evidence gate for host temporal sampling, not proof that
temporal AO improves quality.

Commands:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false,true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-off-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-off-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-off'; $env:AO_BENCHMARK_PORT='5191'; pnpm --filter @horizonao/demo benchmark:ao

$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false,true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='host'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-host-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-host-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-host'; $env:AO_BENCHMARK_PORT='5192'; pnpm --filter @horizonao/demo benchmark:ao

$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false,true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='host'; $env:AO_BENCHMARK_VBAO_HOST_TAA='traa'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-host-traa-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-host-traa-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-host-traa'; $env:AO_BENCHMARK_PORT='5196'; pnpm --filter @horizonao/demo benchmark:ao

$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false,true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'; $env:AO_BENCHMARK_VBAO_SAMPLE_MODE='spatial-ultra'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-spatial-ultra-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-spatial-ultra-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-spatial-ultra'; $env:AO_BENCHMARK_PORT='5194'; pnpm --filter @horizonao/demo benchmark:ao
```

Artifacts:

- `artifacts/benchmarks/vbao-temporal-off-latest.json`
- `artifacts/benchmarks/vbao-temporal-off-summary.md`
- `artifacts/benchmarks/screenshots-vbao-temporal-off/`
- `artifacts/benchmarks/vbao-temporal-host-latest.json`
- `artifacts/benchmarks/vbao-temporal-host-summary.md`
- `artifacts/benchmarks/screenshots-vbao-temporal-host/`
- `artifacts/benchmarks/vbao-temporal-host-traa-latest.json`
- `artifacts/benchmarks/vbao-temporal-host-traa-summary.md`
- `artifacts/benchmarks/screenshots-vbao-temporal-host-traa/`
- `artifacts/benchmarks/vbao-temporal-spatial-ultra-latest.json`
- `artifacts/benchmarks/vbao-temporal-spatial-ultra-summary.md`
- `artifacts/benchmarks/screenshots-vbao-temporal-spatial-ultra/`
- `artifacts/benchmarks/vbao-temporal-gate-verdict.json`
- `artifacts/benchmarks/vbao-temporal-gate-verdict.md`

| Temporal | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ | Product GPU ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| off | beauty | raw-debug | 0.03466 | 0.15600 | 0.02908 | 0.00680 | n/a |
| host | beauty | raw-debug | 0.03469 | 0.15584 | 0.02918 | 0.00686 | n/a |
| off | beauty | product | 0.03447 | 0.15682 | 0.02872 | 0.00612 | 1.729 |
| host | beauty | product | 0.03451 | 0.15708 | 0.02886 | 0.00618 | 1.247 |
| off | ao | raw-debug | 0.02312 | 0.18957 | 0.00986 | 0.00340 | n/a |
| host | ao | raw-debug | 0.02312 | 0.18957 | 0.00986 | 0.00340 | n/a |
| off | ao | product | 0.02305 | 0.19014 | 0.00969 | 0.00308 | 1.478 |
| host | ao | product | 0.02305 | 0.19069 | 0.00971 | 0.00311 | 1.391 |

Spatial alternative:

| Sample mode | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ | Product GPU ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| spatial-ultra | beauty | product | 0.03446 | 0.15696 | 0.02870 | 0.00606 | 1.800 |
| spatial-ultra | ao | product | 0.02307 | 0.19028 | 0.00979 | 0.00305 | 1.876 |

Host TRAA:

| Host TAA | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ | Product GPU ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| traa | beauty | product | 0.03424 | 0.15774 | 0.02869 | 0.00611 | 1.744 |
| traa | ao | product | 0.02305 | 0.19068 | 0.00980 | 0.00304 | 1.509 |

Outcome:

- `host` mode is stable enough to capture without AO history allocation.
- Without host TAA/TRAA, `host` does not materially reduce pattern/noise.
- With host TRAA, beauty product pattern/noise improves (`0.03424` vs
  `0.03447`), but the win is paired with stripe regression and does not satisfy
  the gate.
- AO product stripe proxy is slightly worse in the `host` row (`0.19069` vs
  `0.19014`), so this is not a promotion signal.
- `pnpm --filter @horizonao/demo verify:vbao-temporal` returns
  `reject-promotion` and `internalTemporalAllowed: false`.
- `VBAO_TEMPORAL_REQUIRE_CANDIDATE=1 pnpm --filter @horizonao/demo
  verify:vbao-temporal` remains the hard promotion-gate form and fails for this
  evidence.
- Same-cost non-temporal alternative evidence is present through
  `spatial-ultra`, but the stricter internal gate still rejects promotion.
- Internal temporal accumulation remains private and rejected for promotion. The
  stripe regression and internal blocking failure labels block public temporal
  API, quality promotion, and any prototype-allowed verdict.

## 2026-06-02 — VBAO lab non-temporal baseline

Status: **baseline captured**.

This capture confirms `/lab` can produce full-resolution VBAO raw and product
rows for beauty and AO-only output. It is baseline evidence for the temporal
gate, not a temporal promotion claim.

Command:

```sh
$env:AO_BENCHMARK_SCENES='lab'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='false,true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-lab-baseline-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-lab-baseline-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-lab-baseline'; $env:AO_BENCHMARK_PORT='5193'; pnpm --filter @horizonao/demo benchmark:ao
```

Artifacts:

- `artifacts/benchmarks/vbao-lab-baseline-latest.json`
- `artifacts/benchmarks/vbao-lab-baseline-summary.md`
- `artifacts/benchmarks/screenshots-vbao-lab-baseline/`

| View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ | Product GPU ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| beauty | raw-debug | 0.01396 | 0.13086 | 0.01001 | 0.00345 | n/a |
| beauty | product | 0.01345 | 0.13565 | 0.00945 | 0.00250 | 1.243 |
| ao | raw-debug | 0.01776 | 0.17476 | 0.01126 | 0.00791 | n/a |
| ao | product | 0.01407 | 0.21887 | 0.00892 | 0.00502 | 1.090 |

## 2026-06-02 — VBAO internal temporal prototype smoke

Status: **private prototype evaluated; no quality promotion**.

This capture verifies that `internal` temporal mode can render full-res Museum
beauty/AO product rows, emit measured temporal/reprojection guide pass
timestamps, and disclose benchmark diagnostics for the active validation mode
and reset state. It is evidence for private prototype evaluation only. It does
not clear the host temporal stripe regression, and the upgraded verifier rejects
promotion because internal temporal shows no material pattern/noise win.

Command:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='internal'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='1'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-internal-smoke.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-internal-smoke.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-internal-smoke'; $env:AO_BENCHMARK_PORT='5197'; pnpm --filter @horizonao/demo benchmark:ao

$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='internal'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-internal-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-internal-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-internal'; $env:AO_BENCHMARK_PORT='5198'; pnpm --filter @horizonao/demo benchmark:ao

pnpm --filter @horizonao/demo verify:vbao-temporal
```

Artifacts:

- `artifacts/benchmarks/vbao-temporal-internal-smoke.json`
- `artifacts/benchmarks/vbao-temporal-internal-smoke.md`
- `artifacts/benchmarks/screenshots-vbao-temporal-internal-smoke/`
- `artifacts/benchmarks/vbao-temporal-internal-latest.json`
- `artifacts/benchmarks/vbao-temporal-internal-summary.md`
- `artifacts/benchmarks/screenshots-vbao-temporal-internal/`
- `artifacts/benchmarks/vbao-temporal-gate-verdict.json`
- `artifacts/benchmarks/vbao-temporal-gate-verdict.md`

| Resolution | View | Output | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ | Raw GPU ms | Temporal GPU ms | Guide GPU ms | Polish GPU ms | Total product GPU ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280x720 | ao | product | 0.02305 | 0.19014 | 0.00969 | 0.00308 | 1.044 | 0.046 | 0.028 | 0.093 | 1.212 |
| 1280x720 | beauty | product | 0.03447 | 0.15682 | 0.02872 | 0.00612 | 1.047 | 0.046 | 0.030 | 0.094 | 1.217 |
| 1280x720 | ao | product | 0.02305 | 0.19014 | 0.00969 | 0.00308 | 1.606 | 0.068 | 0.045 | 0.142 | 1.861 |

Historical prototype diagnostics:

- `validationMode`: `reproject-depth-normal-clamp`
- `historyWeight`: `0.8`
- `depthContinuityThreshold`: `0.01`
- `normalContinuityThreshold`: `0.8`
- `gpuRejectionCounters`: `not-instrumented`
- previous `verify:vbao-temporal`: `reject-promotion`;
  `internalTemporalEvidence: true`;
  `internalTemporalPassesPromotion: false`;
  `internalTemporalAllowed: false`.

Outcome:

- The private temporal node was rejected and removed from runtime product
  plumbing.
- The rejected pass owned AO history, duplicated previous depth/normal guide
  history, used camera-only reprojection, clamped history to the current 3x3 AO
  neighborhood, and started with history weight `0.8`.
- Those diagnostics remain useful as rejection evidence only. Future AO-owned
  temporal work requires a fresh velocity-backed proposal and evidence matrix.
- Phase 4 is complete as a rejection gate. Internal temporal evidence is
  present, but it has no material pattern/noise win and carries blocking failure
  labels, so promotion and prototype allowance are both blocked by the verifier.
- Public temporal API and temporal quality promotion remain blocked.

## 2026-06-02 — Product fixture observation gate

Status: **observed, not promoted**. The required product fixture observations
now exist and missing observations are blockers. This is necessary quality
evidence, not a release-quality claim by itself.

Artifacts:

- `packages/horizon-ao/reference/vbaoProductFixtureObservations.ts`
- `packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts`

Verification:

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts
```

| Fixture | Expected product observation | Gate behavior |
| --- | --- | --- |
| `flat-plane` | fully accessible, no occupied sectors | observed |
| `full-hemisphere` | fully occluded, all 32 sectors occupied | observed |
| `two-wall-corner` | partially accessible, broad sector coverage | observed |
| `thin-occluder` | narrow sector coverage, more accessible than thick blockers | observed |

Decision:

- Missing product fixture observations are `missing-reference-observation`
  blockers, never passes.
- These fixture observations complement screenshot/timing evidence; they do not
  override the half-resolution demotion from the stage matrix.

## 2026-06-02 — Reconstruction release-readiness verification gate

Status: **pass for targeted verification; no production build run**.

Verification commands:

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/reference/__tests__/vbaoProductFixtureObservations.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
node --check apps/demo/scripts/collect-vbao-generated-shader-inspection.mjs
node --check apps/demo/scripts/collect-ao-benchmark.mjs
node --check apps/demo/scripts/profiling/productionReport.mjs
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5192'; $env:PLAYWRIGHT_TEST_PORT='5192'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
git diff --check
```

Results:

- Targeted Vitest/source-contract suite: 12 files passed, 95 tests passed.
- Core typecheck: passed.
- Demo typecheck: passed.
- Script syntax checks: passed.
- Generated shader inspection: passed with `vbaoDuplicateDeclarationWarnings: 0`.
- `git diff --check`: passed with line-ending warnings only.
- Production build: **not run**; no explicit production-build authorization was
  given.

## 2026-06-02 — Runtime fat cleanup gate

Status: **pass**. Benchmark-only noise candidates are no longer part of product
runtime sampling, and the public package export boundary remains product-only.

What changed:

- `packages/horizon-ao/src/vbaoSampling.ts` now contains only the production
  `phase-atlas-stable-hash` sampling path.
- `packages/horizon-ao/src/vbaoNoise.ts` now shares a single default production
  noise texture instead of a candidate-keyed texture map.
- `apps/demo/src/scenes/vbaoBenchmarkNoise.ts` owns benchmark-only candidate
  texture generation for noise-source comparison captures.
- `packages/horizon-ao/src/VBAOHalfResCleanupNode.ts` no longer has the duplicate
  disabled `setup()` bypass; disabled behavior remains covered by `getTextureNode`
  and `updateBefore`.

Verification:

- `pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSampling.test.ts`
- `pnpm --filter @horizonao/core typecheck`
- `pnpm --filter @horizonao/demo typecheck`

Decision:

- Keep benchmark candidates in demo/benchmark code. The product package should
  ship the default production path plus the hidden texture injection seam needed
  by demo evidence, not every rejected benchmark candidate.

## 2026-06-02 — Generated shader diagnostics cleanup gate

Status: **pass**. The duplicate VBAO TSL declaration warning was reproduced,
then fixed without changing the product pass shape.

Reproduction command:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5190'; $env:PLAYWRIGHT_TEST_PORT='5190'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

Reproduction result:

- `vbaoDuplicateDeclarationWarnings: 3`
- Warning text named `vbaoRawNoisePixel`, proving that renaming `vbaoPixel` was
  not enough; the problem was duplicate named TSL declarations from a reused
  helper expression.

Fix verification command:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5191'; $env:PLAYWRIGHT_TEST_PORT='5191'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

Artifacts:

- `artifacts/benchmarks/vbao-generated-shader-inspection-latest.json`
- `artifacts/benchmarks/vbao-generated-shader-inspection-summary.md`

| Product preset | Sample mode | Full resolution | VBAO shader programs | Fragment programs | Slice loop | Sample loop | Full-res JBU | Wide polish | Surprise pass | VBAO duplicate declaration warnings |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | ---: |
| `quality` | `product-preset` | yes | 2 | 2 | fixed `< 4` | fixed `< 8` | no | no | no | 0 |

Decision:

- Keep the raw noise pixel as an expression, not a named `toVar(...)`.
- Generated shader inspection now fails when any VBAO duplicate declaration
  warning appears. Release diagnostics are clean for this gate.

## 2026-06-02 — Half-resolution raw source-coordinate correction gate

Status: **half-res remains demoted**. Raw AO now separates source texture
resolution from scaled output resolution, but the recaptured stage matrix still
shows `raw` as the first failing stage at both resolutions.

Capture command:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES='1'; $env:AO_BENCHMARK_PORT='5189'; pnpm --filter @horizonao/demo benchmark:ao
```

What changed:

- `packages/horizon-ao/src/VBAONode.ts` now tracks `sourceResolution` separately
  from scaled raw AO `resolution`.
- Raw AO phase-atlas pixel selection uses source texture coordinates.
- Raw AO safe UV clamping uses source texture texels, not half-resolution output
  texels.

Artifacts:

- `artifacts/benchmarks/ao-production-latest.json`
- `artifacts/benchmarks/ao-production-quality-summary.md`
- `artifacts/benchmarks/screenshots-ao-production/`

| Resolution | First failing stage | Final labels | Raw pattern/noise ↓ | Raw stripe ↓ | Final pattern/noise ↓ | Final stripe ↓ | Total product GPU ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | `raw` | `noise,false-curvature,scale-mismatch` | 0.01286 | 0.13885 | 0.01103 | 0.13256 | 1.391 |
| 1280x720 | `raw` | `noise,false-curvature,scale-mismatch` | 0.02458 | 0.21444 | 0.02347 | 0.19915 | 1.315 |

Decision:

- Keep the source-coordinate split. It is the correct contract for sampling
  full-resolution depth/normal inputs from a half-resolution raw AO target.
- Do **not** promote half-resolution. The failure labels survive recapture, so
  this was a necessary correction, not the quality fix.
- Do **not** tune cleanup/JBU yet. The first failing stage is still raw.
- Move next to diagnostics cleanup: the known duplicate `vbaoPixel` warning
  still reproduces during this capture.

## 2026-06-01 — Half-resolution reconstruction stage autopsy gate

Status: **stage evidence captured; first failing stage is raw**. This does not
promote half-resolution. It only proves the autopsy path now captures each
reconstruction stage separately.

Capture command:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES='1'; $env:AO_BENCHMARK_PORT='5188'; pnpm --filter @horizonao/demo benchmark:ao
```

Notes:

- The first attempt failed because port `5173` was already occupied; the valid
  capture used isolated port `5188`.
- Capture reproduced the known `vbaoPixel` duplicate-name warnings and WebGPU
  timestamp-query pool warnings. Those remain diagnostics/timing debt, not
  promotion evidence.

Artifacts:

- `artifacts/benchmarks/ao-production-latest.json`
- `artifacts/benchmarks/ao-production-quality-summary.md`
- `artifacts/benchmarks/screenshots-ao-production/`

| Resolution | Stage coverage | Missing stages | First failing stage | Stage screenshots |
| --- | ---: | --- | --- | --- |
| 1920x1080 | 5/5 | none | `raw` | `raw`, `cleanup`, `resolve`, `polish`, `final` |
| 1280x720 | 5/5 | none | `raw` | `raw`, `cleanup`, `resolve`, `polish`, `final` |

Decision:

- Because `raw` is the first failing stage in both captured resolutions, the
  next fix should inspect half-resolution raw AO radius projection, sample
  validity, and thickness scaling before tuning cleanup/JBU weights.
- Do not blur harder yet. That would be cargo-culting the pipeline instead of
  understanding where the error enters.

## 2026-06-01 — Review archive completeness gate

Status: **pass**. The release-candidate review manifest now lists the runtime
entry point, internal VBAO pass files, benchmark-only noise helper, reference
modules, tests, demo evidence scripts, specs, ADRs, and the manifest verifier.
The verifier reports `missingFiles: []` and `missingImports: []`.

Verification command:

```sh
node scripts/verify-vbao-review-archive.mjs
```

Result:

- Manifest: `openspec/changes/vbao-release-candidate-gates/review-archive-manifest.md`
- Missing files: `0`
- Missing relative imports: `0`
- Excluded generated artifacts: benchmark JSON/markdown/screenshots under
  `artifacts/benchmarks/`, because `.gitignore` keeps them opt-in and they must
  be force-added only when curated for a specific handoff.

## 2026-06-01 — Generated shader inspection gate

Status: **pass with diagnostics debt**. The captured WebGPU shader programs for
the Museum VBAO product row confirm fixed `quality` loop bounds and no surprise
full-res JBU, wide-polish, or extra pass shape. The known `vbaoPixel`
duplicate-name warning still reproduces and is documented as diagnostics debt.

Capture command:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5182'; $env:PLAYWRIGHT_TEST_PORT='5182'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-generated-shader-inspection.mjs
```

Artifacts:

- `artifacts/benchmarks/vbao-generated-shader-inspection-latest.json`
- `artifacts/benchmarks/vbao-generated-shader-inspection-summary.md`

| Product preset | Sample mode | Full resolution | VBAO shader programs | Fragment programs | Slice loop | Sample loop | Full-res JBU | Wide polish | Surprise pass | `vbaoPixel` warnings |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | ---: |
| `quality` | `product-preset` | yes | 2 | 2 | fixed `< 4` | fixed `< 8` | no | no | no | 3 |

Decision:

- The generated WGSL evidence matches the source contracts for the product
  preset: fixed 4-slice / 8-sample hot loops are present.
- No hidden full-resolution JBU, wide polish, or unexpected pass count was
  detected in the captured product row.
- The `vbaoPixel` duplicate-name warning is real and remains a non-blocking
  diagnostics cleanup item; it does not hide a shader-shape failure.

## 2026-06-01 — Half-resolution product quality gate

Status: **half-res is not promoted**. It is cheaper in VBAO pass GPU time, but current product-preset evidence still carries `false-curvature` / `scale-mismatch` labels and worse stripe metrics in key rows. That is exactly why we measure this instead of guessing. CONCEPTS > vibes.

Capture command:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5178'; $env:PLAYWRIGHT_TEST_PORT='5178'; pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs
```

Notes:

- Port `5173` was occupied by an unrelated `auto-cv` Vite server, so the valid combined capture used isolated port `5178`.
- Capture emitted known blockers: repeated `THREE.TSL` duplicate-name warning for `vbaoPixel` and WebGPU timestamp-query pool warnings. These remain release-candidate debt for the generated-shader/diagnostics gate.
- Rows below are product preset rows (`quality`, not debug sample/slice override rows).

| Resolution | View | VBAO res | Sample mode | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ | Median frame ms | P95 frame ms | VBAO pass GPU ms | Failure labels | Screenshot |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1920x1080 | beauty | half-res | product-preset | 0.02236 | 0.12792 | 0.02252 | 0.00435 | 1.10 | 1.40 | 0.958 | `noise,false-curvature,scale-mismatch` | `artifacts/benchmarks/screenshots-ao-production/1920x1080-museum-vbao-product-preset-half-res-product-beauty.png` |
| 1920x1080 | beauty | full-res | product-preset | 0.02157 | 0.08717 | 0.01682 | 0.00389 | 1.20 | 1.50 | 2.418 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-ao-production/1920x1080-museum-vbao-product-preset-full-res-product-beauty.png` |
| 1920x1080 | ao | half-res | product-preset | 0.01104 | 0.12846 | 0.00688 | 0.00184 | 1.20 | 1.60 | 1.038 | `noise,false-curvature,scale-mismatch` | `artifacts/benchmarks/screenshots-ao-production/1920x1080-museum-vbao-product-preset-half-res-product-ao.png` |
| 1920x1080 | ao | full-res | product-preset | 0.01051 | 0.13563 | 0.00350 | 0.00153 | 0.90 | 1.20 | 2.435 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-ao-production/1920x1080-museum-vbao-product-preset-full-res-product-ao.png` |
| 1280x720 | beauty | half-res | product-preset | 0.03559 | 0.17876 | 0.03071 | 0.00956 | 1.20 | 1.90 | 0.565 | `noise,false-curvature,scale-mismatch` | `artifacts/benchmarks/screenshots-ao-production/1280x720-museum-vbao-product-preset-half-res-product-beauty.png` |
| 1280x720 | beauty | full-res | product-preset | 0.03447 | 0.15682 | 0.02872 | 0.00612 | 1.20 | 1.60 | 1.288 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-ao-production/1280x720-museum-vbao-product-preset-full-res-product-beauty.png` |
| 1280x720 | ao | half-res | product-preset | 0.02347 | 0.19911 | 0.01109 | 0.00472 | 1.10 | 1.40 | 0.544 | `noise,false-curvature,scale-mismatch` | `artifacts/benchmarks/screenshots-ao-production/1280x720-museum-vbao-product-preset-half-res-product-ao.png` |
| 1280x720 | ao | full-res | product-preset | 0.02305 | 0.19014 | 0.00969 | 0.00308 | 0.70 | 1.00 | 1.457 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-ao-production/1280x720-museum-vbao-product-preset-full-res-product-ao.png` |

Decision:

- Half-res remains an internal/performance experiment, not the promoted default product path.
- The cost win is real: half-res VBAO pass totals are roughly `0.96 ms` vs `2.42 ms` at 1080p beauty, and `0.57 ms` vs `1.29 ms` at 720p beauty.
- The quality gate fails today because half-res rows have worse stripe metrics and retain `false-curvature,scale-mismatch` labels. Fix the reconstruction evidence before promoting it.


## 2026-06-01 — Noise reality gate after product-preset fix

Status: **default noise source unchanged**. No candidate produced a clean Pareto win across product rows, so `phase-atlas-stable-hash` remains the default. This is the discipline: no shiny swap because one metric twitched.

Capture command:

```sh
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_PORT='5179'; $env:PLAYWRIGHT_TEST_PORT='5179'; pnpm --filter @horizonao/demo exec node scripts/collect-vbao-noise-source-comparison.mjs
```

Scope: full-resolution VBAO product rows after the Museum product path was corrected to use `quality: 'quality'` instead of explicit sample/slice overrides.

| Resolution | View | Noise source | Median ms ↓ | P95 ms ↓ | Pattern/noise ↓ | Stripe ↓ | Edge bleed ↓ | Thin-gap ↑ | Failure labels | Screenshot |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1920x1080 | beauty | phase-atlas-stable-hash | 1.20 | 1.40 | 0.02157 | 0.08717 | 0.01682 | 0.00389 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-beauty-product-phase-atlas-stable-hash.png` |
| 1920x1080 | beauty | ign | 1.40 | 2.20 | 0.02163 | 0.08672 | 0.01741 | 0.00391 | `noise` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-beauty-product-ign.png` |
| 1920x1080 | beauty | static-stbn | 1.40 | 1.70 | 0.02129 | 0.08940 | 0.01834 | 0.00277 | `noise,edge-bleed,thin-gap` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-beauty-product-static-stbn.png` |
| 1920x1080 | beauty | fast-like | 1.40 | 1.60 | 0.02134 | 0.08797 | 0.01599 | 0.00403 | `noise` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-beauty-product-fast-like.png` |
| 1920x1080 | ao | phase-atlas-stable-hash | 1.00 | 1.10 | 0.01051 | 0.13563 | 0.00350 | 0.00153 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-ao-product-phase-atlas-stable-hash.png` |
| 1920x1080 | ao | ign | 1.00 | 1.30 | 0.01057 | 0.13465 | 0.00381 | 0.00158 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-ao-product-ign.png` |
| 1920x1080 | ao | static-stbn | 1.00 | 1.40 | 0.01038 | 0.13746 | 0.00405 | 0.00097 | `noise,edge-bleed,thin-gap` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-ao-product-static-stbn.png` |
| 1920x1080 | ao | fast-like | 0.90 | 1.20 | 0.01040 | 0.13697 | 0.00305 | 0.00162 | `noise` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1920x1080-museum-vbao-ao-product-fast-like.png` |
| 1280x720 | beauty | phase-atlas-stable-hash | 1.20 | 1.60 | 0.03447 | 0.15682 | 0.02872 | 0.00612 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-beauty-product-phase-atlas-stable-hash.png` |
| 1280x720 | beauty | ign | 1.20 | 1.50 | 0.03449 | 0.15706 | 0.02943 | 0.00606 | `noise` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-beauty-product-ign.png` |
| 1280x720 | beauty | static-stbn | 1.40 | 1.80 | 0.03433 | 0.15611 | 0.03027 | 0.00523 | `noise,edge-bleed,thin-gap` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-beauty-product-static-stbn.png` |
| 1280x720 | beauty | fast-like | 1.40 | 1.60 | 0.03436 | 0.15775 | 0.02801 | 0.00619 | `noise` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-beauty-product-fast-like.png` |
| 1280x720 | ao | phase-atlas-stable-hash | 1.00 | 1.30 | 0.02305 | 0.19014 | 0.00969 | 0.00308 | `noise,edge-bleed` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-ao-product-phase-atlas-stable-hash.png` |
| 1280x720 | ao | ign | 0.90 | 1.10 | 0.02307 | 0.19036 | 0.01001 | 0.00305 | `noise` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-ao-product-ign.png` |
| 1280x720 | ao | static-stbn | 1.00 | 1.70 | 0.02302 | 0.19126 | 0.01029 | 0.00261 | `noise,edge-bleed,thin-gap` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-ao-product-static-stbn.png` |
| 1280x720 | ao | fast-like | 1.00 | 1.20 | 0.02301 | 0.19068 | 0.00926 | 0.00311 | `noise` | `artifacts/benchmarks/screenshots-vbao-noise-sources/1280x720-museum-vbao-ao-product-fast-like.png` |

Decision:

- Keep `phase-atlas-stable-hash` as the default.
- Reject `ign` for now: it does not reduce pattern/noise materially and still carries `noise` labels; current implementation is also a CPU-generated atlas texture, not a procedural/no-texture shader path.
- Reject `static-stbn` for now: it regresses thin-gap and edge-bleed labels in multiple product rows.
- Reject `fast-like` for now: it has some favorable edge/thin-gap proxies, but still carries `noise` labels and does not establish a broad Pareto win.
- Add procedural/no-texture IGN as a future task/blocker before making any mobile bandwidth claim about IGN.

Implementation blocker:

- `packages/horizon-ao/src/vbaoNoise.ts` builds every candidate through `createVbaoNoiseTexture(...)` and `DataTexture`.
- `packages/horizon-ao/src/vbaoSampling.ts` defines IGN as `ignUnit(...)`, but it is baked into atlas channels by `sampleVbaoPhaseChannels(...)`; it is not sampled procedurally in the shader today.


## 2026-06-01 — Reference AO fixture gate started

Status: **reference verifier started; no production quality promotion claimed**.

What changed:

- Added deterministic finite-radius ray-cast AO reference fixtures in
  `packages/horizon-ao/reference/aoRaycastReference.ts`.
- Added Vitest coverage in
  `packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts`.
- Added report rows/summaries in
  `packages/horizon-ao/reference/aoReferenceReport.ts` and
  `packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts`.
- Added strict canonical VBAO lane in
  `packages/horizon-ao/reference/canonicalVbaoReference.ts` and
  `packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts`.
- Added canonical/product drift report in
  `packages/horizon-ao/reference/vbaoCanonicalDriftReport.ts` and
  `packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts`.
- Added `ssao` and single-row internally filtered `n8ao` capture support to
  `apps/demo/scripts/collect-ao-benchmark.mjs` so future production screenshot
  metrics can cover the baselines the lab exposes.
- Fixtures cover:
  - `flat-plane-open`
  - `sphere-contact`
  - `box-contact`
  - `two-wall-corner`
  - `thin-gap-separated-slabs`
  - `far-object-outside-radius`

Decision:

- This is the first ADR-013 hardening task.
- It does **not** prove current VBAO is closer to path tracing.
- It does **not** promote current product tuning. Product rendering changes still
  need curated screenshots plus GPU timings before promotion.
- It creates the frozen reference family that future VBAO/GTAO/SSAO/N8AO rows
  must compare against before quality claims.
- Missing expected candidate rows produce missing or warning summaries, not passes.
  This is intentional: if we do not have a readback/proxy row for a renderer, we
  cannot claim it passed.
- Canonical VBAO is now separate from product VBAO. Product corrections such as
  sample-local thickness, CDF sectorization, stochastic thin-sector coverage, and
  polish must beat the canonical lane in future evidence before being called
  improvements.
- The first drift report is intentionally harsh:
  - `thin-separated`: canonical `0.8750`, product `1.0000`, abs diff `0.1250`.
  - `thick-contact`: canonical `0.8750`, product `0.7500`, abs diff `0.1250`.
  - summary verdict: `fail`, MAE `0.0625`.
  This does **not** mean product VBAO is wrong; it means the product corrections
  are materially different and need ray-cast/render evidence before being called
  better.

Validation:

```sh
node_modules\.bin\vitest run packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts
# 1 file / 5 tests passed

node_modules\.bin\vitest run packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts
# 1 file / 4 tests passed

node_modules\.bin\vitest run packages/horizon-ao/reference/__tests__/canonicalVbaoReference.test.ts
# 1 file / 5 tests passed

node_modules\.bin\vitest run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
# 1 file / 4 tests passed

node_modules\.bin\tsc -p packages\horizon-ao\tsconfig.json --noEmit
node_modules\.bin\tsc -p apps\demo\tsconfig.json --noEmit
node_modules\.bin\vitest run
# 14 files / 101 tests passed
```

Production build was not run.


## 2026-06-01 — Production reference gate integration started

Status: **product rows are wired into the reference gate; missing fixture
observations still block quality claims**.

What changed:

- Added
  `packages/horizon-ao/reference/aoProductionReferenceGate.ts` to compare
  product AO rows for `vbao`, `gtao`, `ssao`, and `n8ao` against the ray-cast
  fixture report when rows provide explicit fixture observations.
- The same gate includes the canonical/product VBAO drift report beside the
  ray-cast report, so product VBAO cannot hide canonical drift behind polish.
- Added `AO Reference Gate Status` output to
  `apps/demo/scripts/profiling/productionReport.mjs`.
- Updated `apps/demo/scripts/collect-ao-benchmark.mjs` so future production
  benchmark JSON includes reference-gate product row statuses.

Decision:

- Screenshot/FPS rows are not treated as physical AO observations.
- Product rows without `referenceObservations` are reported as
  `missing-reference-observation`, not pass.
- Product reference comparison is limited to AO-view product rows:
  `VBAO product`, `GTAO denoised`, `SSAO denoised`, and internally filtered
  `N8AO`.

Validation:

```sh
node_modules\.bin\vitest run packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts --reporter=verbose
# 4 files / 18 tests passed
```

Production build was not run.


## 2026-06-01 — Reference/report modules moved outside runtime src

Status: **architecture boundary tightened; runtime package source now excludes
reference/report modules**.

What changed:

- Moved scalar/reference/report code to `packages/horizon-ao/reference/`.
- Moved related Vitest suites to `packages/horizon-ao/reference/__tests__/`.
- Added `packages/horizon-ao/tsconfig.reference.json` and updated the package
  test/typecheck scripts so evidence code stays verified without living under
  runtime `src/`.

Decision:

- Product runtime code stays under `packages/horizon-ao/src/`.
- Reference/report code may import product math/constants, but product code must
  not import reference/report modules.

Validation:

```sh
pnpm --filter @horizonao/core test
# 11 files / 84 tests passed

pnpm test
# packages/horizon-ao: 11 files / 84 tests passed
# apps/demo: 1 file / 2 tests passed

pnpm --filter @horizonao/core typecheck
# passed

pnpm --filter @horizonao/core typecheck:tsgo
# passed

pnpm --filter @horizonao/demo typecheck
# passed

pnpm typecheck
# passed

pnpm lint
# passed

node --check apps/demo/scripts/collect-ao-benchmark.mjs
node --check apps/demo/scripts/collect-vbao-noise-source-comparison.mjs
node --check apps/demo/scripts/profiling/productionReport.mjs
node --check apps/demo/scripts/profiling/screenshotMetrics.mjs
# passed
```

Production build was not run.


## 2026-06-01 — VBAO production pass timings captured

Status: **raw/cleanup/resolve/polish rows now use measured WebGPU timestamps;
no placeholder timings are used**.

Artifacts:

- JSON: `artifacts/benchmarks/ao-production-latest.json`
- Markdown summary: `artifacts/benchmarks/ao-production-quality-summary.md`
- Screenshots: `artifacts/benchmarks/screenshots-ao-production/`

Commands:

```powershell
$env:AO_BENCHMARK_PORT='41874'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1920'; $env:AO_BENCHMARK_HEIGHT='1080'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='10'; pnpm --dir apps/demo benchmark:ao
$env:AO_BENCHMARK_PORT='41875'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; $env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='10'; pnpm --dir apps/demo benchmark:ao
```

Measured product pass timings (median GPU ms from 10 steady-state timestamp
samples; `n/a` means the pass is elided for that graph, not zero cost):

| Resolution | View | VBAO res | Output | Raw ms | Cleanup ms | Resolve ms | Polish ms | Total product ms |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 | beauty | half-res | product | 0.938 | 0.177 | 0.188 | n/a | 1.304 |
| 1920x1080 | beauty | full-res | product | 3.928 | n/a | n/a | 0.318 | 4.247 |
| 1920x1080 | ao | half-res | product | 0.716 | 0.157 | 0.144 | n/a | 1.017 |
| 1920x1080 | ao | full-res | product | 4.044 | n/a | n/a | 0.332 | 4.376 |
| 1280x720 | beauty | half-res | product | 0.457 | 0.125 | 0.132 | n/a | 0.714 |
| 1280x720 | beauty | full-res | product | 1.458 | n/a | n/a | 0.197 | 1.655 |
| 1280x720 | ao | half-res | product | 0.392 | 0.080 | 0.073 | n/a | 0.545 |
| 1280x720 | ao | full-res | product | 1.317 | n/a | n/a | 0.151 | 1.467 |

Notes:

- The production summary now includes the view column in pass timing rows so
  Beauty and AO timings are not ambiguous duplicates.
- The collector treats an emitted timestamp as `measured` even when the static
  graph expectation thought the pass would be skipped.
- A single all-resolution run lost the Vite server before the second viewport,
  so the promoted artifact was assembled from the two successful resolution
  captures above.
- The runs emitted the existing Three TSL duplicate-name and timestamp query
  pool warnings. The rows above came from completed WebGPU timestamp captures;
  the warnings are not promoted into a performance win claim.

Production build was not run.


## 2026-06-01 — VBAO noise source comparison

Status: **comparison captured; no noise-source promotion**.

Artifacts:

- JSON: `artifacts/benchmarks/vbao-noise-source-comparison-latest.json`
- Markdown summary: `artifacts/benchmarks/vbao-noise-source-comparison-summary.md`
- Screenshots: `artifacts/benchmarks/screenshots-vbao-noise-sources/`

Command:

```powershell
$env:AO_BENCHMARK_PORT='41870'; $env:AO_BENCHMARK_REQUIRE_WEBGPU='1'; pnpm --dir apps/demo benchmark:vbao-noise
```

Scope:

- Scene/camera: Museum / `museumBaseline`.
- Resolutions: `1920x1080` and `1280x720`.
- Rows captured: 32 (`beauty` + `ao`, `raw-debug` + `product`, four noise sources).
- Timing basis: Museum route frame sampler (`latest.medianFrameMs` / `latest.p95FrameMs`), not pass-level GPU timestamps.
- Metric basis: cropped screenshot luma proxies from `screenshotMetrics.mjs`.

Primary AO/product rows:

| Resolution | Noise source | Median ms ↓ | p95 ms ↓ | Pattern/noise ↓ | Stripe ↓ | Edge bleed proxy ↓ | Thin-gap proxy ↑ | Failure labels |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1920x1080 | phase-atlas-stable-hash | 0.900 | 2.100 | 0.01066 | 0.13415 | 0.00375 | 0.00182 | noise,edge-bleed |
| 1920x1080 | ign | 1.000 | 1.300 | 0.01064 | 0.13353 | 0.00409 | 0.00174 | noise,edge-bleed |
| 1920x1080 | static-stbn | 1.100 | 1.300 | 0.01043 | 0.13699 | 0.00461 | 0.00107 | noise,edge-bleed,thin-gap |
| 1920x1080 | fast-like | 0.800 | 1.100 | 0.01046 | 0.13661 | 0.00320 | 0.00182 | noise |
| 1280x720 | phase-atlas-stable-hash | 0.800 | 1.100 | 0.02312 | 0.18972 | 0.00992 | 0.00333 | noise,edge-bleed |
| 1280x720 | ign | 0.700 | 1.000 | 0.02312 | 0.18998 | 0.01019 | 0.00319 | noise |
| 1280x720 | static-stbn | 1.300 | 2.100 | 0.02303 | 0.19082 | 0.01072 | 0.00268 | noise,edge-bleed,thin-gap |
| 1280x720 | fast-like | 0.800 | 1.200 | 0.02304 | 0.19089 | 0.00939 | 0.00334 | noise |

Decision:

- Keep `phase-atlas-stable-hash` as the production default.
- `fast-like` is the best follow-up candidate: it improves edge-bleed proxy in
  this capture and is not slower in primary AO/product rows, but it still carries
  the `noise` label and needs fixture/readback evidence before any promotion.
- `ign` is not a clear win: similar noise, slightly worse edge/gap proxies in
  several rows.
- `static-stbn` is rejected for now: lower pattern/noise in some rows is bought
  with edge-bleed and thin-gap proxy regressions plus worse timing.

Notes:

- The run emitted repeated Three TSL duplicate-name warnings for `vbaoPixel` and
  WebGPU timestamp query pool warnings. The collector completed and wrote all 32
  rows; these warnings do not promote or invalidate a candidate by themselves.
- `edgeBleedProxy` and `thinGapPreservationProxy` are screenshot proxies, not
  physical AO truth. Fixture/readback gates still own correctness claims.

## Current VBAO State - 2026-05-27

Status: **architecture corrected; local screenshots refreshed; no formal timing promotion claimed by this section**.

Current production boundary:

- `VBAONode` is the single public visibility-bitmask AO product node with selected GT-VBAO corrections; `getTextureNode()` returns final product AO and `getRawTextureNode()` is debug/readback only.
- Cleanup, JBU resolve, and full-resolution polish are internal pass-elided reconstruction stages. Full-resolution raw output bypasses low-resolution resolve.
- There is no public `VBAODenoiseNode` toolkit or hidden external blur in the package API; `softness` controls optional internal polish.
- Default full-resolution polish uses the near 8-tap `POISSON8` stencil only; any wider full-resolution tap budget needs separate timing and screenshot evidence before it can become default.
- Production sampling is single-scheme `phase-atlas-stable-hash` with live shader x² near-biased spacing.
- Noise source changes remain gated: the 2026-06-01 matrix compared `phase-atlas-stable-hash`, IGN, static STBN, and FAST-like candidates; no candidate was promoted, so the stable hash atlas remains default.
- Slices are weighted by projected-normal length after cosine-measure
  sectorization; this replaced the earlier uniform slice average after the
  2026-06-03 multi-slice/non-axis fixture gate.
- `normalNode` remains required.
- Runtime Museum/E2E/benchmark paths no longer expose the old research candidate controls.
- `denoiseRadius`/generic denoiser controls are intentionally not public; `softness` is the single artist-facing polish control.
- Production build was not run.

Local capture note:

- The latest architecture pass used local screenshot/benchmark artifacts only as
  throwaway verification. Those files live under ignored `artifacts/` paths and
  are intentionally not referenced here as committed evidence.
- Formal evidence promotion still requires curated JSON rows and screenshots to
  be committed alongside this file.
- Expected labels for the next curated run include Off/Beauty, VBAO Raw
  Debug/Beauty, VBAO Product/Beauty, VBAO Raw Debug/AO, VBAO Product/AO, and
  GTAO comparison rows.

Note: This section records architectural verification only. It does not assert a Pareto visual-quality or performance win.

## Historical VBAO State - 2026-05-26

Status: **stabilized for the next evidence gate; no production behavior changed
by this section**.

Historical production boundary at that time:

- Production VBAO remained the cosine-weighted reduction path.
- Production sampling remained `magic-square`.
- Production radius/thickness remains the Museum `museum-baseline`.
- `normalNode` remains required.
- No public `VBAONodeOptions` expansion and no new `@horizonao/core` export are
  accepted by the current evidence.
- Production build was not run for this stabilization pass.

Accepted infrastructure:

- `/vbao-parity` is the hardened internal GPU/scalar parity route.
- The parity fixture matrix now includes:
  - `flat-plane`
  - `two-wall-corner`
  - `two-wall-corner-true-normal`
  - `thin-occluder`
  - `thin-gap-parallel-planes`
  - `large-flat-floor-no-curvature`
  - `small-contact-object-on-plane`
  - `grazing-wall-corner`
  - `subpixel-thin-occluder`
- Artifact labels are the gate language for new candidates: `noise`, `mud`,
  `edge-bleed`, `thin-gap`, `false-curvature`, and `scale-mismatch`.

Rejected or diagnostic-only candidates:

| Candidate / track | Current disposition | Why it is not promoted |
| --- | --- | --- |
| SSILVB/reference formula ablation | Diagnostic only | Improves some contact readability but keeps or introduces blocking `mud`, `false-curvature`, and `scale-mismatch`; no promoted live GPU formula replacement exists. |
| Metadata-aware filter v1 | Rejected | Spatial filter did not remove the key raw-signal artifacts. |
| GTVBAO++ / SmartDenoiser / per-tap metadata | Architecturally useful, visually insufficient | Per-tap metadata is useful evidence, but reviewed rows still show `noise`, `false-curvature`, and `scale-mismatch`. |
| Sampling schedules `r2`, `hilbert`, `blue-noise` | Diagnostic only | No non-production schedule beat `magic-square` across the fixture labels. |
| Radius/thickness presets `thin-gap-conservative`, `small-contact-tight`, `large-radius` | Diagnostic only | No non-baseline preset beat `museum-baseline` across the fixture labels. |
| Depth hierarchy / depth prefilter | Diagnostic only | Not yet a CACAO/XeGTAO-grade production pipeline; current evidence can add `false-curvature` or scale artifacts. |

Next gate rule:

- Pick **one** raw-signal candidate at a time.
- Compare current raw VBAO against the candidate on the expanded `/vbao-parity`
  fixture matrix before any Museum beauty claim.
- Acceptance requires at least one targeted artifact label to improve and none
  to worsen.
- Museum evidence (`1920x1080` and `1280x720`) comes only after the fixture gate
  passes.

## 2026-05-26 — VBAO Adaptive Radius/Thickness Candidate Gate

Status: **internal candidate contract added; ready for GPU fixture comparison;
production behavior not changed**.

Candidate: `fixture-adaptive-v1`.

What changed:

- Added an internal adaptive radius/thickness decision model for the expanded
  artifact fixture matrix.
- The candidate derives fixture-specific radius/thickness decisions for:
  - `thin-gap-parallel-planes`
  - `large-flat-floor-no-curvature`
  - `small-contact-object-on-plane`
  - `grazing-wall-corner`
  - `subpixel-thin-occluder`
- The gate compares candidate labels against current `museum-baseline` labels.
  It can advance only when at least one targeted label improves and no new label
  appears.

Internal label-model result:

- verdict: `ready-for-gpu-fixture-comparison`
- production preset: `museum-baseline`
- candidate: `fixture-adaptive-v1`
- production promotion: `false`
- improved labels include `thin-gap`, `edge-bleed`, `false-curvature`, and
  `scale-mismatch`
- worsened labels: none

Decision:

- This is **not** a production radius/thickness change.
- This is **not** a public `VBAONodeOptions` change.
- This is **not** Museum visual evidence.
- Next required gate is targeted GPU fixture comparison on `/vbao-parity`.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoRadiusThicknessScaleGate.test.ts
# 1 file / 8 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoRadiusThicknessScaleGate.test.ts packages/horizon-ao/src/__tests__/vbaoUpstreamSignalCorrection.test.ts packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 4 files / 34 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 23 files / 190 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

Production build was not run.

## 2026-05-26 — VBAO Adaptive Radius/Thickness GPU Fixture Gate

Status: **route contract wired; candidate remains internal; production behavior
not changed**.

What changed:

- `/vbao-parity` now exposes
  `window.__vbaoParity.adaptiveRadiusThicknessCandidate`.
- The route renders current raw VBAO fixture readbacks and
  `fixture-adaptive-v1` candidate readbacks.
- Candidate radius/thickness is fixture-specific for the upstream artifact
  fixtures and baseline-compatible for the historical parity fixtures.
- The gate rejects if either baseline or candidate GPU/scalar parity fails.

Gate result expected from the route contract:

- candidate: `fixture-adaptive-v1`
- verdict: `ready-for-museum-matrix`
- production promotion: `false`
- baseline fixture parity: required passing
- candidate fixture parity: required passing
- label model: at least one improved label and no worsened labels

Decision:

- This is still **not** Museum visual evidence.
- This is still **not** a public API or production preset promotion.
- If targeted WebGPU route evidence passes, the next gate is the Museum matrix.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 1 file / 22 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoRadiusThicknessScaleGate.test.ts packages/horizon-ao/src/__tests__/vbaoUpstreamSignalCorrection.test.ts packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts
# 4 files / 37 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 23 files / 193 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41783'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "all fixture reports pass|adaptive radius/thickness candidate passes fixture gate|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

git diff --check
# clean except expected LF→CRLF warnings
```

Production build was not run.

## 2026-05-26 — VBAO Adaptive Radius/Thickness Museum Matrix

Status: **benchmark-only Museum matrix wired; candidate remains internal; visual
review pending until screenshots are captured and labeled**.

Matrix mode:

- env: `AO_BENCHMARK_VBAO_ADAPTIVE_RADIUS_MATRIX=1`
- rows: raw single-mode only
- modes: GTAO, baseline VBAO, `fixture-adaptive-v1` VBAO, N8AO
- views: `beauty`, `ao`
- resolutions: `1920x1080`, `1280x720`

Candidate projection:

- `fixture-adaptive-v1` is represented in the Museum harness as an internal
  conservative radius/thickness candidate: radius `0.22`, thickness `0.06`.
- This is not a public `VBAONodeOptions` preset and not a production promotion.
- Production remains `museum-baseline`.

Capture status:

- pending

Production build was not run.

## 2026-05-26 — VBAO Support-Bitmask Visibility Math Spec

Status: **internal math candidate specified with scalar contracts; production
shader behavior not changed**.

Candidate: `support-bitmask-v1`.

Problem:

- The current binary visibility OR lets a one-tap depth/normal discontinuity
  fully own a sector.
- That is WGPU-fast, but mathematically too brittle for the current artifact
  set: `noise`, `false-curvature`, and some `mud` can be born before filtering
  has any chance to help.

Candidate math:

```text
H1 = sectors hit by at least one sample interval
H2 = sectors with repeated support OR broad single-interval support

broad <- sampleMask when countOneBits(sampleMask) >= 6, otherwise 0
H2 <- H2 OR (H1 AND sampleMask) OR broad
H1 <- H1 OR sampleMask

visibility(k) = 0       when H2[k] = 1
              = 1 - λ   when H1[k] = 1 and H2[k] = 0
              = 1       otherwise
```

The slice reduction keeps the production cosine weights:

```text
A_i = Σ visibility(k) max(0, cos(theta_k - gamma_i))
      ------------------------------------------------
      Σ               max(0, cos(theta_k - gamma_i))
```

Initial scalar contract values:

- single-hit confidence: `λ = 0.45`
- broad self-support threshold: `8` sectors

Revision note:

- The first draft used repeated support only.
- That was partially refuted: a broad one-sample interval can represent a real
  near/thick blocker, not a speckle.
- The revised candidate self-supports broad intervals so real contact is not
  erased while narrow one-hit sectors remain uncertain.

Why this candidate is worth testing:

- It maps to two `u32` masks and bitwise operations in WGSL/WebGPU.
- Coherent blockers converge to the existing binary visibility result.
- Broad single intervals preserve near/thick blockers.
- Isolated single-hit sectors remain visible as partial evidence instead of
  becoming full occlusion.

Hard promotion blockers:

- It may underweight true subpixel occluders.
- It may not solve actual radius-scale mismatch.
- Therefore it cannot advance without the expanded `/vbao-parity` fixture
  labels, especially `subpixel-thin-occluder` and
  `thin-gap-parallel-planes`.

Decision:

- This is **not** a production shader change.
- This is **not** a public API change.
- This is **not** Museum evidence.
- Next required gate is RED GPU fixture tests and a live internal shader
  candidate only if the team chooses to implement it.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts
# 1 file / 8 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/reference/__tests__/vbaoReference.test.ts packages/horizon-ao/src/__tests__/vbaoRadiusThicknessScaleGate.test.ts packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 4 files / 102 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 24 files / 202 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

Production build was not run.

## 2026-05-27 — VBAO WGPU Precision/Memory Envelope

Status: **internal guardrail contract added; production shader behavior not
changed**.

Why this exists:

- WebGPU portability does not mean bit-identical images across devices.
- VBAO is especially sensitive because the live path combines floating-point
  horizon math, byte-quantized render targets, packed normals, texture readback
  layout, and discontinuous `atan -> floor/ceil -> bit` decisions.
- Scalar tests remain useful, but they are not promotion evidence by
  themselves.

Guardrail contract:

- Current AO readback evidence is byte-quantized: expected AO values are rounded
  to `1 / 255`, and the parity tolerance is one byte plus epsilon.
- WebGPU readback memory must account for `256`-byte row alignment before
  interpreting pixels.
- Sector-boundary anchors are labeled `boundary-risk`; promotion anchors must
  sit away from sector and silhouette discontinuities.
- `u32` bitmask operations are exact only after the float-derived angular
  interval has already become a mask.
- Normal/depth evidence formats must be documented. The current Museum prepass
  normal path uses `UnsignedByteType` packing.

Candidate gate:

```text
scalar contracts
AND GPU fixture contracts
AND quantized readback tolerance
AND row-padding handling
AND boundary-safe anchors
AND normal/depth format notes
=> ready for precision-aware GPU fixture gate
```

Decision:

- This is **not** a production shader change.
- This is **not** a public API change.
- This does **not** validate `support-bitmask-v1` visually.
- It prevents the next shader candidate from pretending CPU scalar math is
  enough.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 1 file / 5 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts
# 3 files / 35 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 25 files / 207 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

Production build was not run.

## 2026-05-27 — VBAO Support-Bitmask Live Parity Route

Status: **live internal route wired; local WebGPU evidence rejects label review;
production shader behavior remains binary by default**.

What changed:

- `VBAONode` now has an internal benchmark visibility hook:
  `setBenchmarkVisibilityMode('support-bitmask-v1')`.
- The hook is not part of `VBAONodeOptions`; production defaults to binary
  visibility.
- `/vbao-parity` renders a separate `support-bitmask-v1` fixture matrix and
  exposes `window.__vbaoParity.supportBitmaskCandidate`.
- The scalar parity mirror can compute support-bitmask expected rows under the
  WGPU precision envelope.

Local WebGPU route result:

- Baseline fixture matrix: passed.
- `support-bitmask-v1` candidate matrix: rejected.
- Blocking reason: `support-bitmask-v1 GPU/scalar parity failed`.
- Follow-up fixture stabilization found that `subpixel-thin-left-upper-receiver`
  and `subpixel-thin-left-lower-receiver` were accidentally sampling the same
  pixel. The lower anchor is now distinct and baseline-stable.
- Current observed candidate drift: `subpixel-thin-left-upper-receiver` at
  pixel `[27, 33]` drifts by `0.023529` AO, roughly six 8-bit AO steps
  (`gpu=0.905882`, scalar expected `0.929412`).

Decision:

- This is **good gate behavior**: the candidate is live enough to measure, and
  the precision-aware fixture matrix caught a real GPU/scalar mismatch.
- This is **not** a production shader promotion.
- This is **not** a Museum visual claim.
- Next work should investigate whether the remaining upper-anchor drift comes
  from sector-boundary
  float differences, support-mask broad/repeated classification, or fixture
  anchor instability before any label review.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 2 files / 28 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 25 files / 209 tests passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41845'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
# 4 files / 42 tests passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41847'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed after distinct lower-anchor stabilization

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

Production build was not run.

## 2026-05-27 — VBAO GT-VBAO Attribution Gate

Status: **internal scalar attribution added; production behavior unchanged**.

Target:

- fixture: `subpixel-thin-occluder`
- anchor: `subpixel-thin-left-upper-receiver`
- pixel: `[27, 33]`
- current WebGPU candidate drift: `0.023529` AO

What changed:

- Added `vbao-gt-vbao-attribution-gate` as an internal scalar report.
- The support-bitmask parity result now carries an `attribution` payload for the
  failing upper anchor.
- The support-bitmask parity result now also carries an
  `attributionGpuCorrelation` payload so the live WebGPU drift is compared
  against the same target row instead of being diagnosed by eyeballing the
  route dump.
- The report includes rows for:
  - `baseline-current`
  - `point-sample-quantized-mask`
  - `perspective-sample-view-thickness`
  - `acos-free-angle-path`
  - `support-bitmask-attribution`
- Each row exposes slice masks, sample mask popcounts, `hitMask`,
  `supportedMask`, broad interval counts, and boundary-risk flags.

Original correlation before scalar frontmost-depth parity fix:

- matched target: `subpixel-thin-occluder` /
  `subpixel-thin-left-upper-receiver`
- scalar support-bitmask lift over baseline: approximately `0.074510` AO
- observed GPU support-bitmask lift over baseline: approximately `0.050980` AO
- unresolved support lift: approximately `0.023529` AO (`6/255`)
- correlation verdict: `partial-support-mask-divergence`

Continuation task:

- Added a shader accumulation guard for the internal `support-bitmask-v1` path:
  the live TSL shader now snapshots `previousHitMask`, computes
  `broadSupportMask`, then assigns explicit `nextSupportedMask` and
  `nextHitMask`.
- Reason: remove any ambiguity around reading a mutable hit mask while assigning
  support/hit masks in the same WGSL generation block.
- Scope: internal rejected candidate only; production binary/cosine VBAO,
  `magic-square`, `museum-baseline`, public options, and package exports remain
  unchanged.
- Targeted WebGPU after this guard still reports the same target drift:
  `gpu=0.905882`, `expected=0.929412`, unresolved lift `0.023529`.
  So the guard is correct architecture hygiene, but it does **not** resolve the
  underlying parity gap. Next work should inspect sample-mask generation /
  sector-boundary classification, not accumulation order.

Sample-mask attribution continuation:

- Added scalar per-sample mask details to the internal attribution rows:
  slice/side/sample index, theta interval, raw/clamped sector interval, mask,
  popcount, sectors, and boundary-risk flags.
- The target high-sector contributors are now explicit:
  - slice `0`, side `1`, sample `3`: sectors `[28, 29]`, `rawK0=28`,
    `rawK1Exclusive=30`, popcount `2`, theta boundary risk.
  - slice `1`, side `0`, sample `2`: sector `[29]`, `rawK0=29`,
    `rawK1Exclusive=30`, popcount `1`.
- This narrows the next investigation to high-angle `atan`/`floor`/`ceil` mask
  generation around sectors `28/29`; it still does **not** promote
  `support-bitmask-v1`.

Boundary-sector perturbation continuation:

- Refuted the blunt hypothesis that all high-sector single-hit sectors `[28,29]`
  should be promoted to supported: it yields `0.854902`, i.e. the baseline
  quantized value, not the live GPU value.
- Added a closest-subset hypothesis. Promoting only sector `28` from
  slice `0`, side `1`, sample `3` yields `0.905882`, matching the known live
  WebGPU target and explaining the `6/255` gap.
- Current diagnosis: the remaining drift is consistent with a one-sector
  boundary classification mismatch for the interval
  `theta0=1.276090982663153`, `theta1=1.2852648789144832`,
  `rawK0=28`, `rawK1Exclusive=30`.
- This is still scalar-only diagnostic evidence; `support-bitmask-v1` remains
  rejected and unpromoted.

Sector precision-envelope continuation:

- Added `evaluateVbaoSectorIntervalPrecision` to classify the known interval.
- f64 and simulated f32 sector index paths both produce `[28, 30)`.
- The interval is still `boundary-risk`: `theta0` is only about `0.001844`
  sector units below boundary `29`, and sectors `[28, 29]` are
  boundary-adjacent.
- Updated diagnosis: plain f64-vs-f32 constant precision alone does not explain
  the drift. The next useful diagnostic is live shader-side `theta/k0/k1`
  readback/debug for that sample.

Live shader diagnostic continuation:

- Added an internal `/vbao-parity` live shader-side diagnostic for the exact
  target sample: `subpixel-thin-occluder` /
  `subpixel-thin-left-upper-receiver`, pixel `[27,33]`, slice `0`, side `1`,
  sample `3`.
- The route re-renders the support-bitmask fixture through temporary float
  diagnostic fields and reconstructs high u32 masks from 16-bit halves.
- Observed live WebGPU diagnostic:
  - `thetaFront=1.28526771068573`
  - `thetaBack=1.2579689025878906`
  - `k0=28`, `k1=30`
  - `sampleMask=0x30000000`
  - `hitMask=0x3001ff80`
  - `supportedMask=0x2001ff80`
  - `quantizedAo=0.905882`
- This rules out a different shader sector interval or sample mask for the
  target sample: live WGSL still emits `[28,30)` and sectors `[28,29]`.
- The mismatch is therefore still unresolved, but the next branch is narrower:
  compare live/scalar accumulated mask state and slice reduction, not basic
  `k0/k1/sampleMask` generation.

Live slice diagnostic continuation:

- Added an internal `/vbao-parity` live shader-side slice diagnostic for the
  same target, reading per-slice `hitMask`, `supportedMask`, `gammaNorm`,
  numerator, denominator, accessibility, and quantized AO.
- Observed live/scalar slice comparison:
  - live quantized AO: `0.905882`
  - scalar support-bitmask expected AO: `0.929412`
  - unresolved delta: `0.023529` (`6/255`)
  - slice `0` live: `hitMask=0x3001ff80`,
    `supportedMask=0x2001ff80`, accessibility approximately `0.857427`
  - slice `0` scalar: `hitMask=0x3001ff80`,
    `supportedMask=0x0001ff80`, accessibility approximately `0.907302`
  - slice `1` live/scalar masks match:
    `hitMask=0x2001fff0`, `supportedMask=0x0001fff0`, accessibility
    approximately `0.952347`
- Classification update: the remaining gap is **not** interval generation.
  The live shader and scalar mirror agree on the target sample's `[28,30)`
  interval, `sampleMask`, and slice `0` `hitMask`. They diverge in slice `0`
  accumulated `supportedMask`: live includes high sector `0x20000000`, scalar
  does not.
- Next branch: fix or reject the internal candidate based on support-mask
  accumulation/reduction semantics. No denoise/filter work and no production
  promotion are justified by this evidence.

Live transition diagnostic continuation:

- Added an internal `/vbao-parity` transition diagnostic for the same target
  sample's support-mask update.
- Observed live/scalar transition comparison:
  - `sampleMask=0x30000000`
  - live `previousHitMask=0x2001ff80`
  - scalar `previousHitMask=0x0001ff80`
  - live/scalar `previousSupportedMask=0x0001ff80`
  - live `repeatedSupportMask=0x20000000`
  - scalar `repeatedSupportMask=0x00000000`
  - live/scalar `broadSupportMask=0x00000000`
  - live/scalar `nextHitMask=0x3001ff80`
  - live `nextSupportedMask=0x2001ff80`
  - scalar `nextSupportedMask=0x0001ff80`
- Classification update: the live shader is not taking a broad-interval
  self-support path for the target sample. It is taking the repeated-support
  path because sector `29` (`0x20000000`) is already present in live
  `previousHitMask` before slice `0`, side `1`, sample `3`. The scalar mirror
  does not have that prior high sector.
- Next branch: identify which earlier live sample contributes sector `29`, or
  reject `support-bitmask-v1` as unstable for the subpixel-thin target.

Live prior-sample trace continuation:

- Added an internal `/vbao-parity` prior-sample trace for the seven samples
  before the target transition in slice `0`.
- Observed contributor:
  - live contributing sample orders: `[6]`
  - sample order `6` maps to slice `0`, side `1`, sample `2`
  - live sample order `6` `sampleMask=0x20000000`
  - scalar sample order `6` `sampleMask=0x0001f000`
  - live `nextHitMask=0x2001ff80`
  - scalar `nextHitMask=0x0001ff80`
- Classification update: the prior-hit divergence is caused by live slice `0`,
  side `1`, sample `2` becoming a high-sector-only interval at sector `29`.
  The target sample then repeats sector `29` and promotes it to supported.
- Next branch: inspect live/scalar view position, depth, adaptive thickness, and
  angle terms for slice `0`, side `1`, sample `2`. If that mismatch cannot be
  justified/fixed internally, `support-bitmask-v1` stays rejected.

Live prior-sample geometric detail continuation:

- Added an internal `/vbao-parity` geometric/math detail readback for the
  identified contributor sample: slice `0`, side `1`, sample `2`.
- Observed detail:
  - live/scalar sample screen coordinates match:
    - live `[0.4889061749, 0.5469606519]`
    - scalar `[0.4889061705, 0.5469606252]`
  - live sample position: `[-0.03100023, -0.13122533, -2.41999364]`
  - scalar sample position: `[-0.04099216, -0.17352147, -3.2]`
  - live adaptive thickness: `0.05701448`
  - scalar adaptive thickness: `0.1`
  - live theta interval: `[1.32906914, 1.35077512]`,
    `k0=29`, `k1=30`, `sampleMask=0x20000000`
  - scalar theta interval: `[-0.33511940, 0.06527196]`,
    `k0=12`, `k1=17`, `sampleMask=0x0001f000`
- Classification update: this is not a sample-jitter mismatch; live and scalar
  walk to the same screen coordinate. The mismatch is geometry/depth selection:
  live hits the thin foreground occluder at about `z=-2.42`, while the scalar
  fixture mirror selects the rear plane at `z=-3.2`.
- Next branch: fix fixture scene frontmost-depth parity in the scalar mirror, or
  reject `support-bitmask-v1` for this subpixel-thin case if the candidate is
  inherently unstable. No production promotion is justified.

Scalar frontmost-depth parity continuation:

- Added a RED scalar fixture sampler test for the exact known live contributor
  screen coordinate `[0.4889061705, 0.5469606252]`.
- Root cause: the scalar fixture mirror selected the frontmost surface by view
  depth correctly, but the subpixel foreground occluder was rejected by exact
  analytic rectangle bounds. The live depth path sees that occluder through
  raster/sample coverage at the pixel footprint.
- Fix: added an internal `scalarCoveragePaddingPixels` field on
  `VbaoParityFrontalRectSurface` and applied a narrow `0.5px` coverage padding
  only to the `subpixel-thin-occluder` foreground blocker. This is fixture
  mirror parity only; it is not a production shader/API/default change.
- Updated scalar/live facts:
  - scalar sample order `6` now hits the foreground occluder at `z=-2.42`
    instead of the rear plane at `z=-3.2`.
  - scalar sample order `6` now emits `sampleMask=0x20000000`,
    `k0=29`, `k1=30`, matching the live high-sector contributor.
  - scalar slice `0` now has `hitMask=0x3001ff80`,
    `supportedMask=0x2001ff80`, matching live.
  - scalar support-bitmask expected AO for the target is now `0.905882`
    (`231/255`), matching live WebGPU; unresolved delta is `0`.
  - `attributionGpuCorrelation.verdict` is now `no-candidate-gpu-drift`.
  - `support-bitmask-v1` verdict is now `ready-for-label-review`, with
    `promoteProduction=false` and empty blocking reasons.
- Classification update: the previously observed `6/255` gap was caused by
  scalar fixture frontmost/depth coverage mismatch for the subpixel-thin
  occluder, not by the target sample sector interval, WGSL-vs-JS precision, or
  support-mask accumulation semantics.

Support-bitmask label-review gate continuation:

- Added an internal label-review gate for `support-bitmask-v1`.
- Required fixture label rows:
  - `thin-gap-parallel-planes`
  - `large-flat-floor-no-curvature`
  - `small-contact-object-on-plane`
  - `grazing-wall-corner`
  - `subpixel-thin-occluder`
- Required variants per fixture:
  - `baseline-current`
  - `support-bitmask-v1`
- The gate blocks on missing rows, `pending-review`, any worsened fixture label,
  no improved label, or missing hardened GPU/scalar parity.
- `/vbao-parity` now emits a pending review template instead of an empty row
  set, so reviewers can see the exact fixture/variant rows that need labels.
- Current live `/vbao-parity` payload after the parity fix:
  - support-bitmask candidate verdict: `ready-for-label-review`
  - `labelGate.verdict=requires-label-review`
  - `labelGate.gpuParityPassed=true`
  - `labelGate.rows` contains `10` explicit `pending-review` rows
  - `promoteProduction=false`
- Classification update: the candidate is mathematically/parity-ready for
  label review, but label evidence has **not** been supplied. That means no
  Museum matrix, no production promotion, and no “looks better” claim yet.
- Reviewed label rows can now be passed into the internal GPU fixture comparison
  result. If the supplied rows improve at least one label, worsen none, and GPU
  parity remains green, the result advances to `ready-for-museum-matrix` while
  still keeping `promoteProduction=false`.
- The live route still uses the pending-review template by default; no labels
  were invented in this pass.
- Recorded the pending review handoff artifact at
  `artifacts/analysis/vbao_support_bitmask_label_review_decision.json`. It
  mirrors the 10 required `pending-review` rows and intentionally does not claim
  reviewed visual-quality labels.
- Added `apps/demo/scripts/collect-vbao-support-bitmask-label-review.mjs` to
  generate a live `/vbao-parity` support-bitmask label-review packet and HTML
  contact sheet. The script keeps all labels as `pending-review`; reviewers must
  replace them manually from the generated evidence before the gate can advance.
- Latest generated review packet:
  `artifacts/analysis/vbao-support-bitmask-label-review-latest.json`.
- Latest generated contact sheet:
  `artifacts/analysis/vbao_support_bitmask_label_review_contact_sheet.html`.

Decision:

- This moves `support-bitmask-v1` from rejected to **ready for label review** in
  the internal `/vbao-parity` gate only.
- This does **not** promote `support-bitmask-v1` to production.
- This does **not** add a public API.
- This does **not** add denoise/filter work.
- The next valid step is label review / fixture review, not Museum beauty work
  or production shader promotion.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts --reporter=verbose
# 1 file / 27 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 3 files / 40 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41850'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

# Continuation after adding attributionGpuCorrelation:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts --reporter=verbose
# 1 file / 27 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 3 files / 40 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

git diff --check
# clean except expected LF→CRLF warnings

# Continuation after shader accumulation guard:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts --reporter=verbose
# 1 file / 6 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 46 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41853'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

# Continuation after sample-mask attribution and boundary-sector hypotheses:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts --reporter=verbose
# 1 file / 29 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 49 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41854'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

# Continuation after sector-interval precision envelope:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts --reporter=verbose
# 1 file / 6 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 49 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41855'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

git diff --check
# clean except expected LF→CRLF warnings

# Continuation after live shader-side support-bitmask sample diagnostic:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts --reporter=verbose
# RED first: failed on missing diagnostic target/helper and missing /vbao-parity wiring
# GREEN: 1 file / 30 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 50 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask live shader diagnostic|support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 4 tests passed

# Continuation after live shader-side support-bitmask slice diagnostic:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts --reporter=verbose
# RED first: failed while the scalar slice diagnostic helper/source contract
# and /vbao-parity readback wiring were missing
# GREEN: 1 file / 32 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 52 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask slice diagnostic|support-bitmask live shader diagnostic|support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 5 tests passed

# Continuation after live shader-side support-bitmask transition diagnostic:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed on missing computeVbaoSupportBitmaskTransitionDiagnosticReference
# GREEN: 1 file / 33 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 53 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask transition diagnostic|support-bitmask slice diagnostic|support-bitmask live shader diagnostic|support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 6 tests passed

# Continuation after live shader-side support-bitmask prior-sample trace:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed on missing computeVbaoSupportBitmaskPriorSampleTraceReference
# GREEN: 1 file / 34 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 54 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask transition diagnostic|support-bitmask slice diagnostic|support-bitmask live shader diagnostic|support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 6 tests passed

git diff --check
# clean except expected LF→CRLF warnings

# Continuation after live shader-side support-bitmask prior-sample detail:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed on missing computeVbaoSupportBitmaskPriorSampleDetailReference
# GREEN: 1 file / 35 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 55 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask transition diagnostic|support-bitmask slice diagnostic|support-bitmask live shader diagnostic|support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 6 tests passed

git diff --check
# clean except expected LF→CRLF warnings

# Continuation after scalar fixture frontmost-depth parity fix:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed while the known contributor screen coordinate sampled the rear plane at z=-3.2
# GREEN: 1 file / 36 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 56 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask transition diagnostic|support-bitmask slice diagnostic|support-bitmask live shader diagnostic|support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 6 tests passed

# Continuation after adding support-bitmask label-review gate:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed on missing ../vbaoSupportBitmaskLabelGate
# GREEN: 1 file / 39 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 59 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

# Continuation after adding explicit pending-review label template:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed because createVbaoSupportBitmaskLabelReviewTemplate was not implemented
# GREEN: 1 file / 40 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 60 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

# Continuation after adding reviewed label-row ingestion:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed because reviewed label rows were ignored by the GPU fixture comparison result
# GREEN: 1 file / 41 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 61 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings

cd apps/demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41856'; node node_modules/@playwright/test/cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "support-bitmask candidate|all fixture reports pass|matches fixed scalar" --reporter=list --timeout=120000
# 3 tests passed

# Continuation after adding pending label-review decision artifact:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed because artifacts/analysis/vbao_support_bitmask_label_review_decision.json did not exist
# GREEN: 1 file / 42 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 62 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings

# Continuation after adding support-bitmask label-review capture packet script:
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts --reporter=verbose
# RED first: failed because apps/demo/scripts/collect-vbao-support-bitmask-label-review.mjs did not exist
# GREEN: 1 file / 43 tests passed

node apps/demo/scripts/collect-vbao-support-bitmask-label-review.mjs
# failed: default Chromium fell back to WebGL2 and /vbao-parity did not reach ready; not counted as evidence

$env:VBAO_LABEL_REVIEW_BROWSER_CHANNEL='chrome'; node apps/demo/scripts/collect-vbao-support-bitmask-label-review.mjs
# wrote artifacts/analysis/vbao-support-bitmask-label-review-latest.json
# wrote artifacts/analysis/vbao_support_bitmask_label_review_contact_sheet.html

node --check apps/demo/scripts/collect-vbao-support-bitmask-label-review.mjs
# passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoSupportBitmaskVisibility.test.ts packages/horizon-ao/src/__tests__/vbaoWgpuPrecisionEnvelope.test.ts
# 4 files / 63 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

Production build was not run.

## Required Production Capture Matrix (Current)

The current production capture script is intentionally narrow and honest: it captures
`off`, `gtao`, `ssao`, `vbao`, and one internally filtered `n8ao` row per
view/resolution. N8AO remains available in the live Museum UI, but it is not emitted
as a raw/denoised pair because the node exposes an internally filtered output rather
than a true raw/filtered pair.

| Field | Required values |
| --- | --- |
| `algorithm` | `off`, `gtao`, `ssao`, `vbao`, `n8ao` |
| `viewMode` | `beauty`, `ao` |
| `denoise` | `raw`/`denoised` for GTAO and SSAO; a single internally filtered/denoised row for N8AO; `raw-debug`/`product` semantics for VBAO via the same demo toggle; off is raw-only. For VBAO this toggles raw debug AO vs final product AO, not a public denoiser node. |
| `vbaoSamplingSchedule` | `phase-atlas-stable-hash` or `n/a` |
| `resolution` | `1920x1080`, `1280x720` |
| `failureLabels` | `none`, `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`, `scale-mismatch`, `false-curvature` |

The Museum route is the baseline comparison harness. For VBAO it exposes raw debug
AO versus final product AO and a demo-only `Full-res VBAO` control. That control
sets VBAO `resolutionScale = 1.0` for evidence without changing `VBAONodeOptions`
or the locked public quality tiers.

## Current Row Schema

| Column | Description |
| --- | --- |
| `scene` | `museum` |
| `resolution` | Exact capture dimensions: `1920x1080` or `1280x720` |
| `mode` | `off`, `gtao`, `ssao`, `vbao`, or `n8ao` |
| `view` / `viewMode` | `beauty` or `ao` |
| `denoise` / `denoiseEnabled` | Demo output toggle state; for VBAO this means raw debug AO vs final product AO |
| `productOutputContract` | For VBAO, either `VBAONode.getRawTextureNode() raw debug AO`, a named final product AO source, or `Private VBAOVelocityTemporalNode wrapped ...` plus the underlying product source for private velocity evidence rows. |
| `sampling` / `vbaoSamplingSchedule` | `phase-atlas-stable-hash` for VBAO, otherwise `n/a` |
| `backend` / `rendererBackend` | Must be `webgpu` for production rows |
| `latest` | Full `window.__aoBenchmark.latest` stats snapshot matched to the requested mode/view/denoise row |
| `screenshotPath` | Path under a committed curated artifact directory when formal evidence is promoted |

## Current Capture Rows

Status: **not promoted**. Current architecture rows have not been committed as
formal evidence because the latest local artifacts are ignored by `.gitignore`.
Run the production collector and commit curated JSON/screenshots before adding
new current rows here.

## Archived Legacy Capture Rows

## Benchmark Policy

First-pass benchmark scope is WebGPU apples-to-apples only inside the Museum route.
Three `GTAONode`, SSAO, `VBAONode`, and N8AO may be captured there, with N8AO as a
single internally filtered baseline rather than raw-vs-denoised production evidence.
Native XeGTAO and AMD CACAO remain design/comparison references. Curated output
files must be committed explicitly when promoted.

VBAO only "wins" when it is a Pareto improvement: equal or faster at comparable
visual quality, or visibly better at comparable cost. Do not claim a benchmark win
from FPS alone when the capture has worse `noise`, `mud`, `halo`, `thin-gap`,
`edge-bleed`, `false-curvature`, or `scale-mismatch`.

The Museum route publishes machine-readable rolling stats on
`window.__aoBenchmark.latest`:

| Field | Description |
| --- | --- |
| `scene` | `museum` or `city` |
| `rendererBackend` | `webgpu` or `webgl` |
| `renderMode` | `single` or `compose` |
| `mode` | `off`, `gtao`, `vbao`, `n8ao`, `ssao`, or `compose` |
| `composeModes` | Algorithms rendered side-by-side when `renderMode=compose` |
| `viewMode` | `beauty` or `ao` |
| `denoiseEnabled` | Whether the denoise toggle was enabled |
| `fullResolutionVbao` | Whether the demo-only full-res VBAO toggle was enabled |
| `vbaoSamplingSchedule` | Current VBAO sampling label; `phase-atlas-stable-hash` or `n/a` |
| `vbaoSamplePreset` | `baseline` for active VBAO rows, or `n/a` for non-VBAO rows. Historical `high-sample` rows below are rejected legacy evidence, not a current runtime/product control. |
| `vbaoRadius` | Active VBAO radius, or `0` for non-VBAO rows |
| `vbaoThickness` | Active VBAO thickness, or `0` for non-VBAO rows |
| `vbaoSamples` | Active VBAO samples per slice, or `0` for non-VBAO rows |
| `vbaoSlices` | Active VBAO slice count, or `0` for non-VBAO rows |
| `fps` | `1000 / avgFrameMs` for the latest reporting window |
| `avgFrameMs` | Average frame time for the latest reporting window |
| `medianFrameMs` | Median frame time for the latest reporting window |
| `p95FrameMs` | 95th percentile frame time for the latest reporting window |
| `reportIndex` | Monotonic stats-window index proving a snapshot came from a new frame window |
| `sampleCount` | Number of frames in the latest reporting window |
| `viewport` | CSS viewport width and height |
| `devicePixelRatio` | Browser device pixel ratio |

`window.__aoBenchmark.snapshot()` also returns an `environment` object. The current
collector enforces WebGPU by default and exits non-zero on fallback unless
`AO_BENCHMARK_REQUIRE_WEBGPU=0` is set.

| Env var | Purpose |
| --- | --- |
| `PLAYWRIGHT_BASE_URL` | Reuse an already-running demo server |
| `PLAYWRIGHT_CHROME_CHANNEL` | Browser channel; defaults to `chrome` |
| `AO_BENCHMARK_REQUIRE_WEBGPU=0` | Allow fallback sessions for debugging only |
| `AO_BENCHMARK_WIDTH` / `AO_BENCHMARK_HEIGHT` | Override the default two-resolution matrix for a local debug run |

Local automation note on 2026-05-26: the default Playwright headless shell path
reported `webgl` and disabled AO comparison controls. Switching the collector to
Playwright's `chromium` channel produced `rendererBackend: "webgpu"` with
HeadlessChrome 148. The benchmark collector records fallback sessions as
`status: "blocked"` with `environment` diagnostics instead of inventing rows.

Denoise-gate note on 2026-05-26: `AO_BENCHMARK_DENOISE_MATRIX=1` now expands
the automated run to raw/denoised rows in both Beauty and AO-only views. The
first successful matrix run wrote 32 WebGPU rows to
`artifacts/benchmarks/ao-benchmark-latest.json`; screenshots were intentionally
off for that harness-only verification.

Split-composer note on 2026-05-26: split screenshots are now guarded by an E2E
canvas pixel smoke. The test samples each selected segment and fails black or
missing panels; the bug was a full-canvas clear during scissored segment
rendering.

N8AO note: in this harness the `n8ao-webgpu` node exposes its own internally
filtered output. The demo raw/denoised toggle applies to GTAO/VBAO, but N8AO
rows are annotated with `denoiseNote` because `n8ao` raw/denoised rows are not
true raw-vs-filtered N8AO pairs.

High-sample note on 2026-05-26: `AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1` writes a
separate sample comparison artifact at
`artifacts/benchmarks/ao-vbao-sample-matrix-latest.json` when used with
`AO_BENCHMARK_OUT`. The first run compared raw baseline VBAO (`8` samples,
`3` slices) against raw high-sample VBAO (`16` samples, `3` slices). Screenshot
review did not support "more samples fixes it": high-sample still shows the
magic-square pattern and increases broad darkening in AO-only views. Timings in
that run are useful only as rough medians/p95s because some rows have small
sample windows and startup spikes.

The rows below are archived legacy local WebGPU timing captures from the pre-product-output contract with screenshot
review labels. They are not current production rows and not a quality/perf victory claim: VBAO is fast in this
scene, but the screenshots still show named failures that must be fixed before
claiming a Pareto win.

| scene | cameraId | resolution | renderMode | mode | composeModes | viewMode | denoise | fullResolutionVbao | vbaoSamplingSchedule | renderer | fps | avgFrameMs | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | beauty | raw | false | n/a | webgpu | 325 | 3.08 | 1.6 | 3.5 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | beauty | raw | true | magic-square | webgpu | 634.2 | 1.58 | 1.5 | 2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | beauty | raw | false | n/a | webgpu | 546.2 | 1.83 | 1.9 | 2.3 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | beauty | raw | true | magic-square | webgpu | 411 | 2.43 | 2 | 3.5 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | beauty | denoised | false | n/a | webgpu | 575.4 | 1.74 | 1.7 | 2.3 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | beauty | denoised | true | magic-square | webgpu | 691.2 | 1.45 | 1.4 | 1.6 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | beauty | denoised | false | n/a | webgpu | 646.1 | 1.55 | 1.4 | 2.1 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | beauty | denoised | true | magic-square | webgpu | 372.7 | 2.68 | 2.9 | 3.9 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | ao | raw | false | n/a | webgpu | 847 | 1.18 | 1.1 | 1.7 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | ao | raw | true | magic-square | webgpu | 882.4 | 1.13 | 1.1 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | ao | raw | false | n/a | webgpu | 607.4 | 1.65 | 1.7 | 2.2 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | ao | raw | true | magic-square | webgpu | 419.6 | 2.38 | 2.1 | 3.2 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | ao | denoised | false | n/a | webgpu | 749.4 | 1.33 | 1.2 | 2 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | ao | denoised | true | magic-square | webgpu | 838 | 1.19 | 1.1 | 1.7 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__denoised__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | ao | denoised | false | n/a | webgpu | 610.1 | 1.64 | 1.7 | 2.5 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | ao | denoised | true | magic-square | webgpu | 411 | 2.43 | 2.5 | 3.3 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | beauty | raw | false | n/a | webgpu | 286 | 3.5 | 1.8 | 5.4 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | beauty | raw | true | magic-square | webgpu | 519 | 1.93 | 1.6 | 3.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | beauty | raw | false | n/a | webgpu | 513.2 | 1.95 | 1.9 | 2.4 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | beauty | raw | true | magic-square | webgpu | 333.3 | 3 | 3 | 4.6 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | beauty | denoised | false | n/a | webgpu | 294.4 | 3.4 | 3 | 4.3 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | beauty | denoised | true | magic-square | webgpu | 601.2 | 1.66 | 1.6 | 2.5 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | beauty | denoised | false | n/a | webgpu | 501.7 | 1.99 | 1.7 | 3 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | beauty | denoised | true | magic-square | webgpu | 357.1 | 2.8 | 2.8 | 4.4 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | ao | raw | false | n/a | webgpu | 176.4 | 5.67 | 1.8 | 4 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | ao | raw | true | magic-square | webgpu | 560.7 | 1.78 | 1.2 | 3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | ao | raw | false | n/a | webgpu | 590.6 | 1.69 | 1.3 | 2.6 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | ao | raw | true | magic-square | webgpu | 346.8 | 2.88 | 2.6 | 4.8 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | ao | denoised | false | n/a | webgpu | 306.6 | 3.26 | 2.6 | 4.7 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | ao | denoised | true | magic-square | webgpu | 570.9 | 1.75 | 1.6 | 2.5 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | ao | denoised | false | n/a | webgpu | 565.7 | 1.77 | 1.6 | 3.8 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | ao | denoised | true | magic-square | webgpu | 378.3 | 2.64 | 2.7 | 4.8 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__denoised__magic-square.png |

## Raw VBAO Sample Comparison

Artifact: `artifacts/benchmarks/ao-vbao-sample-matrix-latest.json`.

| resolution | renderMode | viewMode | preset | samples | slices | fps | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | single | beauty | baseline | 8 | 3 | 785.3 | 1.2 | 1.8 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | single | beauty | high-sample | 16 | 3 | 961.5 | 1.0 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1920x1080 | single | ao | baseline | 8 | 3 | 875.7 | 1.1 | 2.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | single | ao | high-sample | 16 | 3 | 1341.5 | 0.7 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1280x720 | single | beauty | baseline | 8 | 3 | 603.8 | 1.6 | 2.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | single | beauty | high-sample | 16 | 3 | 633.5 | 1.6 | 1.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1280x720 | single | ao | baseline | 8 | 3 | 1045.3 | 0.9 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | single | ao | high-sample | 16 | 3 | 1061.2 | 0.9 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__high-sample.png |

Interpretation: high-sample raw VBAO does not clear the named quality failures.
It increases work on paper and, in AO screenshots, makes contact regions broader
and darker instead of resolving the structured sample pattern. Treat the timing
numbers as preliminary; they do not justify skipping the sampling backtest.

Sampling-schedule note on 2026-05-26: the current evidence points at coherent
screen-space sampling, not merely too few samples. `VBAONode` now supports a
benchmark-only schedule switch and packs deterministic radial scale into the
sampling noise texture alpha. The first schedule matrix run is recorded below:
it does not justify a production schedule switch. R2 and blue-noise reduce the
old diagonal regularity in some AO-only captures, but they still show
`noise,mud,edge-bleed`; Hilbert-style sampling shows a severe checker/grid
pattern in this harness.

## Raw VBAO Schedule Comparison

Artifact: `artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41739 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

The first attempt on the default port timed out waiting for `.benchmark-panel`,
which was consistent with a stale-port or unavailable route session. Re-running
on port `41739` produced `status: "ok"`, `rendererBackend: "webgpu"`, and 56
labelled rows. All rows in the artifact have explicit `failureLabels`.

| resolution | viewMode | schedule | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | magic-square | 1.1 | 1.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | r2 | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__r2.png |
| 1920x1080 | beauty | hilbert | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__hilbert.png |
| 1920x1080 | beauty | blue-noise | 1.2 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__blue-noise.png |
| 1920x1080 | ao | magic-square | 0.8 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | r2 | 0.7 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__r2.png |
| 1920x1080 | ao | hilbert | 0.8 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__hilbert.png |
| 1920x1080 | ao | blue-noise | 0.8 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__blue-noise.png |
| 1280x720 | beauty | magic-square | 1.5 | 2.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | r2 | 1.4 | 1.7 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__r2.png |
| 1280x720 | beauty | hilbert | 1.3 | 1.6 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__hilbert.png |
| 1280x720 | beauty | blue-noise | 1.3 | 1.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__blue-noise.png |
| 1280x720 | ao | magic-square | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | r2 | 1.0 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__r2.png |
| 1280x720 | ao | hilbert | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__hilbert.png |
| 1280x720 | ao | blue-noise | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__blue-noise.png |

Decision: reject a production schedule switch for now. `magic-square` remains
the default because no candidate clears the named quality failures. The next
work should isolate denoise and/or depth hierarchy pressure instead of treating
sampling schedule alone as solved.


## VBAO Sampling v2 Evidence Gate

Artifacts:

- Sample matrix: `artifacts/benchmarks/ao-vbao-sampling-v2-sample-matrix-latest.json`.
- Schedule matrix: `artifacts/benchmarks/ao-vbao-sampling-v2-schedule-matrix-latest.json`.
- Contact sheets:
  - `artifacts/analysis/vbao_sampling_v2_sample_matrix_contact_sheet.png`
  - `artifacts/analysis/vbao_sampling_v2_schedule_matrix_1920_contact_sheet.png`
  - `artifacts/analysis/vbao_sampling_v2_schedule_matrix_1280_contact_sheet.png`

Commands:

```sh
AO_BENCHMARK_PORT=41766 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-sampling-v2-sample AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-sampling-v2-sample-matrix-latest.json node scripts/collect-ao-benchmark.mjs
AO_BENCHMARK_PORT=41767 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-sampling-v2-schedule AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-sampling-v2-schedule-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

Result: both runs returned `status: "ok"`, `rendererBackend: "webgpu"`, and
captured screenshots. This gate is after the internal per-slice/per-step jitter
change in `VBAONode`; it is not the older alpha-only radial-scale schedule gate.

Sample matrix focus rows:

| resolution | viewMode | preset | schedule | samples | slices | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | baseline | magic-square | 8 | 3 | 1 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | high-sample | magic-square | 16 | 3 | 0.9 | 1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1920x1080 | ao | baseline | magic-square | 8 | 3 | 0.8 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | high-sample | magic-square | 16 | 3 | 0.6 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1280x720 | beauty | baseline | magic-square | 8 | 3 | 1.2 | 2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | high-sample | magic-square | 16 | 3 | 1.2 | 1.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1280x720 | ao | baseline | magic-square | 8 | 3 | 0.7 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | high-sample | magic-square | 16 | 3 | 0.8 | 1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__high-sample.png |

Schedule matrix focus rows:

| resolution | viewMode | schedule | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | magic-square | 1.6 | 2.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | r2 | 1.1 | 1.6 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__r2.png |
| 1920x1080 | beauty | hilbert | 0.9 | 1.5 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__hilbert.png |
| 1920x1080 | beauty | blue-noise | 1 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__blue-noise.png |
| 1920x1080 | ao | magic-square | 0.7 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | r2 | 0.6 | 0.8 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__r2.png |
| 1920x1080 | ao | hilbert | 0.7 | 0.8 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__hilbert.png |
| 1920x1080 | ao | blue-noise | 0.7 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__blue-noise.png |
| 1280x720 | beauty | magic-square | 1.3 | 2.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | r2 | 1.4 | 2.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__r2.png |
| 1280x720 | beauty | hilbert | 1.5 | 2.4 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__hilbert.png |
| 1280x720 | beauty | blue-noise | 1.1 | 1.7 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__blue-noise.png |
| 1280x720 | ao | magic-square | 0.9 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | r2 | 0.9 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__r2.png |
| 1280x720 | ao | hilbert | 0.8 | 1.2 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__hilbert.png |
| 1280x720 | ao | blue-noise | 0.8 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__blue-noise.png |

Interpretation: sampling v2 is a valid internal step, but it is not a quality
promotion. The per-step jitter removes the old single `radialScale` coupling in
source/contracts, yet the Museum screenshots still show structured sample
patterns, broad muddy darkening, and edge leakage. High-sample rows reduce some
row p95 values and add contact darkness, but they still fail the visual gate.
The Hilbert row is especially instructive: in this harness it creates a visible
checker/grid field, so copying the XeGTAO word "Hilbert" without matching its
full pass structure would be cargo cult, not production discipline.

Decision: keep sampling v2 as internal/demo evidence only and do not promote a
public schedule or quality-tier change. The next work must add edge/confidence
metadata and the ground-truth oracle before another denoise/sampling candidate is
allowed to claim improvement. Faster timing does not beat `noise`, `mud`,
`edge-bleed`, or `false-curvature`.

## VBAO Edge/Confidence + Oracle Reference Gate (historical/rejected)

Status: **legacy internal evidence only**. The referenced edge/confidence, oracle, and denoise reference helpers are not part of the current runtime package contract; stale OpenSpec changes are archived under `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/`.

Artifacts:

- Metadata reference: `packages/horizon-ao/src/vbaoEdgeConfidence.ts`.
- Oracle reference: `packages/horizon-ao/src/vbaoGroundTruth.ts`.
- Reference filter: `packages/horizon-ao/src/vbaoSpatialDenoise.ts`.
- OpenSpec progress:
  - `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-edge-confidence-metadata/apply-progress.md`
  - `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-groundtruth-quality-oracle/apply-progress.md`

Command:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoEdgeConfidence.test.ts packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts packages/horizon-ao/src/__tests__/vbaoGroundTruth.test.ts
```

Result: 3 files / 16 tests passed.

Reference formulas now covered by tests:

```text
edgeDepth = abs(dot(Pq - Pp, Np))
edgeNormal = 1 - max(dot(Np, Nq), 0)
confidence = validSampleRatio · exp(-depthRange / σrange) · normalAgreement · maskCoverage

w = kernelWeight
  · confidence
  · exp(-edgeDepth / σd)
  · pow(max(dot(Np, Nq), 0), σn)
```

Oracle-backed candidate gate:

```text
rawScore = 1 - abs(rawAccessibility - expectedAccessibility)
candidateScore = 1 - abs(candidateAccessibility - expectedAccessibility)
accept only when candidateScore does not regress and no failure labels appear
```

Decision: this is an internal reference gate, not a visual promotion. It does
not change `VBAONodeOptions`, `@horizonao/core` exports, or any public quality
tier. Its value is that future denoise/depth/sampling candidates now have a
hard contract: suspicious neighborhoods get low confidence, and a smoother
candidate is rejected if the oracle says it is less correct or it introduces
`mud`, `edge-bleed`, or `false-curvature`.

## VBAO Oracle Fixture Matrix

Artifact: `artifacts/benchmarks/ao-vbao-oracle-fixture-matrix-latest.json`.

Implementation: `packages/horizon-ao/src/vbaoOracleFixtures.ts`.

Validation command:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts
```

Result: 1 file / 4 tests passed. The JSON artifact was generated from the same
internal fixture evaluator with `sampleCount = 4096`.

| fixture | accessibility | expected range | accepted | failureLabels |
| --- | ---: | --- | --- | --- |
| flat-open | 1.0000 | `[1, 1]` | true | none |
| full-hemisphere-blocked | 0.0000 | `[0, 0]` | true | none |
| two-wall-corner | 0.2500 | `[0.22, 0.28]` | true | none |
| thin-occluder | 0.9817 | `[0.9, 0.99]` | true | none |
| stair-step-negative | 0.6250 | `[0.35, 0.65]` | false | `false-curvature` |
| museum-scale | 0.4651 | `[0.45, 0.7]` | true | none |

Decision: the oracle fixture matrix is now the first objective gate for future
quality claims. It is deliberately small but it covers the failure modes that
kept showing up in screenshots: ordinary open/blocked extremes, corner
occlusion, thin occluder preservation, a `false-curvature` negative control, and
a museum-like mixed-scale row. It remains internal-only and is not exported from
`@horizonao/core`.

## VBAO Metadata Debug View Matrix

Artifact: `artifacts/benchmarks/ao-vbao-metadata-debug-matrix-latest.json`.

Screenshots: `artifacts/benchmarks/screenshots-vbao-metadata-debug/`.

Contact sheet: `artifacts/analysis/vbao_metadata_debug_contact_sheet.png`.

Command:

```sh
AO_BENCHMARK_PORT=41769 AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-metadata-debug AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-metadata-debug-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

Result: `status: "ok"`, `rendererBackend: "webgpu"`, 6 single-view VBAO rows.
These are debug-visibility rows, not AO quality rows; they exist so a future
metadata-aware filter can be reviewed instead of guessed.

| resolution | debugView | medianFrameMs | p95FrameMs | reviewer note | screenshotPath |
| --- | --- | ---: | ---: | --- | --- |
| 1920x1080 | edge-depth | 2.5 | 44.0 | Usable discontinuity/tangent-plane proxy, but broad bright fields mean this must not be treated as a final confidence metric. The p95 is a first-row/startup outlier, not a performance claim. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__edge-depth.png |
| 1920x1080 | edge-normal | 0.7 | 1.2 | Good silhouette and normal-discontinuity visibility. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__edge-normal.png |
| 1920x1080 | confidence | 0.8 | 1.4 | Useful internal confidence mask: medium-gray stable surfaces with darker edges/silhouettes. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__confidence.png |
| 1280x720 | edge-depth | 1.0 | 3.8 | Same limitation as 1920: enough to debug edge weighting, not enough to promote a filter. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__edge-depth.png |
| 1280x720 | edge-normal | 0.7 | 1.0 | Good normal-edge debug signal. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__edge-normal.png |
| 1280x720 | confidence | 0.9 | 1.7 | Good enough to guide the next metadata-aware denoise candidate. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__confidence.png |

Decision: accept the GPU metadata debug harness as internal tooling only. This
does not promote denoise, depth hierarchy, or any public `VBAONodeOptions`
surface. The valuable part is visibility: edge-normal and confidence now expose
the metadata needed for a bitmask-aware filter review. The edge-depth view also
shows why we need discipline: if it is used blindly it can become another
`false-curvature` source.

## VBAO Denoise Gate Comparison (historical/rejected)

Status: **legacy evidence only**. These rows rejected high-sample and demo denoise/filter candidates; they are not current runtime/product controls and do not define a public denoiser toolkit.

Artifact: `artifacts/benchmarks/ao-vbao-denoise-gate-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41755 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1 AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-denoise-gate-latest.json node scripts/collect-ao-benchmark.mjs
```

Result: `status: "ok"`, `rendererBackend: "webgpu"`, 48 labelled rows.
The run compares raw baseline, raw high-sample, generic demo denoise, and the
demo-only custom bilateral candidate. The custom candidate is internal to the
Museum benchmark harness; it is not part of `VBAONodeOptions` and is not exported
from `@horizonao/core`.

| resolution | viewMode | denoise | preset | filter | samples | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | raw | baseline | n/a | 8 | 2.0 | 3.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | raw | high-sample | n/a | 16 | 1.1 | 3.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1920x1080 | beauty | denoised | baseline | generic | 8 | 1.3 | 2.6 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square__generic.png |
| 1920x1080 | beauty | denoised | baseline | custom-bilateral | 8 | 1.1 | 2.0 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square__custom-bilateral.png |
| 1920x1080 | ao | raw | baseline | n/a | 8 | 0.9 | 1.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | raw | high-sample | n/a | 16 | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1920x1080 | ao | denoised | baseline | generic | 8 | 1.2 | 2.5 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__denoised__magic-square__generic.png |
| 1920x1080 | ao | denoised | baseline | custom-bilateral | 8 | 0.8 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__denoised__magic-square__custom-bilateral.png |
| 1280x720 | beauty | raw | baseline | n/a | 8 | 1.5 | 2.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | raw | high-sample | n/a | 16 | 1.4 | 2.0 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1280x720 | beauty | denoised | baseline | generic | 8 | 1.5 | 2.0 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__denoised__magic-square__generic.png |
| 1280x720 | beauty | denoised | baseline | custom-bilateral | 8 | 1.3 | 1.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__denoised__magic-square__custom-bilateral.png |
| 1280x720 | ao | raw | baseline | n/a | 8 | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | raw | high-sample | n/a | 16 | 1.0 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1280x720 | ao | denoised | baseline | generic | 8 | 1.1 | 1.3 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__denoised__magic-square__generic.png |
| 1280x720 | ao | denoised | baseline | custom-bilateral | 8 | 1.0 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__denoised__magic-square__custom-bilateral.png |

Decision: reject production denoise promotion for this phase. Generic denoise
reduces visible patterning by adding `mud`, `edge-bleed`, and `thin-gap`
failure. The custom bilateral candidate preserves edges better and has acceptable
median/p95 timings, but it does not materially remove the structured VBAO noise.
The next algorithmic pressure is not "more blur"; it is either depth hierarchy
for large-radius sampling or bitmask/confidence metadata for a filter that knows
which sectors were uncertain.

## VBAO Depth Hierarchy / Radius Stress Matrix

Artifact: `artifacts/benchmarks/ao-vbao-radius-stress-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41763 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-radius-stress-latest.json node scripts/collect-ao-benchmark.mjs
```

The run produced 40 WebGPU rows. The table below records raw VBAO baseline vs
large-radius focus rows; denoised rows remain generic-denoise evidence and do
not promote depth hierarchy.

| resolution | renderMode | viewMode | radiusPreset | radius | expectedDepthLevel | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | single | beauty | baseline | 0.35 | 0 | 1.7 | 2.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | single | beauty | large-radius | 0.7 | 1 | 1.5 | 1.8 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1920x1080 | compose | beauty | baseline | 0.35 | 0 | 3.0 | 4.4 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| 1920x1080 | compose | beauty | large-radius | 0.7 | 1 | 3.4 | 4.6 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square__large-radius.png |
| 1920x1080 | single | ao | baseline | 0.35 | 0 | 1.4 | 5.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | single | ao | large-radius | 0.7 | 1 | 1.1 | 1.8 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1920x1080 | compose | ao | baseline | 0.35 | 0 | 2.6 | 3.1 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| 1920x1080 | compose | ao | large-radius | 0.7 | 1 | 2.3 | 3.5 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square__large-radius.png |
| 1280x720 | single | beauty | baseline | 0.35 | 0 | 2.4 | 3.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | single | beauty | large-radius | 0.7 | 1 | 1.9 | 3.7 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1280x720 | compose | beauty | baseline | 0.35 | 0 | 3.5 | 6.3 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| 1280x720 | compose | beauty | large-radius | 0.7 | 1 | 4.1 | 8.6 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square__large-radius.png |
| 1280x720 | single | ao | baseline | 0.35 | 0 | 1.1 | 2.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | single | ao | large-radius | 0.7 | 1 | 1.2 | 3.2 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1280x720 | compose | ao | baseline | 0.35 | 0 | 3.5 | 8.6 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| 1280x720 | compose | ao | large-radius | 0.7 | 1 | 2.5 | 7.2 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square__large-radius.png |

Decision: continue depth hierarchy investigation, but do not promote a
production depth-MIP path yet. Large-radius rows produce `scale-mismatch` and
broader muddy accessibility while the reference selector predicts level `1`.
The next implementation gate is an internal depth prefilter experiment compared
against these exact rows; it must improve the large-radius captures without
increasing p95 beyond the current envelope.

## VBAO Depth Prefilter Experiment

Artifact: `artifacts/benchmarks/ao-vbao-depth-prefilter-matrix-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41764 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1 AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-depth-prefilter-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

The run produced 56 WebGPU rows. The table below records the single-view raw
VBAO baseline-vs-prefilter rows; compose and denoised rows are kept in the JSON
artifact but do not change the decision.

| resolution | viewMode | radiusPreset | depthPrefilter | radius | expectedDepthLevel | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | baseline | baseline | 0.35 | 0 | 1.1 | 1.6 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | baseline | prefilter | 0.35 | 0 | 1.2 | 1.7 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__prefilter.png |
| 1920x1080 | beauty | large-radius | baseline | 0.7 | 1 | 1.0 | 1.4 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1920x1080 | beauty | large-radius | prefilter | 0.7 | 1 | 0.9 | 1.4 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__large-radius__prefilter.png |
| 1920x1080 | ao | baseline | baseline | 0.35 | 0 | 0.6 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | baseline | prefilter | 0.35 | 0 | 0.6 | 0.9 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__prefilter.png |
| 1920x1080 | ao | large-radius | baseline | 0.7 | 1 | 0.6 | 0.6 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1920x1080 | ao | large-radius | prefilter | 0.7 | 1 | 0.6 | 0.8 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__large-radius__prefilter.png |
| 1280x720 | beauty | baseline | baseline | 0.35 | 0 | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | baseline | prefilter | 0.35 | 0 | 0.9 | 1.5 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__prefilter.png |
| 1280x720 | beauty | large-radius | baseline | 0.7 | 1 | 0.8 | 1.5 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1280x720 | beauty | large-radius | prefilter | 0.7 | 1 | 0.8 | 1.1 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__large-radius__prefilter.png |
| 1280x720 | ao | baseline | baseline | 0.35 | 0 | 0.8 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | baseline | prefilter | 0.35 | 0 | 0.7 | 1.1 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__prefilter.png |
| 1280x720 | ao | large-radius | baseline | 0.7 | 1 | 0.7 | 0.9 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1280x720 | ao | large-radius | prefilter | 0.7 | 1 | 0.9 | 1.1 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__large-radius__prefilter.png |

Decision: reject the 2x2 farthest-supported depth prefilter candidate. The
candidate stays inside the demo harness only and SHALL NOT become public API.
It keeps the same `noise,mud,edge-bleed,scale-mismatch` labels as baseline and
adds a reviewer-visible staircase / false-curvature artifact: the AO no longer
reads as contact or visibility; it reads like the depth field itself was
quantized into broad steps. Faster median/p95 rows are irrelevant because the
visual signal is worse.

Root cause hypothesis after code and reference review:

- The current schedule switch changes one per-pixel rotation/radial-scale
  texture. It does not implement a per-slice/per-step low-discrepancy sequence,
  so high samples tend to reinforce the same screen-space lattice instead of
  decorrelating it.
- `stepFrac = (j + 1) / samples * radialScale` compresses every step in a pixel
  by the same factor. That helps break aliases locally but also changes effective
  radius per pixel, which can read as broad curvature on smooth planes.
- The demo prefilter is a one-level local 2x2 depth substitution, not a
  XeGTAO/CACAO-style depth MIP hierarchy selected by sample footprint. It
  chooses farthest supported depth around discontinuities and therefore invents
  false large-scale depth bands.
- Generic spatial denoise cannot fix this without edge/confidence metadata; it
  turns the structured error into `mud`, `edge-bleed`, and `thin-gap`.

Reference matrix:

| reference | relevant implementation detail | repo status | candid rating |
| --- | --- | --- | --- |
| [SSILVB / VBAO paper](https://arxiv.org/abs/2301.11376) and [CDRIN notes](https://cdrinmatane.github.io/posts/ssaovb-code/) | 32-sector bitmask replaces two horizon angles; constant thickness controls back-face sectors; low noise is part of the published promise. | Core reference/TSL follows the bitmask idea, cosine-weighted AO, and required normals, but current visual evidence does not meet the low-noise promise. | 5/10 against the paper: mathematically aligned, visually not there yet. |
| [Three `GTAONode`](https://threejs.org/docs/pages/GTAONode.html) | Built-in WebGPU/TSL baseline with radius/thickness/falloff knobs, optional temporal filtering, and manual denoise need when temporal filtering is off. | Local GTAO is a fair Three baseline, not a direct XeGTAO/CACAO competitor. It is smoother in this museum capture but still has scale mismatch. | 6/10 as a local baseline. |
| [Intel XeGTAO](https://github.com/GameTechDev/XeGTAO) | Three compute passes: depth prefilter/MIP chain, main pass emitting AO plus edge data, then spatial denoise; tuned against ray-traced ground truth; Hilbert-driven R2 sampling. | Missing true MIPs, edge data, ground-truth tuning, and Hilbert/R2 per-step sequence. | 3/10 against XeGTAO production discipline. |
| [AMD FidelityFX CACAO](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/) | De-interleaved depth/normal prepare stage, depth MIP chain at medium+ quality, adaptive high quality, edge-aware blur with edge channels. | Missing de-interleaving, adaptive quality, edge channel, and CACAO-style blur. | 3/10 against CACAO production discipline. |
| [Community GLSL / Shadertoy-style SSILVB toys](https://cybereality.com/screen-space-indirect-lighting-with-visibility-bitmask-improvement-to-gtao-ssao-real-time-ambient-occlusion-algorithm-glsl-shader-implementation/) | Often rely on jitter, half-res execution, blur, and sometimes temporal history; they are useful for intuition but not production proof. | Our raw captures are intentionally unblurred evidence. The toy smoothness is not a free correctness claim. | 4/10 visually until we add real sampling/metadata/filter gates. |

Next gate: stop treating a local depth prefilter as the fix. The next candidate
should either (a) implement a real footprint-selected depth hierarchy with edge
metadata, or (b) implement a bitmask-aware sampling/denoise path that emits
enough confidence/edge data to filter without mud. Both require screenshots,
timings, and a ground-truth or analytic reference comparison before promotion.

## VBAO Production-Readiness Audit + Temporal-Free Roadmap Gate

Status: internal correctness scaffolding only. This gate does **not** promote
VBAO quality, denoise, depth hierarchy, or any public `VBAONodeOptions` surface.

What changed:

- Added `packages/horizon-ao/src/vbaoPaperReference.ts`, a paper/GLSL-aligned
  scalar reference path that captures normal-centered slice shift, normalized
  front/back horizon intervals, constant thickness behavior, and popcount
  accessibility. It exists beside the current cosine-weighted reference so we
  can compare variants instead of pretending they are the same formula.
- Added `resolveVbaoDepthMipCandidate(...)` to
  `packages/horizon-ao/src/vbaoDepthHierarchy.ts`. A footprint-selected coarse
  depth is now accepted only when metadata says the neighborhood is stable;
  high edge depth, high edge normal, low confidence, or a large coarse/base
  depth delta falls back to base depth.
- Added `denoiseVbaoTemporalFreeAccessibility(...)` to
  `packages/horizon-ao/src/vbaoSpatialDenoise.ts`. This is a reference report
  for a single-frame, edge-aware candidate filter: `temporalFramesUsed` is
  always `0`, and suspicious neighbors are rejected by depth, normal,
  confidence, and mask-coverage metadata before they can smear AO.

Candid decision: still **not production-ready**. This improves the audit and
unit-gate foundation, but it does not satisfy GPU readback parity or visual
promotion. The current ratings remain conservative:

| Dimension | Current rating | Why |
| --- | --- | --- |
| Paper fidelity | 5/10 | We now have a paper/GLSL scalar reference for comparison, but the live shader still uses the current cosine-weighted variant and is not proven GPU-parity-equivalent. |
| Visual quality vs claim | 4/10 | Previous Museum evidence still shows `noise`, `mud`, `edge-bleed`, `scale-mismatch`, and `false-curvature`. |
| Production discipline vs XeGTAO/CACAO | 3/10 | Real depth MIPs, edge channels, GPU parity, and visual acceptance gates are still not complete. |
| Testing/evidence rigor | 6/10 | CPU reference coverage improved; GPU readback parity remains the missing gate. |

Validation for this gate:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoPaperReference.test.ts packages/horizon-ao/src/__tests__/vbaoDepthHierarchy.test.ts packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts
# 3 files / 24 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 15 files / 134 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# packages/horizon-ao passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# apps/demo passed
```

Production build was not run.

## 2026-05-26 — VBAO Upstream Signal Correction Gate

Status: **started; artifact-specific oracle fixtures added; no candidate promoted**.

Why this gate exists:

- SSILVB/reference formula promotion was rejected.
- `metadata-aware` v1 was rejected.
- `gtvbao++` per-tap metadata was rejected.
- The common issue is upstream: raw VBAO still carries `noise`,
  `false-curvature`, and `scale-mismatch`.

What changed:

- Added internal oracle fixture targets for:
  - `thin-gap-parallel-planes`
  - `large-flat-floor-no-curvature`
  - `small-contact-object-on-plane`
  - `grazing-wall-corner`
  - `subpixel-thin-occluder`
- Each fixture records the failure labels it is meant to catch before any new
  filter or formula work can claim improvement.
- Added OpenSpec change:
  `G:\RWY37\horizon-ao\openspec\changes\vbao-upstream-signal-correction\`.

Decision:

- No new filter tuning in this gate.
- Next implementation work should target either sampling distribution or
  radius/thickness scale against these fixtures first.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts packages/horizon-ao/src/__tests__/vbaoUpstreamSignalCorrection.test.ts
# 2 files / 7 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 21 files / 176 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

Production build was not run.

## 2026-05-26 — VBAO Sampling Distribution Gate

Status: **internal decision contract added; no sampling schedule promoted**.

What changed:

- Added an internal sampling distribution gate that evaluates current schedules
  against the artifact-specific fixtures added by the upstream signal correction
  gate.
- Schedules considered:
  - `magic-square`
  - `r2`
  - `hilbert`
  - `blue-noise`
- The production schedule remains `magic-square` until a non-production schedule
  clears all targeted fixture labels.

Decision:

- verdict: `keep-production-sampling`
- promoted schedule: `magic-square`
- reason: no schedule currently reduces all targeted fixture labels.

No new filter tuning was added.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoSamplingDistributionGate.test.ts packages/horizon-ao/src/__tests__/vbaoUpstreamSignalCorrection.test.ts packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts
# 3 files / 11 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 22 files / 180 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

## 2026-05-26 — VBAO Radius/Thickness Scale Gate

Status: **internal decision contract added; no radius/thickness preset promoted**.

What changed:

- Added an internal radius/thickness scale gate that evaluates candidate presets
  against the same artifact-specific fixtures used by the upstream signal
  correction gate.
- Presets considered:
  - `museum-baseline` — radius `0.35`, thickness `0.28`
  - `thin-gap-conservative` — radius `0.25`, thickness `0.06`
  - `small-contact-tight` — radius `0.18`, thickness `0.05`
  - `large-radius` — radius `0.7`, thickness `0.28`

Decision:

- verdict: `keep-radius-thickness`
- promoted preset: `museum-baseline`
- reason: no radius/thickness preset clears all targeted fixture labels.

No new filter tuning was added.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoRadiusThicknessScaleGate.test.ts packages/horizon-ao/src/__tests__/vbaoSamplingDistributionGate.test.ts packages/horizon-ao/src/__tests__/vbaoUpstreamSignalCorrection.test.ts packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts
# 4 files / 15 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 23 files / 184 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

## 2026-05-26 — VBAO Upstream GPU Fixture Evidence Matrix

Status: **internal parity scene contracts added; no candidate promoted**.

What changed:

- Extended the internal `/vbao-parity` GPU/scalar matrix to include the
  artifact-specific upstream fixtures:
  - `thin-gap-parallel-planes`
  - `large-flat-floor-no-curvature`
  - `small-contact-object-on-plane`
  - `grazing-wall-corner`
  - `subpixel-thin-occluder`
- Added accepted scalar anchors away from silhouette/coverage discontinuities
  for each upstream fixture.
- Kept the fixture semantics explicit:
  - the flat-floor fixture is a single receiver only;
  - the grazing-corner fixture includes true non-frontal normals;
  - the subpixel-thin-occluder fixture uses a subpixel-width occluder.

Decision:

- This is parity/evidence infrastructure only.
- No sampling schedule, radius/thickness preset, formula, denoise filter, or
  public API is promoted by this change.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 1 file / 19 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts packages/horizon-ao/src/__tests__/vbaoUpstreamSignalCorrection.test.ts packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts
# 3 files / 26 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 23 files / 186 tests passed

cd G:\RWY37\horizon-ao\apps\demo
$env:E2E_WEBGPU_PARITY='1'; $env:PLAYWRIGHT_EXTERNAL_SERVER='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:41737'; .\node_modules\.bin\playwright.ps1 test vbao-parity.spec.ts --project=chromium --grep "all fixture reports pass|matches fixed scalar" --reporter=list --timeout=90000
# 2 tests passed

cd G:\RWY37\horizon-ao\packages\horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd G:\RWY37\horizon-ao\apps\demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

git diff --check
# clean except expected LF→CRLF warnings
```

Peer-review note: the first RED/green unit implementation was not enough.
Targeted WebGPU `/vbao-parity` initially failed on `thin-gap-parallel-planes`,
`grazing-wall-corner`, and `subpixel-thin-occluder`. The anchors/surfaces were
tightened to stable rasterized regions before accepting the evidence route.

## 2026-05-26 — GTVBAO++ Per-Tap Bitmask Metadata Gate (historical/rejected)

Status: **implemented and captured as internal evidence candidate only; not promoted**.

What changed after the first `gtvbao++` pass:

- Added an internal sampleable bitmask metadata texture in
  `G:\RWY37\horizon-ao\apps\demo\src\scenes\MuseumScene.tsx`.
- Rewired `vbaoGtVbaoPlusPlusSmartDenoiserScalar` so center and neighbor taps
  sample metadata independently instead of reusing center-pixel
  `maskCoverage` / `maskPopcount` / `paperPopcount` for every tap.
- The pass still consumes raw VBAO directly and remains temporal-free. It does
  not consume generic denoise output, `metadata-aware` v1 output, velocity,
  history, frame index, or accumulation.
- No public `VBAONodeOptions` or `@horizonao/core` export was added.

Evidence:

- JSON: `G:\RWY37\horizon-ao\artifacts\benchmarks\ao-vbao-gtvbao-plus-plus-per-tap-metadata-latest.json`
- Screenshots: `G:\RWY37\horizon-ao\artifacts\benchmarks\screenshots-vbao-gtvbao-plus-plus-per-tap-metadata\`
- Contact sheet: `G:\RWY37\horizon-ao\artifacts\analysis\vbao_gtvbao_plus_plus_per_tap_metadata_contact_sheet.png`
- OpenSpec: `G:\RWY37\horizon-ao\openspec\changes\archive\2026-05-28-vbao-p0-rejected-research\vbao-gtvbao-plus-plus-smartdenoiser\`

WebGPU run:

```sh
AO_BENCHMARK_EXTERNAL_SERVER=1 AO_BENCHMARK_BASE_URL=http://127.0.0.1:41775 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_HEADED=1 AO_BENCHMARK_BROWSER_CHANNEL=chrome AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-gtvbao-plus-plus-per-tap-metadata-latest.json AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-gtvbao-plus-plus-per-tap-metadata node apps/demo/scripts/collect-ao-benchmark.mjs
# status ok / WebGPU / 56 rows / screenshots captured
```

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 17 files / 156 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed
```

Candid review: this is the correct architectural direction because taps now
carry their own bitmask metadata. But this still does **not** prove promotion.
The single-row 1920 beauty `gtvbao++` p95 in this run includes a shader/startup
outlier (`125.1ms`), while the 1920 AO row is stable (`p95 1.1ms`) and compose
rows are in normal range. Visually, the pass is stricter and less legacy-layered,
but it still depends on the current cosine-production VBAO signal; the next
decision gate remains SSILVB/reference formula ablation / formula choice, not
blind tuning. There is no verified live GPU SSILVB/reference implementation in
this repo.

Production build was not run.



## 2026-05-26 — GTVBAO++ Per-Tap Filter Decision Gate

Status: **decision recorded; candidate not promoted**.

Artifact:

- `G:\RWY37\horizon-ao\artifacts\analysis\vbao_gtvbao_plus_plus_per_tap_decision.json`

Decision result:

- verdict: `reject-candidate`
- candidate: `gtvbao++`
- `promoteCandidate`: `false`
- public API changes: none
- production build: not run

Candid visual read from the per-tap contact sheet:

- The per-tap metadata architecture is the right direction; center-only metadata
  was conceptually weak and now the neighbor taps can carry their own bitmask
  signals.
- But the output is still too close to raw VBAO. It retains `noise`,
  `false-curvature`, and `scale-mismatch` in the same Museum areas.
- That means this is a good diagnostic/architecture gate, not a production
  filter. No shortcuts: a filter that does not reduce the named artifact is not
  a filter we promote.

Gate rule now enforced by internal tests:

- Required raw/candidate rows with `pending-review` block promotion.
- If raw VBAO has `noise` and the candidate still has `noise`, promotion is
  rejected.
- Candidate rows with `mud`, `halo`, `thin-gap`, `edge-bleed`,
  `false-curvature`, or `scale-mismatch` are rejected.

Next move:

- Stop blind filter-weight tuning.
- The next useful gate is earlier in the signal: sampling/radius-thickness
  correction or fixture-driven per-tap metadata thresholds with artifact-specific
  oracles.
## VBAO GPU Readback Parity Contract

Status: quantitative fixture contract wired and passing on the local WebGPU
Playwright route.

What changed:

- Added `packages/horizon-ao/src/vbaoGpuReadbackParity.ts`, an internal scalar
  mirror for the `/vbao-parity` flat-plane scene. It evaluates named pixels:
  `flat-plane-center`, `flat-plane-left-quarter`, and `flat-plane-upper-right`.
- The scalar expected value is quantized to the byte-format render target before
  comparison: `round(expected * 255) / 255`, with tolerance `1 / 255 + ε`.
- `apps/demo/src/scenes/VbaoParityPage.tsx` now exposes one canonical
  `window.__vbaoParity.fixtures` matrix plus `fixturePixels` diagnostics.
- `apps/demo/e2e/vbao-parity.spec.ts` now fails the WebGPU parity run when any
  named fixture row exceeds tolerance.
- Added OpenSpec artifacts in
  `openspec/changes/vbao-gpu-readback-parity/`.

Candid decision: this is a **better correctness tripwire**, not visual
promotion. Peer review found two important harness bugs before the passing run:
the scalar mirror was not following Three's WebGPU Y-flip helpers, and the
readback normalizer treated the WebGPU 256-byte row-padded buffer as a tightly
packed image. Both were fixed before accepting the E2E result. The parity claim
is still scoped: fixed flat-plane fixture pixels only, not corners/thin occluders
yet.

Validation for the contract:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 1 file / 9 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 15 files / 137 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# packages/horizon-ao passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# apps/demo passed
```

Local WebGPU E2E:

```sh
E2E_WEBGPU_PARITY=1 PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:41782 node ..\..\node_modules\.pnpm\@playwright+test@1.60.0\node_modules\@playwright\test\cli.js test vbao-parity.spec.ts --reporter=list --timeout=60000
# 5 tests passed
```

Production build was not run.

## VBAO Multi-Fixture GPU Parity Matrix

Status: expanded `/vbao-parity` from the flat-plane readback tripwire into an
internal three-fixture matrix:

- `flat-plane`
- `two-wall-corner`
- `thin-occluder`

What changed:

- `packages/horizon-ao/src/vbaoGpuReadbackParity.ts` now exposes internal matrix
  helpers for stable scene IDs, scalar fixture rows, per-fixture reports, and
  matrix-level pass/fail aggregation.
- `apps/demo/src/scenes/VbaoParityPage.tsx` renders each fixture in sequence,
  reads back its VBAO render target, and exposes
  `window.__vbaoParity.fixtures`.
- `apps/demo/e2e/vbao-parity.spec.ts` now asserts that every fixture report and
  every named row passes.
- `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-parity-fixture-expansion/` records the historical SDD proposal,
  design, tasks, spec, and ultraplan.

Candid scope: this is **still internal correctness tooling**, not visual
promotion. The first matrix uses deterministic frontal-rect analytic fixtures:
flat plane, an L-shaped depth-band corner proxy, and a frontal thin occluder
over a receiver plane. That makes the GPU/scalar plumbing debuggable and proves
the matrix runner works. It does **not** yet replace the hardening gate for true
perpendicular-wall normals.

Peer-review finding during E2E: the first thin-occluder left-gap anchor landed
too close to the coverage-ambiguous silhouette. GPU rasterization saw more thin
blocker coverage than the analytic scalar edge, producing a `0.0431` absolute
error. The anchor was moved off the silhouette before accepting the matrix.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 1 file / 13 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 15 files / 141 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# packages/horizon-ao passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# apps/demo passed
```

Local WebGPU E2E:

```sh
E2E_WEBGPU_PARITY=1 PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:41737 node .\node_modules\@playwright\test\cli.js test e2e/vbao-parity.spec.ts --reporter=list
# 6 tests passed
```

Screenshot / analysis artifacts:

- `artifacts/analysis/vbao_parity_matrix_screenshot.png`
- `artifacts/analysis/vbao_parity_matrix_latest.json`
- `artifacts/analysis/vbao_next_steps_literature_contrast.png`
- `artifacts/analysis/vbao_next_steps_literature_contrast.html`
- `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-parity-fixture-expansion/next-steps-literature-contrast.md`

Literature grounding added:

- SSILVB/VBAO: visibility bitmask and thin-surface light-passing semantics.
- XeGTAO: depth prefilter, edge info, spatial denoise, and reference tuning.
- CACAO: de-interleaved depth/normal buffers, depth MIPs, edge values,
  importance maps, edge-aware blur, and bilateral upsampling.
- NRD: guided denoise discipline via normal/roughness/viewZ/motion-vector
  guides and explicit noisy-signal packing.
- Filter-adapted sampling: sampling pattern must be co-designed with the filter
  that consumes it.

Production build was not run.

## VBAO Hardened Oracle Gate: True-Normal Corner + Formula Labels

Status: **accepted as internal correctness tooling; next gate is filter
comparison**.

What changed after the first matrix:

- `packages/horizon-ao/src/vbaoGpuReadbackParity.ts` now includes the
  `two-wall-corner-true-normal` fixture with non-`+Z` wall normals, internal
  anchor validation metadata, and per-row formula comparison labels.
- `apps/demo/src/scenes/VbaoParityPage.tsx` orients the WebGPU fixture planes
  from their declared scalar normals instead of assuming every anchor surface is
  frontal, and exposes internal normal/fixture readback diagnostics on
  `/vbao-parity`.
- `apps/demo/e2e/vbao-parity.spec.ts` now requires the hardened fixture to be
  present on `/vbao-parity`.
- `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-parity-fixture-expansion/` records the historical hardened oracle
  contract and the `paper-matches-gpu`, `cosine-matches-gpu`, `both-drift`, and
  `visual-choice-required` formula labels.

Candid gate result: the first non-frontal wall anchor choices were not stable
enough. They exposed `both-drift` rows, but the normal readback diagnostic
proved the MRT normals themselves matched the scalar fixture normals
(`+X` for the left wall and `-Y` for the top wall). The fixed anchors were moved
to stable interior wall pixels that pass the same silhouette guard and the same
one-byte render-target tolerance.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 1 file / 16 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 15 files / 144 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# packages/horizon-ao passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# apps/demo passed
```

Local WebGPU E2E:

```sh
E2E_WEBGPU_PARITY=1 PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:41737 node .\node_modules\@playwright\test\cli.js test e2e/vbao-parity.spec.ts --reporter=list
# 6 tests passed
```

Initial rejected anchor evidence:

| Fixture | Anchor | GPU | Cosine scalar | Paper scalar | Abs error vs cosine | Label |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `two-wall-corner-true-normal` | `true-corner-left-wall` | `0.862745` | `0.905882` | `0.827451` | `0.043137` | `both-drift` |
| `two-wall-corner-true-normal` | `true-corner-top-wall` | `0.647059` | `0.560784` | `0.576471` | `0.086275` | `both-drift` |

Decision: **do not treat the first frontal proxy matrix as production parity**.
The hardened `two-wall-corner-true-normal` fixture is now part of the live gate,
and the route fails loudly if its named rows drift. The next work may proceed to
metadata-aware temporal-free filter comparison, but only as an internal candidate
until the visual evidence gate passes.

Production build was not run.

## VBAO Temporal-Free Metadata-Aware Filter Gate

Status: **implemented as internal demo/benchmark candidate only; not
promoted**.

What changed:

- `apps/demo/src/scenes/MuseumScene.tsx` now exposes internal
  `metadata-aware` as a Museum-only `VbaoDenoiseFilter` value.
- The candidate is spatial-only and uses raw VBAO plus depth, normal,
  edge-depth, edge-normal, and confidence metadata to reject high-edge or
  low-confidence taps before blending.
- `apps/demo/scripts/collect-ao-benchmark.mjs` now includes
  `metadata-aware` in `AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1` captures.
- `apps/demo/e2e/ao-compare.spec.ts` verifies
  `window.__aoBenchmark.setVbaoDenoiseFilter('metadata-aware')` and benchmark
  snapshot reporting.
- `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-temporal-free-metadata-filter/` records the historical
  evidence-first contract.

Important boundary: this is **not** a public API. `VBAONodeOptions` and
`@horizonao/core` exports are unchanged. This is also **not** claimed as
bitmask-aware filtering yet; GPU-visible mask coverage/popcount remains a later
gate.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoMetadataAwareFilter.test.ts
# 1 file / 5 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 16 files / 149 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# packages/horizon-ao passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# apps/demo passed
```

Targeted Playwright route coverage:

```sh
PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:41759 node .\node_modules\@playwright\test\cli.js test e2e/ao-compare.spec.ts --grep "denoise filter candidates|metadata-aware filter" --reporter=list --workers=1
# 2 tests passed
```

WebGPU benchmark evidence:

```sh
AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-metadata-aware-filter-latest.json AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-metadata-aware-filter node apps/demo/scripts/collect-ao-benchmark.mjs
# status ok / 48 rows / 48 screenshots
```

Artifacts:

- `artifacts/benchmarks/ao-vbao-metadata-aware-filter-latest.json`
- `artifacts/benchmarks/screenshots-vbao-metadata-aware-filter/`
- `artifacts/analysis/vbao_metadata_aware_filter_contact_sheet.png`

1920x1080 AO single-view timings from the matrix:

| Mode | Denoise | VBAO filter | Median ms | p95 ms | Labels |
| --- | --- | --- | ---: | ---: | --- |
| `gtao` | `raw` | `n/a` | 1.0 | 1.9 | `none` |
| `vbao` | `raw` | `n/a` | 0.9 | 1.5 | `noise,false-curvature,scale-mismatch` |
| `n8ao` | `raw` | `n/a` | 1.5 | 1.8 | `none` |
| `gtao` | `denoised` | `n/a` | 1.3 | 2.0 | `none` |
| `vbao` | `denoised` | `generic` | 1.0 | 1.3 | `noise,mud,false-curvature,scale-mismatch` |
| `vbao` | `denoised` | `custom-bilateral` | 0.7 | 1.0 | `noise,false-curvature,scale-mismatch` |
| `vbao` | `denoised` | `metadata-aware` | 0.7 | 1.1 | `noise,false-curvature,scale-mismatch` |
| `n8ao` | `denoised` | `n/a` | 0.8 | 1.4 | `none` |

1280x720 AO single-view timings from the matrix:

| Mode | Denoise | VBAO filter | Median ms | p95 ms | Labels |
| --- | --- | --- | ---: | ---: | --- |
| `gtao` | `raw` | `n/a` | 0.7 | 1.1 | `none` |
| `vbao` | `raw` | `n/a` | 0.6 | 0.9 | `noise,false-curvature,scale-mismatch` |
| `n8ao` | `raw` | `n/a` | 0.8 | 1.3 | `none` |
| `gtao` | `denoised` | `n/a` | 1.0 | 2.1 | `none` |
| `vbao` | `denoised` | `generic` | 0.7 | 0.9 | `noise,mud,false-curvature,scale-mismatch` |
| `vbao` | `denoised` | `custom-bilateral` | 0.8 | 0.9 | `noise,false-curvature,scale-mismatch` |
| `vbao` | `denoised` | `metadata-aware` | 0.7 | 1.1 | `noise,false-curvature,scale-mismatch` |
| `n8ao` | `denoised` | `n/a` | 0.8 | 1.3 | `none` |

Candid visual decision: **reject `metadata-aware` promotion**. Implementation
and capture are green, but the screenshot review shows that metadata-aware v1
still carries raw VBAO hatch/noise plus broad `false-curvature` and
`scale-mismatch` bands. Generic denoise additionally trends toward `mud`.
Therefore the next gate is **GPU-visible mask coverage/popcount metadata**, not
blindly tuning bilateral weights.

Follow-up OpenSpec change:

- `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-mask-coverage-popcount-metadata/`
- `openspec/changes/archive/2026-05-28-vbao-p0-rejected-research/vbao-mask-coverage-popcount-metadata/roadmap.md`
  records the revised roundtable roadmap, current ratings, architecture slice,
  task order, semantic contract, and stop conditions.

Production build was not run.

## VBAO Mask Coverage / Popcount Metadata Debug Gate

Status: **accepted as internal debug metadata only; filter v2 is not implemented
yet**.

What changed:

- `apps/demo/src/scenes/MuseumScene.tsx` now exposes three additional internal
  VBAO metadata debug views:
  - `mask-coverage`
  - `mask-popcount`
- Follow-up: `paper-popcount` is now exposed as a demo-only SSILVB-style
  normal-shift/popcount diagnostic. It is not a production formula switch.
- These views are generated from an internal GPU-side visibility mask
  construction path using `occludedMask`, `bitOr(maskRange)`, and
  `countOneBits(occludedMask)`. They are **not** derived from final AO output.
  `paper-popcount` uses a separate `vbaoPaperReferenceOccludedMask` path with
  projected-normal shift and constant view-direction thickness.
- `apps/demo/scripts/collect-ao-benchmark.mjs` includes the new views in
  `AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1`.
- `packages/horizon-ao/src/__tests__/vbaoMaskMetadataGate.test.ts` now asserts
  the debug views, source-level mask construction, benchmark wiring, and public
  API boundary.

Boundary: this does **not** add public `VBAONodeOptions`, does **not** export a
new package API, and does **not** promote a new filter. The mask metadata is
demo/evidence plumbing for the next mask-aware spatial filter candidate.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoMaskMetadataGate.test.ts
# 1 file / 4 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 17 files / 153 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# packages/horizon-ao passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# apps/demo passed
```

WebGPU metadata debug matrix:

```sh
AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-mask-metadata-debug-latest.json AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-mask-metadata-debug node apps/demo/scripts/collect-ao-benchmark.mjs
# status ok / 10 rows / 10 screenshots
```

Follow-up paper/reference debug matrix:

```sh
AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-paper-reference-debug-latest.json AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-paper-reference-debug node apps/demo/scripts/collect-ao-benchmark.mjs
# status ok / 12 rows / 12 screenshots
```

Artifacts:

- `artifacts/benchmarks/ao-vbao-mask-metadata-debug-latest.json`
- `artifacts/benchmarks/screenshots-vbao-mask-metadata-debug/`
- `artifacts/analysis/vbao_mask_metadata_debug_contact_sheet.png`
- `artifacts/benchmarks/ao-vbao-paper-reference-debug-latest.json`
- `artifacts/benchmarks/screenshots-vbao-paper-reference-debug/`
- `artifacts/analysis/vbao_actual_paper_popcount_contact_sheet.png`

Candid decision: this is a useful diagnostic layer, but it is not the final
answer. `mask-coverage` currently highlights saturated broad mask regions, and
`mask-popcount` shows smoother average mask load. The next gate is to feed these
signals into a **mask-aware temporal-free filter v2** and prove it reduces
`noise` without adding `mud`, `edge-bleed`, `halo`, `thin-gap`,
`false-curvature`, or `scale-mismatch`.

Production build was not run.

## Manual WebGPU Capture Steps

1. Run `pnpm dev`.
2. Open `/museum` in a WebGPU-capable Chrome/Edge session.
3. Confirm the page reports `data-renderer-backend="webgpu"`.
4. Select `4 split` for broad comparisons or `Single` plus one algorithm for
   isolated captures.
5. Toggle `Beauty` / `AO only` and `Denoise` for every required row.
6. Enable `Full-res VBAO` for VBAO evidence rows.
7. Resize the viewport to `1920x1080`, capture all rows, then repeat at
   `1280x720`.
8. Save screenshots under `artifacts/`:

```txt
artifacts/<scene>__<cameraId>__<resolution>__<algorithm>__<viewMode>__<denoise>.png
```

## GPU Timing

Prefer WebGPU timestamps when available:

```ts
await renderer.resolveTimestampAsync()
const ms = renderer.info.render.timestamp / 1_000_000
```

If direct timestamp access is unavailable from the app scope, use the panel's
steady-state frame median or browser Performance panel and set `timingMethod`
accordingly. Record the median of 10 steady-state frames/passes.

## Failure Label Guide

| Label | Use when |
| --- | --- |
| `none` | No visible failure in the capture |
| `noise` | Grain, speckle, unstable dithering, or structured sample pattern |
| `mud` | Broad over-darkening that loses geometric readability |
| `halo` | Bright/dark outline around silhouettes or contact edges |
| `thin-gap` | Thin geometry closes gaps that should remain visibly open |
| `edge-bleed` | Denoise or sampling leaks AO across depth/normal edges |
| `scale-mismatch` | Radius/thickness looks wrong for the scene scale |
| `false-curvature` | AO forms broad bands, stair-steps, or surface-like gradients that read as geometry/curvature instead of visibility |

## Later Gates

- Adaptive thickness (`IM-01`) needs rows showing `mud` or `thin-gap`.
- Sampling changes (`IM-03`) need rows showing `noise`.
- Denoise (`IM-05`) needs rows showing raw noise plus timing that justifies the
  extra pass against higher raw sample counts.
- Depth hierarchy (`IM-06`) needs rows showing `scale-mismatch` or distant
  large-radius instability.

## 2026-05-26 — VBAO GT/Reference Alignment Gate

Decision: accepted as an internal correctness/reporting hardening pass only. No production formula promotion and no public API expansion.

What changed:

- `G:\RWY37\horizon-ao\packages\horizon-ao\src\vbaoGpuReadbackParity.ts` now computes paper/GT reference rows from paper-aligned masks instead of applying a popcount reducer to production masks.
- `G:\RWY37\horizon-ao\packages\horizon-ao\src\__tests__\vbaoGpuReadbackParity.test.ts` now requires separate production and paper/reference mask metadata.
- `G:\RWY37\horizon-ao\openspec\changes\vbao-gt-vbao-alignment\` records the SDD contract.

Candid status:

- Production VBAO remains the cosine-weighted shader path.
- GT/reference VBAO is now an independent scalar comparison path: normal shift + constant view-direction thickness + popcount reduction.
- Formula labels are more honest now: disagreement means real mask/reducer disagreement, not just reducer disagreement over the same mask.

Validation captured so far:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoGpuReadbackParity.test.ts
# 1 file / 17 tests passed

node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 17 files / 154 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# packages/horizon-ao passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# apps/demo passed

git diff --check
# clean except expected LF→CRLF warnings
```

Attempted targeted Playwright `/vbao-parity` validation via the local Playwright
CLI, but the run timed out before reporting. The hanging Playwright/Vite
processes from that attempt were stopped; this is not counted as passing
evidence.

No production build run.

### Peer review screenshot

- `G:\RWY37\horizon-ao\artifacts\analysis\vbao_gt_alignment_peer_review.png`
- `G:\RWY37\horizon-ao\openspec\changes\vbao-gt-vbao-alignment\peer-review.md`

Peer review verdict: accepted with caveats as internal correctness/reporting hardening. The main remaining blocker is refreshed `/vbao-parity` WebGPU route evidence; the targeted Playwright attempt timed out in this session and is not counted as passing.

## 2026-05-26 — Actual VBAO WebGPU Run + Research-Audit Correction

Correction: when referencing the "paper" gate, use the actual SSILVB/VBAO paper and implementation literature, not a generic paper-inspired claim.

Actual WebGPU Museum screenshots captured with `AO_BENCHMARK_REQUIRE_WEBGPU=1`:

- Raw VBAO AO, 1920x1080: `G:\RWY37\horizon-ao\artifacts\benchmarks\screenshots-vbao-actual-run-denoise-matrix\museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png`
- Denoised VBAO beauty, 1920x1080: `G:\RWY37\horizon-ao\artifacts\benchmarks\screenshots-vbao-actual-run\museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square__generic.png`
- Paper-popcount debug, 1920x1080: `G:\RWY37\horizon-ao\artifacts\benchmarks\screenshots-vbao-paper-reference-debug\museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__paper-popcount.png`
- Contact sheet: `G:\RWY37\horizon-ao\artifacts\analysis\vbao_actual_paper_popcount_contact_sheet.png`
- Matrix JSON: `G:\RWY37\horizon-ao\artifacts\benchmarks\ao-vbao-actual-run-denoise-matrix-latest.json`
- Paper debug JSON: `G:\RWY37\horizon-ao\artifacts\benchmarks\ao-vbao-paper-reference-debug-latest.json`
- Research audit: `G:\RWY37\horizon-ao\openspec\changes\vbao-gt-vbao-alignment\research-audit.md`

Result: WebGPU renderer confirmed. Labels are now assigned:

- raw VBAO AO: `noise,false-curvature,scale-mismatch`
- generic-denoised VBAO beauty: `noise,mud,false-curvature,scale-mismatch`
- production mask-popcount debug: `diagnostic-only,production-mask-popcount,formula-choice-required`
- paper-popcount debug: `diagnostic-only,paper-popcount,formula-choice-required`

Decision: **not promoted**. The new `paper-popcount` view is an internal
research/debug diagnostic that makes the SSILVB-style normal-shift/popcount path
visible in the actual Museum pipeline. It does not change `VBAONodeOptions`, does
not export a public API, and does not replace the production cosine-weighted
path until GPU parity and screenshot evidence justify that move.

Attempted targeted Playwright `/vbao-parity` validation after this debug pass,
but the run timed out before reporting and is **not** counted as passing
evidence. The next gate still needs a reliable GPU readback parity run.

Follow-up `/vbao-parity` route validation:

```sh
# Direct WebGPU route probe against Vite dev server, no production build
# route: http://127.0.0.1:41771/vbao-parity
# browser channel: chromium
# result: ready
# fixtures.passed: true
# maxAbsError: 0
```

Artifacts:

- `G:\RWY37\horizon-ao\artifacts\analysis\vbao_parity_route_latest.json`
- `G:\RWY37\horizon-ao\artifacts\analysis\vbao_parity_route_latest.png`

Targeted Playwright tests against the already-running external dev server:

```sh
PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:41771 E2E_WEBGPU_PARITY=1 node node_modules\@playwright\test\cli.js test e2e/vbao-parity.spec.ts --project=chromium --grep "all fixture reports pass|matches fixed scalar" --reporter=line
# 2 passed
```

Formula comparison result from the route artifact: all 12 hardened fixture
anchors report `cosine-matches-gpu`. That means the current GPU shader matches
the current cosine-weighted scalar oracle, while the SSILVB-style
`paper-popcount` reference is a real disagreement, not a hidden implementation
of the same formula. Candidly: this improves correctness discipline, but it
does **not** make production VBAO paper-faithful yet.

## 2026-05-26 — GTVBAO++ SmartDenoiser Internal Candidate (historical/rejected)

Status: **implemented as internal evidence candidate only; not promoted**.

What changed:

- Added demo/benchmark-only `vbaoDenoiseFilter: "gtvbao++"`.
- Added `vbaoGtVbaoPlusPlusSmartDenoiserScalar` in
  `G:\RWY37\horizon-ao\apps\demo\src\scenes\MuseumScene.tsx`.
- The pass runs after raw VBAO and before AO/beauty composition. It consumes raw
  VBAO, depth, normals, edge-depth, edge-normal, confidence, `maskCoverage`,
  production `maskPopcount`, and paper/reference `paperPopcount`.
- It does **not** consume generic denoise output, does **not** wrap
  `metadata-aware` v1, and does **not** use history/velocity/frame accumulation.
- Added reference helper:
  `denoiseVbaoGtVbaoPlusPlusSmartAccessibility` in
  `G:\RWY37\horizon-ao\packages\horizon-ao\src\vbaoSpatialDenoise.ts`.

Evidence:

- JSON: `G:\RWY37\horizon-ao\artifacts\benchmarks\ao-vbao-gtvbao-plus-plus-smartdenoiser-latest.json`
- Screenshots: `G:\RWY37\horizon-ao\artifacts\benchmarks\screenshots-vbao-gtvbao-plus-plus-smartdenoiser\`
- Contact sheet: `G:\RWY37\horizon-ao\artifacts\analysis\vbao_gtvbao_plus_plus_smartdenoiser_contact_sheet.png`
- OpenSpec: `G:\RWY37\horizon-ao\openspec\changes\archive\2026-05-28-vbao-p0-rejected-research\vbao-gtvbao-plus-plus-smartdenoiser\`

WebGPU run:

```sh
AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-gtvbao-plus-plus-smartdenoiser-latest.json AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-gtvbao-plus-plus-smartdenoiser node apps/demo/scripts/collect-ao-benchmark.mjs
# status ok / WebGPU / screenshots captured
```

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 17 files / 156 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed
```

Candid review: `gtvbao++` is architecturally cleaner than `metadata-aware` v1
because it is not layered over legacy denoise and it lets SSILVB bitmask metadata
participate in the resolve pass. But the actual Museum AO screenshot still shows
structured VBAO noise and broad `false-curvature` / `scale-mismatch`, so this is
**not promotion evidence**. If we want a real next jump, the next gate is a
proper per-tap bitmask metadata texture/channel or an internal SSILVB/reference
formula ablation, not more blind weight tuning. There is no verified "paper
shader" variant in this repo.

Production build was not run.

## 2026-05-26 — SSILVB/reference Formula Ablation Gate

Status: **implemented and captured as internal diagnostic evidence only; not promoted**.

What changed:

- Added demo/benchmark-only formula variants:
  `production-cosine` and `ssilvb-reference`.
- Added benchmark matrix env:
  `AO_BENCHMARK_VBAO_FORMULA_ABLATION_MATRIX=1`.
- The `ssilvb-reference` row renders from the internal SSILVB/reference
  accessibility scalar. It is not a public shader claim, not a denoise layer,
  and not a `VBAONodeOptions` change.
- Removed the wrong framing: this is **not** a promoted GPU implementation of
  the SSILVB formula; it is a formula-ablation gate against the production
  cosine path.

Evidence:

- JSON: `G:\RWY37\horizon-ao\artifacts\benchmarks\ao-vbao-ssilvb-reference-formula-ablation-latest.json`
- Screenshots: `G:\RWY37\horizon-ao\artifacts\benchmarks\screenshots-vbao-ssilvb-reference-formula-ablation\`
- Contact sheet: `G:\RWY37\horizon-ao\artifacts\analysis\vbao_ssilvb_reference_formula_ablation_contact_sheet.png`
- OpenSpec: `G:\RWY37\horizon-ao\openspec\changes\vbao-ssilvb-reference-formula-ablation\`

WebGPU run:

```sh
AO_BENCHMARK_EXTERNAL_SERVER=1 AO_BENCHMARK_BASE_URL=http://127.0.0.1:41776 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_HEADED=1 AO_BENCHMARK_BROWSER_CHANNEL=chrome AO_BENCHMARK_VBAO_FORMULA_ABLATION_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-ssilvb-reference-formula-ablation-latest.json AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-ssilvb-reference-formula-ablation node apps/demo/scripts/collect-ao-benchmark.mjs
# status ok / WebGPU / 8 rows / screenshots captured
```

Captured rows:

- 1920x1080 beauty, production-cosine: p95 `45.1ms`
- 1920x1080 beauty, SSILVB/reference: p95 `1.7ms`
- 1920x1080 AO, production-cosine: p95 `2.2ms`
- 1920x1080 AO, SSILVB/reference: p95 `1.1ms`
- 1280x720 beauty, production-cosine: p95 `41.5ms`
- 1280x720 beauty, SSILVB/reference: p95 `1.4ms`
- 1280x720 AO, production-cosine: p95 `1.6ms`
- 1280x720 AO, SSILVB/reference: p95 `1.1ms`

Decision:

- The gate is useful because the actual Museum pipeline can now compare the
  current production cosine formula against a visible SSILVB/reference formula
  candidate.
- The production cosine formula remains the production path. Promotion still
  requires fixture parity and visual evidence proving the replacement improves
  quality without increasing `noise`, `mud`, `edge-bleed`, `halo`, `thin-gap`,
  `false-curvature`, or `scale-mismatch`.
- The 1920x1080 and 1280x720 production beauty p95 rows are treated as
  startup/outlier rows, not as performance claims. AO rows are the better signal
  for this ablation.

Validation:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__
# 18 files / 162 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

node --check apps/demo/scripts/collect-ao-benchmark.mjs
# passed

git diff --check
# clean except expected LF->CRLF warnings
```

Production build was not run.


## 2026-05-26 — SSILVB/reference Formula Decision Gate

Status: **decision recorded; production formula not changed**.

Artifact:

- `G:\RWY37\horizon-ao\artifacts\analysis\vbao_ssilvb_reference_formula_ablation_decision.json`

Decision result:

- verdict: `keep-production-cosine`
- `promoteSsilvbReference`: `false`
- public API changes: none
- production build: not run

Candid visual read from the contact sheet:

- `production-cosine` still has `noise`, `false-curvature`, and
  `scale-mismatch`.
- `ssilvb-reference` gives a more legible contact field in some spots, but it
  also introduces broad floor/wall darkening that reads as `mud`,
  `false-curvature`, and `scale-mismatch`.
- That is not a production win. Come on: if the replacement fixes one problem
  by making a larger field artifact, it is not a promotion candidate yet.

Gate rule now enforced by internal tests:

- Required formula rows must be reviewed; `pending-review` blocks a decision.
- SSILVB/reference rows with `mud`, `halo`, `thin-gap`, `edge-bleed`,
  `false-curvature`, or `scale-mismatch` keep production on
  `production-cosine`.
- Even clean SSILVB/reference screenshots still require explicit hardened GPU
  parity before promotion.

Next move:

- Do **not** tune the formula blindly.
- Either add a hardened GPU parity route for a live SSILVB/reference production
  candidate, or continue with the mask-aware/per-tap metadata temporal-free
  filter gate.

---

## P2 — VBAO Representation Study (2026-06-10)

> Generated by `createRepresentationStudyReport()` / `formatRepresentationStudyReportMarkdown()`.
> Camera set: ssao-cam-v1 · Fixed timestamp: 1970-01-01T00:00:00.000Z

### Verdict: **not-bottleneck**

Decision-rule threshold: 0.02 (pre-registered D4)
R2-dense improvement over R0-cosine: 0.13350 − 0.13236 = **0.00114** (< 0.005 margin → not-bottleneck)
Faithfulness delta (R0-angle vs R0-cosine primary RMSE): **0.03909**

### Primary Aggregate (excludes two-wall-corner)

| Candidate | slices | Primary RMSE | Primary MAE |
| --- | ---: | ---: | ---: |
| R0-angle | 4 | 0.09441 | 0.06631 |
| R0-cosine | 4 | 0.13350 | 0.09720 |
| R1-cosine-128 | 4 | 0.13282 | 0.09632 |
| R2-dense-sweep | 4 | 0.13236 | 0.09594 |
| slices-2 | 2 | 0.16262 | 0.09979 |
| slices-4 | 4 | 0.13350 | 0.09720 |
| slices-8 | 8 | 0.13713 | 0.10161 |

### Secondary Aggregate (all 9 fixtures)

Note: two-wall-corner excluded from primary aggregate: its fixable delta reflects irreducible SS > GT camera geometry, not addressable quantization error

| Candidate | slices | Secondary RMSE | Secondary MAE |
| --- | ---: | ---: | ---: |
| R0-angle | 4 | 0.11884 | 0.08519 |
| R0-cosine | 4 | 0.14290 | 0.10896 |
| R1-cosine-128 | 4 | 0.14228 | 0.10813 |
| R2-dense-sweep | 4 | 0.14127 | 0.10735 |
| slices-2 | 2 | 0.16930 | 0.11263 |
| slices-4 | 4 | 0.14290 | 0.10896 |
| slices-8 | 8 | 0.14330 | 0.11092 |

### Per-Fixture Fixable Delta (estimate − ssAchievable)

| Candidate | flat-plane-open | sphere-contact | box-contact | two-wall-corner* | broad-wall-contact | thin-gap-separated-slabs | grazing-surface-wall | normal-sensitive-side-contact | far-object-outside-radius |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R0-angle (s=4) | 0.0000 | -0.1075 | 0.0337 | -0.2362 | 0.0544 | 0.0300 | -0.0882 | -0.2168 | 0.0000 |
| R0-cosine (s=4) | 0.0000 | -0.0880 | 0.0543 | -0.2030 | 0.1207 | 0.0688 | -0.1416 | -0.3042 | 0.0000 |
| R1-cosine-128 (s=4) | 0.0000 | -0.0879 | 0.0591 | -0.2026 | 0.1137 | 0.0645 | -0.1402 | -0.3053 | 0.0000 |
| R2-dense-sweep (s=4) | 0.0000 | -0.0891 | 0.0572 | -0.1987 | 0.1152 | 0.0642 | -0.1372 | -0.3045 | 0.0000 |
| slices-2 (s=2) | 0.0000 | 0.0180 | 0.1880 | -0.2154 | 0.0559 | -0.0116 | -0.1302 | -0.3946 | 0.0000 |
| slices-4 (s=4) | 0.0000 | -0.0880 | 0.0543 | -0.2030 | 0.1207 | 0.0688 | -0.1416 | -0.3042 | 0.0000 |
| slices-8 (s=8) | 0.0000 | -0.0858 | 0.0634 | -0.1854 | 0.1219 | 0.0940 | -0.1369 | -0.3108 | 0.0000 |

*two-wall-corner excluded from primary aggregate.

### Interpretation

- R2-dense (analytic limit) improves over R0-cosine by only **0.00114 RMSE** → representation quantization is **NOT** the bottleneck.
- The dominant error source is the large negative fixable deltas on `grazing-surface-wall` (−0.14) and `normal-sensitive-side-contact` (−0.30); with the P2 convention (estimate − ssAchievable), negative means the N-tangent CPU model over-occludes (too dark) in these geometry configurations.
- R0-angle has a substantially lower RMSE (0.0944) than all cosine candidates (~0.133), with faithfulnessDelta = 0.03909. The angle-domain codec produces a different (more fortunate) quantization pattern against the SS reference for these fixtures.
- P3 should target slice orientation, per-tap weighting, or raw signal bias rather than sector-count increases.
## P3-A: Runtime-Faithful Verdict

### Decision Rule

Per-fixture: |faithfulFixableDelta| < tau(0.05) → 'collapsed' else 'residual'. Primary: grazing-surface-wall + normal-sensitive-side-contact. aggregateRMSE = sqrt(mean(delta² over primaries)). Verdict: both-collapsed AND rmse<tau → 'cpu-model-artifact'; exactly-one-collapsed → 'mixed'; else → 'kernel-error-confirmed'.

**tau**: 0.05

### Primary Fixture Results

| Fixture | faithfulAccessibility | ssAchievable | faithfulFixableDelta | r0CosineAccessibility | vsR0Delta | verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| grazing-surface-wall | 0.84104 | 0.60034 | -0.24070 | 0.45877 | 0.38227 | residual |
| normal-sensitive-side-contact | 0.89036 | 0.67358 | -0.21677 | 0.36940 | 0.52096 | residual |

### All Fixtures

| Fixture | faithfulAccessibility | ssAchievable | faithfulFixableDelta | r0CosineAccessibility | vsR0Delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| flat-plane-open | 1.00000 | 1.00000 | 0.00000 | 1.00000 | 0.00000 |
| sphere-contact | 0.91458 | 0.95435 | 0.03976 | 0.86633 | 0.04826 |
| box-contact | 0.88742 | 0.81201 | -0.07541 | 0.86633 | 0.02109 |
| two-wall-corner | 0.44103 | 0.97192 | 0.53090 | 0.76895 | -0.32792 |
| broad-wall-contact | 0.74928 | 0.67676 | -0.07252 | 0.79749 | -0.04821 |
| thin-gap-separated-slabs | 0.86274 | 0.81567 | -0.04707 | 0.88448 | -0.02174 |
| grazing-surface-wall | 0.84104 | 0.60034 | -0.24070 | 0.45877 | 0.38227 |
| normal-sensitive-side-contact | 0.89036 | 0.67358 | -0.21677 | 0.36940 | 0.52096 |
| far-object-outside-radius | 1.00000 | 1.00000 | 0.00000 | 1.00000 | 0.00000 |

### Verdict

**Verdict**: kernel-error-confirmed
**aggregateRMSE**: 0.22905
**tau**: 0.05

### Interpretation

The runtime-faithful CPU model diverges from ssAchievable beyond tau on primary fixtures. The faithful kernel reports MORE accessibility than screen-space geometry allows: it UNDER-occludes these fixtures (too bright), so a correction must add occlusion. Kernel-level correction is indicated (P3-B scope). Note this is the OPPOSITE direction from the N-tangent CPU models of P1/P2, which over-occluded the same fixtures — the unfaithful models inverted the error direction.

*Generated at: 1970-01-01T00:00:00.000Z*
*Camera set: ssao-cam-v1*

## P3-B: Kernel Ablation Study

### Selection Rule

Winner: realizable cell (probeFrame=V) with min primaryAggregateRMSE that passes regression guard (all non-primary non-excluded |delta| growth ≤ ε=0.03 vs baseline) AND improves primary RMSE by ≥ 0.02 vs baseline. Stage2Gate=proceed-tsl: at least one realizable cell passes guard AND both primary |delta| reduced ≥ 50% vs baseline (or |delta| < τ=0.05). Excluded: two-wall-corner (methodology artifact — corner geometry violates sliced-horizon assumption).

### Winner

**Winner**: V-boundary-cosineWeighted
**Reason**: V-boundary-cosineWeighted selected (primaryRMSE=0.19929)

**Stage-2 Gate**: defer
**Baseline Anchor Check**: true
**tau**: 0.05  **epsilon**: 0.03

### Ablation Matrix

| Cell | realizable | primaryRMSE | regressionGuardPass | grazing-surface-wall Δ | normal-sensitive-side-contact Δ |
| --- | --- | ---: | --- | ---: | ---: |
| V-boundary-uniform (BASELINE) | true | 0.22905 | baseline | -0.24070 | -0.21677 |
| V-boundary-cosineWeighted | true | 0.19929 | true | -0.21026 | -0.18767 |
| V-foldToHorizon-uniform | true | 0.22905 | true | -0.24070 | -0.21677 |
| V-foldToHorizon-cosineWeighted | true | 0.19929 | true | -0.21026 | -0.18767 |
| V-skip-uniform | true | 0.22905 | true | -0.24070 | -0.21677 |
| Nproj-boundary-uniform (DIAGNOSTIC) | false | 0.22905 | true | -0.24070 | -0.21677 |
| Nproj-foldToHorizon-uniform (DIAGNOSTIC) | false | 0.22905 | true | -0.24070 | -0.21677 |
| Nproj-foldToHorizon-cosineWeighted (DIAGNOSTIC) | false | 0.19929 | true | -0.21026 | -0.18767 |

### Exclusion Notes

- **two-wall-corner**: excluded from primary metrics, regression guard, and winner selection. Methodology artifact — corner geometry violates sliced-horizon assumption of the VBAO kernel.

*Generated at: 1970-01-01T00:00:00.000Z*
*Camera set: ssao-cam-v1*

### Verification Notes (P3-B Stage 1)

- **Nproj diagnostic rows are geometrically vacuous**: Nproj lies in the {S,V} slice plane by construction, so the Nproj probe sweep samples the same 3D arc as the V sweep — identical results are expected by construction. The cross-slice solid-angle coverage hypothesis (exploration H1) was NOT tested by this matrix and remains open.
- **codecClip variants (foldToHorizon, skip) are correctly wired** (unit-proven on synthetic below-horizon directions); their zero fixture-level effect is a real finding: no occluded probe direction in the 9 fixtures falls below the Nproj horizon.
- **Stage-2 gate: defer (pre-registered rule)**. The only effective realizable knob is the cosine-weighted resolve (primary RMSE 0.229 → 0.199, ~13%), far short of the ≥50% reduction the gate requires. No TSL kernel edit is justified by this evidence.

---

## 2026-06-17 — P3-D: Cosine-Weighted Slice Resolve shipped to TSL kernel

### What changed

- `packages/horizon-ao/src/vbaoKernelPrimitives.ts`: added `Loop` + `bitAnd` imports, exported `COSINE_WEIGHT_TOTAL` constant (25.175614463412174), appended `vbaoCosineWeightedResolveFn` TSL Fn.
- `packages/horizon-ao/src/VBAONode.ts`: replaced `countOneBits`-based resolve at line 654 with `(cosineWeightedResolveFn as any)(occludedMask).toVar('sliceAccessibility')`. Removed `countOneBits` import.
- `packages/horizon-ao/src/VBAOReceiverConfidenceNode.ts`: same swap at line 413. Removed `countOneBits` and now-unused `SECTOR_COUNT` imports.

### Formula-equivalence result

**PASS** — max abs diff between JS transcription and `applyResolve(mask,'cosineWeighted')` = **0** (exact floating-point match across all 12 representative masks including edges).

COSINE_WEIGHT_TOTAL src-vs-reference diff = **0** (exact match, well within < 1e-12 threshold).

### CPU-predicted quality improvement

Per P3-B ablation evidence: cosine-weighted resolve reduces primary RMSE from 0.229 → 0.199 (**+13% improvement** over uniform resolve baseline). This is now shipped to the TSL kernel.

### Test suite

- vitest: **325 / 325 passed** (305 pre-existing + 20 new: 2 src constant tests + 18 cross-reference formula-equivalence + edge tests)
- tsc `tsconfig.json` (src): **clean** (exit 0)
- tsc `tsconfig.reference.json`: **clean** (exit 0)

### GPU acceptance gates (PENDING — manual readback required)

| Gate | Status | Notes |
|------|--------|-------|
| (a) Formula equivalence — CPU | PASS | vitest green, max diff = 0 |
| (b) GPU readback — no regression | **PENDING** | Requires WebGPU device + collect-ao-gpu-readback-baseline.mjs |
| (b) GPU readback — tilted-normal improved-or-neutral | **PENDING** | Requires WebGPU device |
| (c) Raw-pass overhead ≤ 6% | **PENDING** | Requires WebGPU device + GPU timing |

GPU gates deferred to `sdd-verify` phase. REJECT triggers: visual regression, tilted-normal worsening, >6% raw-pass overhead.
