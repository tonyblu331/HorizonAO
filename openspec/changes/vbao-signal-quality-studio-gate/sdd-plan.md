# SDD Plan: VBAO Signal Quality Research Alignment

## Current State

The quality critique is useful, but it mixed source-truth, research claims, and
studio practice. This plan rewrites it as an evidence-backed alignment gate.

Verified local contracts:

- `VBAONode` uses a fixed 32-sector `u32` visibility mask per slice.
- Defaults are 3 slices and 8 samples; `quality` and `ultra` can use 4 slices.
- The raw kernel uses a 64x64 phase tile over a 64-phase atlas.
- Sub-sector intervals are stochastic.
- Masks are cosine-measure CDF-remapped, reduced by popcount, then slices are
  weighted by projected-normal length.
- Effective thickness is clamped by `min(thickness, radius * 0.3)` and then by
  `min(baseThickness, 0.85 * sampleDistance)`.
- `normalNode` is required. Depth-derived normal fallback is intentionally not
  part of this package.

Therefore, "missing cosine weighting" is not accepted as a bug. The valid
questions are signal quality, contact/thin-gap preservation, sampling stability,
and production pipeline discipline.

## Research Contrast

| Reference | What It Optimizes | Relevant Practice | Contrast With This Repo |
| --- | --- | --- | --- |
| SSILVB / VBAO paper, arXiv 2301.11376 | Thin-surface light passing through a visibility bitmask instead of only two horizon angles | Preserve bitmask semantics and constant-thickness visibility intervals | Repo is aligned on bitmask representation, but current evidence still shows noise/thinness risk. |
| Activision GTAO technical report | Ground-truth-shaped horizon AO under real-time constraints | View-vector formulation, projected-normal weighting, binary visibility, reference-matching mindset | Repo borrows projected-normal/slice discipline, but VBAO should not collapse back into a two-horizon GTAO estimator. |
| Intel XeGTAO | Production AO pipeline tuned against ray-traced reference | Depth prefilter/MIP chain, main AO plus edge metadata, spatial denoise, auto-tuning against reference | Repo lacks XeGTAO-grade depth hierarchy, edge metadata, and automatic reference tuning. |
| AMD FidelityFX CACAO | Robust compute AO with quality tiers | De-interleaved depth/normal prepare stage, depth MIPs, edge values, adaptive sampling, edge-aware blur | Repo has internal resolve/polish, but not CACAO-style de-interleaving, edge channels, or adaptive quality. |
| Three `GTAONode` | Local WebGPU/TSL integration shape | Depth/normal/camera inputs, full-res default, optional temporal filtering with TAA caveats | Repo matches the integration shape but intentionally keeps temporal/public denoise out of `VBAONodeOptions`. |
| N8AO / `n8ao-webgpu` | Artist-friendly, smooth AO product | Radius/falloff/intensity controls, denoise samples/radius, half-res plus depth-aware upscale, display modes | Repo can use N8AO as a product-quality baseline, not as ground truth or a math target. |

Sources:

- https://arxiv.org/abs/2301.11376
- https://research.activision.com/publications/2020-03/practical-real-time-strategies-for-accurate-indirect-occlusion
- https://github.com/GameTechDev/XeGTAO
- https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- https://threejs.org/docs/pages/GTAONode.html
- https://github.com/N8python/n8ao

## Alignment Decision

VBAO should align with each reference at the correct layer:

- Align with SSILVB on the bitmask representation and thin-visibility goal.
- Align with GTAO on projected-normal integration discipline and reference
  comparison, not on replacing bitmasks with two horizon angles.
- Align with XeGTAO/CACAO on pipeline proof: depth preparation, edge metadata,
  denoise separation, timing, and reference tuning.
- Align with Three `GTAONode` on API ergonomics and WebGPU/TSL integration.
- Align with N8AO on product-readiness expectations: smooth output, artist scale
  controls, and clear debug views.

The package should not copy any one system blindly. The architecture move is:
preserve VBAO math, adopt production AO evidence discipline.

## Chosen Direction

Decision: keep `VBAONode` as a 32-sector SSILVB/VBAO horizon-bitmask product
and harden the signal before adding public knobs or swapping formulas.

This rejects the tempting shortcuts:

- do not pivot the kernel into GTAO's two-horizon estimator;
- do not chase N8AO-style smoothness by exposing denoise controls;
- do not move to 64 sectors before proving 32-sector support/confidence is the
  actual blocker;
- do not use temporal accumulation as the first quality fix;
- do not add a public atlas, sector-count, thickness-mode, or edge-metadata API.

The next implementation direction is:

1. Freeze a claim ledger and reference alignment gate.
2. Add raw-signal attribution for sector support/confidence and near-contact
   thickness collapse.
3. Decide the thickness/contact candidate against thin-gap and broad-contact
   fixtures.
4. Tune sampling/noise only after raw defects are attributed.
5. Evaluate WebGPU/Three compute candidates only where the data layout or
   observability gate justifies it.
6. Only then promote product polish.

Why this direction:

- SSILVB is the identity of the project: visibility bitmasks preserve multiple
  blocked/open regions that a two-horizon method loses.
- GTAO/XeGTAO/CACAO prove that production AO succeeds through reference tuning,
  edge metadata, pass timing, and denoise separation, not through one magic
  formula change.
- N8AO proves the product bar: users will judge smoothness, contact strength,
  haloing, and scale. It does not define mathematical truth.
- The current repo evidence says raw VBAO still has noise/thinness risk, so
  polishing first would hide the failure instead of fixing it.

Immediate success criteria:

- A failing gate must identify whether the bad pixel is unsupported stochastic
  sector evidence, thickness/contact collapse, edge bleed, or sampling pattern.
- Any promoted candidate must improve a named label without regressing
  `thin-gap`, `edge-bleed`, `mud`, `halo`, or `scale-mismatch`.
- Public API stays compact until internal evidence proves a user-facing control
  is necessary.

## Compute / WebGPU / Three.js Shape

Decision: use compute where it gives VBAO a better proof or product data shape,
but keep the current Three.js render-target path as the control until a compute
candidate wins.

Three.js `0.184.0` exposes compute APIs such as `ComputeNode`,
`renderer.compute()` / `renderer.computeAsync()`, storage textures, texture
stores, workgroup helpers, and the WebGPU backend. The repo also has a direct
WebGPU compute readback harness in
`apps/demo/scripts/collect-ao-gpu-readback-baseline.mjs`. That makes compute a
viable candidate lane, but local Three TSL render-graph integration remains
unproven until a private candidate passes Phase 6.

Compute lanes:

- WebGPU oracle lane: direct WGSL compute readback for fixed fixtures. This is
  for estimator truth, GPU/CPU drift, and bitmask precision. It is not the
  product renderer.
- Three TSL compute lane: internal `ComputeNode` candidates that attempt to
  write storage textures or buffers and be consumed by the existing
  Three/WebGPU render graph. This is a product-candidate route only after local
  proof.
- Current render-target lane: existing `NodeMaterial`/`QuadMesh` passes remain
  the control path for screenshots, pass timing, and public `getTextureNode()`
  behavior.

Best compute candidates, in order:

1. Depth prepare / hierarchy / representative-depth textures, because XeGTAO and
   CACAO both show that depth preparation is a production AO lever.
2. Sector support/confidence metadata, because raw VBAO needs to distinguish a
   sector hit once by stochastic coverage from a sector supported repeatedly.
3. Edge metadata for resolve/polish, because CACAO/XeGTAO-style filters depend
   on explicit edge information.
4. Raw VBAO kernel compute port, only after metadata/depth candidates prove that
   compute integration is validation-clean and timing-visible.

Compute acceptance:

- It must be evaluated as a VBAO candidate, not as a separate algorithm.
- It must preserve SSILVB/VBAO bitmask semantics and the compact public API.
- It must run validation-clean on a true WebGPU backend, not only WebGL fallback.
- It must emit pass-level timing for every compute dispatch and render pass.
- It must provide screenshots, AO-only rows, product rows, and readback or
  reference rows where applicable.
- It must beat the current render-target path on a named gate: quality label,
  reference error, pass count, target count, or p95 timing.
- If it only looks architecturally nicer but does not win evidence, reject it.

## Phase 1: Research Claim Ledger

Create a concise ledger that maps each claim to one of:

- source truth;
- supported research pressure;
- local evidence gap;
- rejected or stale claim.

Acceptance:

- The ledger corrects the slice-count and cosine-reduction claims.
- SSILVB, GTAO, XeGTAO, CACAO, Three GTAONode, and N8AO each have one local
  implication and one non-goal.
- No runtime code changes land in this phase.

## Phase 2: Reference Alignment Gate

Prove the current signal against deterministic fixtures before changing it.

Required contrasts:

- SSILVB-style paper/reference lane vs production VBAO lane;
- ray-cast AO reference vs VBAO/GTAO/N8AO product rows;
- raw VBAO vs product VBAO so polish cannot hide signal defects.

Acceptance:

- Missing observations remain `missing-reference-observation`.
- Thin-gap, contact corner, broad wall, grazing surface, and normal-sensitive
  cases are covered.
- No "closer to path tracing" claim without ray-cast/reference rows.

## Phase 3: Raw Signal Gate

Isolate the actual sources of noise and thinness.

Targets:

- 32-sector boundary instability;
- stochastic sub-sector variance;
- 64px phase-tile residuals in `patternNoiseScore`;
- near-contact collapse from `0.85 * sampleDistance`;
- under-occlusion from `radius * 0.3` thickness cap.

Acceptance:

- Each target has a scalar, GPU-readback, or screenshot metric.
- AO-only raw output is captured separately from product AO.
- Denoise, temporal, and polish cannot pass this gate.

## Phase 4: Thickness Contact Gate

Use SSILVB and XeGTAO pressure together: preserve thin surfaces while tuning
thickness against reference evidence.

Candidates, one at a time:

- keep current clamp and document why;
- adaptive thickness from the existing reference-first path;
- minimum effective-thickness floor as an internal candidate;
- scene-scale preset only if reference rows prove one scalar is insufficient.

Acceptance:

- Contact darkening cannot close valid thin gaps.
- Thin-gap preservation cannot erase broad-wall contact.
- Public `VBAONodeOptions` remain unchanged unless a later API SDD proves need.

## Phase 5: Sampling And Noise Gate

Use XeGTAO/CACAO/N8AO as pressure for stable product noise, without abandoning
VBAO bitmasks.

Candidates:

- current `phase-atlas-stable-hash`;
- larger or differently arranged phase atlas;
- IGN/STBN/Hilbert-R2-style candidate;
- same-cost increase in slices/samples;
- host temporal phase animation only under the existing temporal gate.

Acceptance:

- Compare raw and product rows under pinned cameras.
- Include `patternNoiseScore`, stripe metrics, thin-gap proxy, failure labels,
  screenshots, and GPU timings.
- A candidate wins only if it beats same-cost alternatives without adding
  `mud`, `halo`, `edge-bleed`, `thin-gap`, or `scale-mismatch`.

## Phase 6: Compute Candidate Gate

Goal: decide whether compute becomes part of the internal VBAO product path.

RED:

- Add a fixture or screenshot gate that the current render-target path fails or
  cannot answer cleanly.
- Add source-contract tests that identify the candidate as private/internal.
- Add benchmark schema fields for compute dispatch timing, storage target
  inventory, output resolution, and WebGPU backend status.

GREEN:

- Implement the smallest Three TSL compute candidate, preferably depth prepare
  or sector-confidence metadata before a full raw-kernel port.
- Feed the compute output back into the existing product graph as a texture-node
  input, not as a new public output.
- Keep the current render-target path available as the control.

VERIFY:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/demo benchmark:ao:gpu-readback
pnpm --filter @horizonao/demo benchmark:ao
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check
```

Acceptance:

- Generated WGSL/TSL output is inspectable and does not hide the bitmask math.
- WebGPU validation is clean in the benchmark browser.
- Storage texture/buffer formats and lifetimes are recorded.
- The candidate has a named win over the control path.
- No public `VBAONodeOptions` field is added.

## Phase 7: Product Pipeline Gate

Adopt production AO pipeline discipline from XeGTAO/CACAO, using compute only
where the candidate benefits from storage textures, workgroup-local
organization, or explicit prepare metadata.

Candidates:

- sector support/confidence metadata;
- edge metadata for resolve/polish;
- confidence-aware spatial polish;
- depth hierarchy or prefiltered depth candidate;
- Three TSL compute prepare pass for depth/metadata storage textures, only after
  Phase 6 proves local integration;
- direct WebGPU compute oracle rows for estimator readback;
- pass-cost reduction only after quality gates are stable.

Acceptance:

- Product AO must improve named labels and pass timings.
- Edge-aware filtering must preserve normal/depth discontinuities.
- Any depth hierarchy must prove it does not damage thin occluders.
- Compute candidates must preserve render-graph consumption by Three.js
  `RenderPipeline` or an equivalent texture-node path.
- Compute dispatch cost must be counted beside raw/cleanup/resolve/polish cost.
- `getTextureNode()` remains final product AO; `getRawTextureNode()` remains
  debug/readback only.

## Phase 8: Evidence And Studio Decision

Translate evidence into how different production contexts would treat VBAO.

Decisions:

- Offline / baked / path-traced studio: use path-traced or ray-cast reference as
  truth; VBAO is preview/product approximation only.
- AAA real-time studio: accept only if reference deltas, artifact labels, GPU
  timings, and motion/temporal behavior are bounded.
- Web/WebGPU library: keep the API compact, avoid renderer-owned history, and
  expose only stable integration knobs.
- Demo/product benchmark: compare against GTAO and N8AO as baselines, not as
  ground truth.

Acceptance:

- README/marketing language cannot claim path-tracing closeness until the
  reference gate proves it.
- Evidence rows must include screenshots, timing, labels, and source resolution.
- Public knobs are added only after internal candidates win.

## Guardrails

- No production build unless explicitly requested.
- No public denoise, temporal, velocity, sector-count, atlas, or edge-metadata
  API from this SDD.
- No formula change without a failing fixture and spec amendment.
- No screenshot-only acceptance for math/kernel changes.
- No N8AO/GTAO-as-ground-truth language.
- No hidden quality promotion through product polish.

## Verification

Planning-only verification:

```sh
git diff --check -- openspec/changes/vbao-signal-quality-studio-gate
pwsh -NoProfile -Command '$bad = Get-ChildItem -File "openspec/changes/vbao-signal-quality-studio-gate" | Select-String -Pattern "\s+$"; if ($bad) { $bad; exit 1 }'
```

Later implementation phases choose the smallest relevant gate:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoGtVbaoMath.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts
pnpm --filter @horizonao/core typecheck
git diff --check
```
