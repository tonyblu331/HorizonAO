# Tasks: VBAO Temporal AO Gate

## Phase 0: Freeze The Baseline

- [x] 0.1 Confirm current non-temporal `/lab` and `/museum` evidence exists for
  raw/product AO-only and beauty output.
- [x] 0.2 Confirm pass-level GPU timing rows exist for raw, cleanup, resolve,
  polish, and total product output.
- [x] 0.3 Confirm reference AO gates are green before temporal screenshots are
  used for quality claims.

## Phase 1: Spec Boundary

- [x] 1.1 Update the `vbao-node` spec delta to allow future opt-in temporal modes
  while keeping default output temporal-free.
- [x] 1.2 Add source-contract tests proving default `VBAONode` construction does
  not allocate history, reprojection, or temporal passes.
- [x] 1.3 Add evidence-contract language requiring temporal comparisons against
  same-cost non-temporal alternatives.

## Phase 2: Host Temporal Sampling

- [x] 2.1 Add an internal/demo-only host temporal mode that animates the sampling
  phase without allocating AO history.
- [x] 2.2 Add tests proving `temporal = off` remains deterministic and host mode
  advances phase intentionally.
- [x] 2.3 Capture host-TAA evidence and classify whether animated sampling
  justifies promotion or only unblocks private internal prototyping.

## Phase 3: Internal Temporal Prototype

- [x] 3.1 Add a private temporal accumulation node after full-resolution resolve.
- [x] 3.2 Add AO history allocation, resize reset, and camera-cut reset handling.
- [x] 3.3 Implement reprojection from current depth using current inverse
  view-projection and previous view-projection.
- [x] 3.4 Implement depth/normal validation and viewport rejection.
- [x] 3.5 Implement 3x3 neighborhood clamp before history blend.
- [x] 3.6 Start with conservative history weight between `0.75` and `0.85`.
- [x] 3.7 Add temporal diagnostics for rejection/reset reasons and timing
  accounting.

## Phase 4: Temporal Evidence

- [x] 4.1 Capture AO-only and beauty screenshots for temporal off, host, and
  internal modes.
- [x] 4.2 Collect GPU timings for temporal off, host, internal, and same-cost
  non-temporal alternatives.
- [x] 4.3 Label temporal failures, including ghosting, disocclusion, mud, halo,
  edge bleed, and thin-gap loss.
- [x] 4.4 Reject internal temporal if it only improves noise by hiding unsupported
  current-frame signal.
- [x] 4.5 Upgrade `verify:vbao-temporal` to evaluate internal temporal evidence
  before any candidate/promotion verdict.

## Phase 5: Public API Decision

- [x] 5.1 Decide whether evidence justifies a public `temporal` option.
- [x] 5.2 If public API is justified, add only
  `temporal?: "off" | "host" | "internal"`.
- [x] 5.3 Keep reprojection thresholds, clamp expansion, and history weight
  internal unless a later evidence gate proves users need them.

## Phase 6: Release Hardening Or Rejection Archive

- [x] 6.1 If internal temporal fails evidence, keep it private or remove it and
  archive the rejection rationale.
- [ ] 6.2 If internal temporal becomes a candidate, add route/evidence smoke
  coverage before reopening public API.
- [ ] 6.3 Update ADR/release docs only after the verifier result and evidence
  matrix justify the decision.

## Gate Notes

- 0.1 is satisfied by the Museum temporal-off smoke rows and the Lab
  non-temporal baseline rows captured in
  `artifacts/benchmarks/vbao-lab-baseline-latest.json`.
- 2.3 is complete as a classification gate. Host temporal mode now has non-TAA
  smoke capture, host TRAA capture, and same-cost non-temporal `spatial-ultra`
  evidence.
- Phase 3 is unblocked only for private internal prototyping. Host temporal
  sampling is still not promoted because product stripe proxy regresses and the
  material pattern/noise win is insufficient for a product claim.
- 3.1, 3.2, 3.5, and 3.6 are complete for the first private prototype:
  `VBAOTemporalAccumulationNode` owns AO history, resets on resize and camera
  cuts, clamps history to the current 3x3 AO neighborhood, and blends with
  history weight `0.8`.
- 3.3 and 3.4 are complete for the private prototype. Internal temporal now
  reprojects current depth into previous-frame UV, rejects out-of-viewport
  history, persists previous depth/normal guide history, and validates depth and
  normal continuity before blending.
- 3.7 is complete. Benchmark JSON and Markdown now expose the internal temporal
  validation mode, reset state/reason fields, conservative thresholds, and all
  temporal/guide pass timings. GPU rejection counters remain explicitly
  `not-instrumented` rather than being guessed.
- `openspec/changes/vbao-temporal-ao-gate/sdd-plan.md` is the controlling SDD
  roadmap for remaining work. It splits 3.3, 3.4, diagnostics, internal evidence,
  verifier upgrade, failure review, API revisit, and release hardening into
  RED/GREEN/VERIFY gates.
- Phase 4 is complete as a rejection/prototype gate. Temporal `off`, `host`,
  host TRAA, same-cost `spatial-ultra`, and internal `beauty,ao` product rows
  are captured. The upgraded verifier evaluates internal evidence and still
  returns `prototype-only`: internal temporal evidence is present, but
  `internalTemporalPassesPromotion` is `false` because there is no material
  pattern/noise win.
- 5.1 decision: current evidence does not justify a public `temporal` option.
  Therefore 5.2 is satisfied by adding no public option, and 5.3 is satisfied by
  keeping all temporal/reprojection parameters out of the public API.
- 6.1 is complete for this gate pass: internal temporal remains private and the
  rejection rationale is recorded in `EVIDENCE.md`,
  `vbao-temporal-gate-verdict.md`, and this task ledger. Removal is not required
  because `internalTemporalAllowed` remains `true` for private prototyping.
- Closeout: the plan is complete as a gate run, not as a temporal feature
  promotion. The verifier outcome is `prototype-only` and
  `internalTemporalAllowed` is `true`, so private internal accumulation work may
  start while public API and quality promotion remain blocked.
