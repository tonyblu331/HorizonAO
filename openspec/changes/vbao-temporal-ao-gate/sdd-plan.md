# SDD Plan: VBAO Temporal AO Gate Remainder

## Current State

The temporal gate is in `reject-promotion` state. The camera-only AO-owned
internal temporal prototype was rejected and removed from `VBAONode`. This plan
is historical for internal prototype evidence; current valid work is host-first
(`off`/`host`) evidence, or a fresh future velocity-backed AO-owned temporal
proposal that consumes host-provided velocity and guide history.

What is allowed:

- Keep historical internal-mode evidence as rejection evidence.
- Capture host-mode and host-TRAA evidence.
- Open a new velocity-backed proposal if AO-owned temporal is revisited.

What is still blocked:

- Public `temporal` API.
- Product quality promotion.
- Claims that temporal improves AO quality.
- Reintroducing camera-only AO-owned internal temporal.
- Using history to hide raw/reference/reconstruction defects.

The first internal prototype owned AO history, reset on resize/camera cuts,
reprojected current depth into previous-frame UV, validated previous depth/normal
guide history, clamped history to the current 3x3 AO neighborhood, and blended
at history weight `0.8`. It is no longer runtime product plumbing.

## Current Gate Result

Phases 3.3, 3.4, 3.7, 4.1 through 4.5, and 6.1 are complete for this gate run.
The upgraded verifier reads internal temporal evidence and reports
`reject-promotion`.

- `internalTemporalEvidence`: `true`
- `internalTemporalPassesPromotion`: `false`
- `internalTemporalAllowed`: `false`
- Rationale: internal temporal has diagnostics and measured pass timings, but no
  material pattern/noise win against temporal-off rows, and blocking failure
  labels remain present.

Remaining plan work is limited to future hardening or an explicit tuning fork;
public API promotion remains blocked.

## External Performance Feedback Contrast

This revision contrasts a pasted architectural review against the current SDD
plan and code state. The review has useful pressure in the right places, but it
also assumes an engine-level G-buffer/history system that this package does not
own.

### Accepted As Already Covered

- Terminology: the pasted review misframes VBAO as Vector-Based AO. Keep the
  repo identity anchored to Visibility Bitmask AO / SSILVB arXiv:2301.11376,
  with GTAO compatibility as an integration shape. Do not rename the active work
  back to GTAO/HBAO.
- Fixed hot loops: product presets already resolve construction-time loop shapes
  in `VBAONode`; only explicit `slices`/`samples` debug overrides use uniform
  loop bounds. No new temporal work should weaken that.
- Temporal stays private: the SDD already blocks public `temporal` API promotion
  until evidence reaches `candidate`.
- Same-cost comparison: the evidence matrix already requires internal temporal
  to beat temporal-off and same-cost non-temporal rows, not merely look smoother.
- Pass cost visibility: temporal, cleanup, resolve, polish, and guide-copy costs
  must be counted as product cost when present.

### Accepted As Future Measurement Gates

- Reprojection ALU: the current temporal prototype reconstructs world/previous
  clip position through current inverse projection, current world, previous
  view, and previous projection uniforms. A CPU-composed
  `previousViewProjection * currentInverseViewProjection` uniform is a valid
  tuning hypothesis, but only after the current rejected prototype has separate
  pass timings and generated shader evidence.
- Guide history cost: `previousDepthRenderTarget` and
  `previousNormalRenderTarget` are valid current prototype costs, not free
  architecture. The collector already maps `VBAO.TemporalAccumulation`,
  `VBAO.TemporalPreviousDepth`, and `VBAO.TemporalPreviousNormal` to separate
  timing rows, and the temporal verifier already requires them for complete
  internal evidence. The next hardening slice should audit those existing rows
  and add VRAM/lifetime inventory before any tuning fork.
- Neighborhood clamp cost: the current 3x3 clamp is intentionally conservative.
  Manual 9-tap unrolling or a 4-tap cross clamp is allowed only as a measured
  tuning hypothesis after the rejection reasons are understood.
- Log-depth conversion cost: repeated logarithmic-depth conversion in temporal,
  cleanup, resolve, and polish taps is a legitimate shader-cost concern. Treat
  pre-linearized depth or center-only conversion as a future performance
  experiment with visual edge-regression checks.
- Bilateral weight duplication: `VBAOHalfResCleanupNode`, `VBAOResolveNode`, and
  `VBAOFullResPolishNode` repeat similar depth/normal rejection math. A helper
  extraction is acceptable only if generated shader inspection stays clean and
  behavior remains source-contract covered.
- Pass consolidation: merging resolve/polish or deleting half-res cleanup is a
  performance candidate, not an immediate refactor. It must beat the existing
  path on pass timings and failure labels.
- Polish stability mask: making full-res polish conditional on temporal
  stability is only meaningful if internal temporal first becomes a `candidate`.
  Until then, full-res polish remains a temporal-free reconstruction stage, not
  a disocclusion-only temporal fallback.

### Rejected Or Deferred Assumptions

- Do not allocate private guide history again. `@horizonao/core` is a
  package-level node, not a full renderer; any future AO-owned temporal path must
  accept host-provided velocity and guide history through an explicit contract.
- Do not reopen camera-only internal temporal. Motion vectors are required for
  any future AO-owned temporal path because dynamic and animated geometry is part
  of the correctness target.
- Do not merge JBU resolve and full-res polish in this SDD by default. The
  temporal gate is deciding whether AO-owned history deserves to exist; pass
  fusion belongs to a separate performance SDD after correctness/evidence gates.
- Do not remove half-res cleanup from the existing low-resolution path just
  because temporal exists. Temporal must not hide raw or reconstruction defects.
- Do not make dynamic history weight the first fix. The current `0.8` weight is
  intentionally held steady while reprojection, validation, and failure labels
  are audited; tuning the blend before proving the topology is cargo-culting.

### Revised Gate Priority

The next valid slice is no longer generic "tuning". It is a cost-and-topology
audit:

1. Measure internal temporal as separate AO accumulation, guide-depth, and
   guide-normal passes.
2. Compare `off`, `internal`, and same-cost non-temporal rows with failure
   labels unchanged.
3. If temporal remains `reject-promotion`, archive the rationale and keep/remove
   private code explicitly.
4. Only if temporal shows a real quality win, test one topology hypothesis at a
   time: CPU-composed reprojection matrix, manual clamp unroll, 4-tap clamp,
   packed guide target, guide-history reuse hook, pre-linearized depth, temporal
   stability mask, or resolve/polish fusion.

The principle is simple: performance feedback becomes an evidence gate, not a
license to reshape the graph blind.

## Research-Informed Optimization Plan

Detailed peer-review artifact:
`openspec/changes/vbao-temporal-ao-gate/optimization-peer-review-plan.md`.

This plan folds the external feedback into the current VBAO gates using AO
production lessons from XeGTAO, CACAO, GTAO, and SAO:

- production AO implementations keep the hot path to a small number of explicit
  passes;
- depth hierarchy or depth prefiltering is the common bandwidth lever;
- temporal accumulation is useful only when the host integration can validate
  history cheaply enough;
- denoise must preserve depth/normal discontinuities and prove it beats spending
  the same budget on more current-frame samples.

Research traceability:

- XeGTAO: https://github.com/GameTechDev/XeGTAO - explicit depth prefilter,
  main AO, and denoise passes; host TAA is leveraged when available instead of
  unconditionally owning temporal history.
- SAO: https://diglib.eg.org/items/8c96d57d-3df3-43da-8663-07b3ecd60dde -
  architecture-aware gains from depth prefiltering, bandwidth reduction, and
  efficient position/normal reconstruction.
- CACAO: https://gpuopen.com/fidelityfx-cacao/ - optimized quality/performance
  tiers for ambient occlusion across hardware.
- GTAO report:
  https://research.activision.com/publications/2020-03/practical-real-time-strategies-for-accurate-indirect-occlusion -
  radiometrically grounded AO baseline; useful for comparison without replacing
  the visibility-bitmask core.

### Phase O1: Pass Cost Truth

Goal: make every candidate optimization accountable before changing topology.

RED:

- Extend collector/report coverage that already distinguishes:
  - raw VBAO;
  - half-resolution cleanup;
  - JBU resolve;
  - internal temporal AO accumulation;
  - temporal depth-guide copy;
  - temporal normal-guide copy;
  - full-resolution polish;
  - final total.
- Keep verifier rejection when temporal evidence lacks measured guide-copy
  timing, and add fixture coverage if this contract is not already frozen.

GREEN:

- Audit the current pass-timing instrumentation without changing visual output.
- Keep `skipped`, `unmeasured`, and measured rows distinct.
- Record VRAM target inventory per topology: target name, resolution scale,
  format, and lifetime.

Acceptance:

- A row cannot claim temporal or pass-topology benefit without pass-level cost.
- Guide history cost is visible as its own tax.

### Phase O2: Temporal Topology Decision

Goal: decide whether private AO-owned temporal survives.

Candidates:

- current separate depth/normal guide history;
- packed private guide target;
- host-provided previous guide hook, still private/internal;
- remove internal temporal and keep only host temporal noise mode.

Acceptance:

- Internal temporal survives only if it shows a quality win over temporal-off and
  same-cost non-temporal rows after guide cost is included.
- A host-provided guide hook must be optional; `@horizonao/core` must still work
  without renderer-specific previous G-buffer ownership.

Stop:

- If internal temporal only matches spatial output while adding guide-copy cost,
  reject it and archive/remove the prototype.

### Phase O3: Spatial Graph Reduction

Goal: reduce full-screen round trips without hiding raw-signal defects.

Candidates, one at a time:

- remove half-resolution cleanup for low-res output;
- fuse JBU resolve plus 8-tap polish into one resolve-polish pass;
- skip full-res polish when low-res cleanup already consumes the softness
  budget;
- extract shared bilateral weighting only if shader generation remains clean.

Acceptance:

- Candidate must improve total timing or target count.
- Candidate must not regress `noise`, `edge-bleed`, `thin-gap`, `mud`, `halo`, or
  `scale-mismatch`.

### Phase O4: Depth Hierarchy / Prefilter Evidence

Goal: test the optimization family that SAO and XeGTAO both rely on: sampling a
depth representation that is cheaper and more stable at distance.

Scope:

- internal demo/evidence path first;
- no public option until it wins;
- start with linear-depth MIP or min/max/weighted depth hierarchy compatible with
  WebGPU/TSL constraints.

Acceptance:

- Larger-radius rows must get cheaper or cleaner without losing thin occluders.
- If depth hierarchy improves scale stability but damages contact detail, keep it
  as an experimental path only.

### Phase O5: Current-Frame Denoise Before Public Temporal

Goal: prefer robust current-frame quality before public history.

Candidates:

- 4-tap/cross clamp as a cheaper temporal neighborhood bound;
- confidence/support metadata from the bitmask kernel;
- confidence-aware spatial polish;
- noise atlas comparison under frozen cameras.

Acceptance:

- Improve one named failure label and regress none.
- Beat same-cost alternatives, especially more slices/samples or the existing
  8-tap polish.

### Phase O6: Public API Decision

Goal: expose only what evidence justifies.

Allowed outcomes:

- no temporal API, host temporal noise remains private/demo-only;
- narrow `temporal?: "off" | "internal"` only after candidate evidence;
- separate future SDD for velocity or host guide-history integration.

Forbidden:

- AO-owned temporal without a velocity requirement;
- public threshold knobs;
- renderer-specific previous G-buffer assumptions in the core contract.

## SDD Rules

Every remaining phase follows this loop:

1. RED: add or update source-contract, unit, or benchmark-gate tests that fail
   for the missing behavior.
2. GREEN: implement the smallest private/internal change that satisfies the
   test.
3. VERIFY: run targeted tests, typechecks, and the smallest WebGPU smoke needed
   for that layer.
4. EVIDENCE: write artifacts only when the capture answers a named gate
   question.
5. STOP: do not advance to promotion until the previous layer has clean evidence.

Production build commands remain forbidden unless explicitly requested.

## Phase 3.3: Reprojection Coordinates

Goal: archived. The camera-only internal temporal prototype was rejected and
removed. Future reprojection work belongs in a fresh velocity-backed proposal.

### RED

- Keep source-contract coverage proving `VBAOTemporalAccumulationNode` is absent
  from runtime source and public exports.
- Add future source-contract coverage only after a velocity-backed proposal
  exists.
  TSL. If it stays inline TSL, source-contract coverage is acceptable for the
  first pass.

### GREEN

- Store previous camera view-projection matrix on the temporal node.
- Compute current clip/world reconstruction from current UV/depth.
- Project reconstructed world position with previous view-projection.
- Convert previous clip to previous UV.
- Sample history at previous UV only when it is inside `[0, 1]`.
- Keep reset behavior on first frame, resize, and camera cut.

### VERIFY

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
```

### Acceptance

- Internal temporal no longer relies only on same-pixel history.
- Previous UV viewport rejection exists.
- Public API remains unchanged.

### Stop Conditions

- If matrix uniforms cannot be updated safely from the render loop, stop and
  isolate camera-matrix ownership before continuing.
- If reprojection creates WebGPU validation errors, do not tune history weights;
  fix the reprojection contract first.

## Phase 3.4: History Validation

Goal: reject stale history with current and previous-frame continuity checks.

### RED

- Add source-contract coverage for:
  - previous depth history target or previous packed guide target;
  - previous normal history target or previous packed guide target;
  - viewport rejection;
  - depth continuity threshold;
  - normal dot threshold;
  - invalid-history fallback to current AO.
- Add pass-timing expectations for any new guide-copy pass or packed history
  update if it emits timestamps.

### GREEN

- Do not persist previous depth/normal guide data in private render targets.
- Future validation must use host-provided velocity and guide history, and only
  then validate reprojected history when:
  - previous UV is inside viewport;
  - previous depth agrees with current projected depth within conservative
    tolerance;
  - previous normal agrees with current normal above conservative dot threshold;
  - reset flag is false.
- Keep current 3x3 AO clamp before blending.
- Keep history weight at `0.8`; do not tune weight while validation is still
  moving.

### VERIFY

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
```

### Acceptance

- History validity depends on reprojection, depth continuity, normal continuity,
  viewport, and reset state.
- Invalid history returns current AO, not clamped stale history.
- Public API remains unchanged.

### Stop Conditions

- If guide history adds more cost than the temporal pass can justify, document
  the cost and stop before evidence promotion.
- If validation rejects nearly all history, do not loosen thresholds blindly;
  capture the rejection reason first.

## Phase 3.7: Temporal Diagnostics

Goal: make the internal pass debuggable before broad evidence capture.

### RED

- Add benchmark/report fields for:
  - `temporalMode`;
  - temporal pass timing;
  - history validity/rejection label if available;
  - reset reason if available.
- Add report vocabulary for temporal-specific labels:
  - `ghosting`;
  - `disocclusion`;
  - `history-smear`;
  - `history-reject`.

### GREEN

- Emit temporal pass timing as part of total product cost.
- Add failure labels without changing promotion thresholds yet.
- Optionally add debug capture rows only if they can be produced without
  polluting product output.

### VERIFY

```sh
node --check apps/demo/scripts/collect-ao-benchmark.mjs
pnpm --filter @horizonao/demo typecheck
```

### Acceptance

- Evidence can explain WHY temporal fails, not merely that it failed.
- Timing includes every emitted temporal/guide pass.

## Phase 4.1: Internal Evidence Matrix

Goal: capture enough evidence to judge internal temporal against off, host, TRAA,
and same-cost non-temporal alternatives.

### Matrix

Capture Museum at 1280x720 and 1920x1080:

- temporal `off`, product preset, full-res;
- temporal `host`, product preset, full-res;
- temporal `host` + host `TRAA`, product preset, full-res;
- temporal `internal`, product preset, full-res;
- temporal `off`, `spatial-ultra`, full-res;
- optional lower-cost internal candidate only after full-cost internal renders:
  lower raw samples or half-res raw resolved before temporal.

Views:

- `ao`;
- `beauty`.

Outputs:

- product;
- raw-debug only where it answers whether history is hiding unsupported
  current-frame signal.

### Commands

Use dedicated output paths for each mode. Do not overwrite existing gate
artifacts until the run is accepted.

Example internal capture:

```sh
$env:AO_BENCHMARK_SCENES='museum'; $env:AO_BENCHMARK_WIDTH='1280'; $env:AO_BENCHMARK_HEIGHT='720'; $env:AO_BENCHMARK_MODES='vbao'; $env:AO_BENCHMARK_VIEWS='beauty,ao'; $env:AO_BENCHMARK_DENOISE_STATES='true'; $env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'; $env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='internal'; $env:AO_BENCHMARK_PASS_TIMING_SAMPLES='3'; $env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/vbao-temporal-internal-latest.json'; $env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/vbao-temporal-internal-summary.md'; $env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-vbao-temporal-internal'; $env:AO_BENCHMARK_PORT='5198'; pnpm --filter @horizonao/demo benchmark:ao
```

### Acceptance

- Every product row has screenshot, quality metrics, pass timings, and failure
  labels.
- Internal temporal must not regress stripe, edge bleed, thin-gap, ghosting, or
  disocclusion against temporal-off beyond documented tolerance.
- Internal temporal must be compared against same-cost non-temporal rows.
- Any quality win must survive both AO-only and beauty views.

### Stop Conditions

- If internal temporal only matches current output while adding pass cost, reject
  it as a product direction.
- If it improves pattern/noise but adds ghosting, disocclusion, stripe, mud,
  halo, edge bleed, or thin-gap loss, reject promotion and keep it private.

## Phase 4.2: Gate Verifier Upgrade

Goal: make the verifier decide between `incomplete`, `reject-promotion`,
`candidate`, and later explicit API promotion.

### RED

- Add verifier fixture JSON or source-contract coverage for:
  - internal evidence required for promotion;
  - same-cost alternative evidence required;
  - temporal pass timing included;
  - stripe/edge/thin-gap regressions block promotion;
  - ghosting/disocclusion labels block promotion.

### GREEN

- Extend `verify-vbao-temporal-gate.mjs` to read internal evidence artifacts.
- Return `incomplete` when internal evidence is missing or incomplete.
- Produce `candidate` only when internal evidence is complete and materially
  better without regression.
- Reserve public/internal API promotion for a later explicit decision, not for a
  single smoke run.

### VERIFY

```sh
pnpm --filter @horizonao/demo verify:vbao-temporal
VBAO_TEMPORAL_REQUIRE_CANDIDATE=1 pnpm --filter @horizonao/demo verify:vbao-temporal
```

### Acceptance

- The verifier cannot pass with missing internal screenshots, missing temporal
  pass timings, or same-cost comparison gaps.
- The hard candidate form fails unless evidence genuinely clears the gate.

## Phase 4.3: Failure Review

Goal: classify failures before tuning.

Review each failed internal row for:

- `noise`: visible stochastic grain remains;
- `stripe`: row/column coherence worsens;
- `ghosting`: stale AO trails motion/camera changes;
- `disocclusion`: newly visible regions retain stale occlusion;
- `mud`: history over-blends local contrast;
- `halo`: edge-adjacent bright/dark bands;
- `edge-bleed`: AO leaks across normal/depth discontinuity;
- `thin-gap`: narrow openings are lost;
- `scale-mismatch`: AO appears detached from scene scale.

Acceptance:

- Every failed row has named failure labels.
- Tuning tasks are derived from named labels, not from vibes.

## Phase 4.4: Tuning Fork

Goal: decide whether internal temporal deserves tuning.

Only tune if Phase 4 evidence shows at least one material benefit and no severe
artifact.

Allowed tuning knobs, still private:

- history weight within `0.75..0.85`;
- clamp expansion;
- depth threshold;
- normal dot threshold;
- reset sensitivity.

Forbidden tuning:

- public options;
- default temporal mode;
- weakening raw/reference/evidence gates;
- raising stripe tolerance to pass a bad row.

Decision outcomes:

- `reject-internal`: internal history is not worth the cost/artifacts.
- `keep-private`: useful for experiments but not product.
- `candidate`: evidence justifies a promotion review.

## Phase 5: Public API Revisit

Goal: decide whether to expose temporal mode.

The previous Phase 5 decision remains `no public API`. Reopen it only after the
verifier reaches `candidate`.

Required before reopening:

- green internal evidence matrix;
- hard candidate verifier passes;
- no unresolved ghosting/disocclusion failures;
- pass cost is justified against same-cost non-temporal rows;
- docs can explain when temporal helps and when it does not.

If host temporal is reopened for public API, the only acceptable first public
shape is:

```ts
temporal?: 'off' | 'host'
```

AO-owned history is a separate future API and requires a velocity-backed proposal
before thresholds, clamp expansion, history weight, previous matrix hooks, or
reset knobs are discussed.

## Phase 6: Release Hardening

Goal: make the selected decision stable for future contributors.

### If Temporal Is Rejected

- Keep `VBAOTemporalAccumulationNode` removed from runtime source.
- Archive evidence under the change directory.
- Add an ADR or update `ADR-013` explaining why temporal stayed private/rejected.
- Keep the verifier result as `reject-promotion`.

### If Temporal Becomes Candidate

- Add route smoke coverage for internal mode.
- Add Playwright screenshot smoke for AO and beauty rows.
- Add docs warning that default remains temporal-free.
- Update README only after API is public. README is not a lab notebook.

### Verification

```sh
pnpm --filter @horizonao/core test
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
pnpm --filter @horizonao/demo verify:vbao-temporal
git diff --check
```

Production build remains out of scope unless explicitly requested.

## Decision Ledger

| Decision | Current Answer | Reason |
| --- | --- | --- |
| Default temporal AO | No | Default product remains temporal-free. |
| Public API | No | Current evidence is `reject-promotion`, not candidate. |
| Host temporal promotion | No | Host/host TRAA regressed stripe. |
| Internal prototype | Private only | Evidence is evaluated but does not justify promotion. |
| Same-pixel history | Replaced | Internal mode now samples history through previous-frame UV. |
| Reprojection | Implemented | Current depth is reprojected into previous-frame UV. |
| Previous depth/normal validation | Implemented | Previous guide history is sampled before blending. |
| Temporal pass cost | Must be counted | Total product timing must include temporal/guide passes. |

## Next Immediate Slice

No public API or quality promotion work is valid from the current evidence. The
next valid slice is Phase 6 hardening plus a narrow topology/cost audit:

- keep the prototype private and archive the no-promotion rationale;
- audit the existing split internal temporal timing for AO accumulation,
  guide-depth copy, and guide-normal copy, then add VRAM/lifetime inventory;
- preserve the existing failure labels and same-cost non-temporal comparison;
- decide whether guide history stays, becomes packed/reused through a private
  host hook, or is removed with the prototype.

Only after that audit may a tuning fork define one explicit hypothesis, such as
4-tap clamp instead of 3x3, packed guide history, or resolve/polish fusion.

Do not tune thresholds casually. Temporal bugs are expensive because they can
look good in still screenshots and fail brutally in motion.
