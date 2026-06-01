# SDD Plan: VBAO Temporal AO Gate Remainder

## Current State

The temporal gate is in `reject-promotion` state.

What is allowed:

- Keep `internal` temporal plumbing private for inspection and removal/tuning
  decisions.
- Capture internal-mode smoke evidence.
- Add reprojection, validation, reset, and diagnostics behind internal/demo
  plumbing.

What is still blocked:

- Public `temporal` API.
- Product quality promotion.
- Claims that temporal improves AO quality.
- Using history to hide raw/reference/reconstruction defects.

The first internal prototype owns AO history, resets on resize/camera cuts,
reprojects current depth into previous-frame UV, validates previous depth/normal
guide history, clamps history to the current 3x3 AO neighborhood, and blends at
history weight `0.8`.

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

Goal: make internal temporal history sample the correct previous-frame UV.

### RED

- Add source-contract coverage that `VBAOTemporalAccumulationNode` owns:
  - current inverse view-projection uniform;
  - current view-projection uniform;
  - previous view-projection uniform;
  - previous matrix update after the pass completes.
- Add source-contract coverage that same-pixel history sampling is no longer the
  only path once reprojection is enabled.
- Add a small pure matrix helper test if reprojection math is factored outside
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

- Persist previous depth/normal guide data alongside AO history, or pack the
  minimum guide data needed into a dedicated private history target.
- Validate reprojected history only when:
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

If reopened, the only acceptable first public shape is:

```ts
temporal?: 'off' | 'internal'
```

Do not expose thresholds, clamp expansion, history weight, previous matrix
hooks, or reset knobs without a separate evidence gate.

## Phase 6: Release Hardening

Goal: make the selected decision stable for future contributors.

### If Temporal Is Rejected

- Keep `VBAOTemporalAccumulationNode` private or remove it if it becomes dead
  research code.
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
next valid slice is either:

1. Phase 6 hardening: keep the prototype private, add only smoke coverage, and
   archive the no-promotion rationale.
2. A future tuning fork: define one explicit quality hypothesis, then capture a
   new internal evidence matrix against temporal-off and same-cost non-temporal
   rows.

Do not tune thresholds casually. Temporal bugs are expensive because they can
look good in still screenshots and fail brutally in motion.
