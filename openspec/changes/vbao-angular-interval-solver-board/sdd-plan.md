# SDD Plan: VBAO Angular Interval Solver Board

## Current Truth

The active spec already requires:

- one coherent visibility-bitmask path;
- sample-local thickness;
- front/back blocker intervals;
- cosine-measure CDF remapping;
- point-sample sector quantization;
- stochastic sub-sector coverage;
- popcount reduction;
- projected-normal slice weighting;
- internal spatial reconstruction only.

The current gap is not a missing concept. The gap is that failures are still
debugged as local symptoms instead of solver-term interactions.

## Board Vocabulary

| Term | Meaning |
| --- | --- |
| Receiver | The shaded point plus depth/normal/camera context. |
| Angular visibility interval | The projected front/back blocker extent in a slice measure domain. |
| Sector support | Evidence that a sector was reached by valid samples or repeated/broad intervals. |
| Confidence | Trust in the reduced receiver estimate, not darkness. |
| Reconstruction | Spatial repair of compatible receiver signal, not generic blur. |
| Product AO | Final scalar output returned by `getTextureNode()`. |

## Phase 1: Canonical Solver Board

Goal: freeze the shared equation and dependency diagram.

Deliverables:

- proposal/design/sdd-plan/tasks for this change;
- solver whiteboard with math, shader terms, quirks, and gates;
- raw-signal tightening slice for thickness policy, sector confidence, and
  edge-aware reconstruction;
- no runtime code changes.

Acceptance:

- every identified quirk maps to a solver term;
- WI/SPWI is contrasted without renaming the product;
- no new public API or formula change is proposed as already accepted.

## Phase 2: Red Fixture Matrix

Goal: add failing or warning-level tests that classify failures by solver term.

Fixtures:

- near-contact thickness clamp;
- broad contact vs thin gap;
- sector boundary interval;
- stochastic sub-sector one-hit interval;
- off-axis sample-local thickness;
- depth/normal edge incompatibility;
- reconstruction hides raw defect.

Acceptance:

- each fixture has expected owner term;
- failures cannot be fixed by polish-only changes;
- scalar reference and source tests agree on vocabulary.

## Phase 3: Shader Candidate Isolation

Goal: evaluate one raw-kernel candidate at a time.

Allowed candidates:

- named near-sample thickness policy;
- confidence/support sidecar refinement;
- boundary-risk metadata;
- phase atlas/noise arrangement;
- same-cost slice/sample schedule.

Rejected as first moves:

- 64-sector production mask;
- public thickness mode;
- public denoise controls;
- world-space interval transport rewrite;
- temporal accumulation as a raw signal fix.

Acceptance:

- candidate improves a named term and label;
- no thin-gap, broad-contact, edge-bleed, mud, halo, or scale regression;
- generated shader inspection remains readable.

## Phase 4: Reconstruction Solver Alignment

Goal: make cleanup, resolve, and polish consume receiver truth instead of
blindly smoothing scalar AO.

Work:

- route confidence/support into reconstruction only where evidence wins;
- add or refine edge compatibility terms;
- compare raw, cleanup, resolve, polish, and final product rows;
- keep product and raw semantics explicit.

Acceptance:

- reconstruction improves product rows without hiding raw failure labels;
- edge discontinuities are preserved;
- pass timing remains counted beside quality metrics.

## Phase 5: Source Consolidation

Goal: simplify after the math is stable.

Candidate refactors:

- extract shared interval/thickness policy names only if they reduce source-test
  brittleness;
- consolidate duplicate validity checks between raw and confidence sidecar;
- move graph assembly helpers only if `VBAONode.ts` becomes easier to audit;
- delete stale candidate docs or route them to archive after measured rejection.

Acceptance:

- no behavior change hidden in refactor;
- source diff makes solver ownership clearer;
- tests cover both source contract and reference behavior.

## Phase 6: Evidence And Product Decision

Goal: decide what ships as product behavior.

Evidence rows:

- scalar reference;
- GPU readback where applicable;
- raw AO screenshot;
- product AO screenshot;
- pass timings;
- failure labels;
- generated shader inspection when raw kernel changes.

Acceptance:

- README/product docs stay conservative until gates pass;
- public options remain compact;
- rejected candidates record why.

## Optimization Lens

Use this equation when deciding if work is worth doing:

```text
value = failure_label_delta
      + reference_error_delta
      + product_metric_delta
      + pass_cost_delta
      - public_api_cost
      - shader_complexity_cost
      - evidence_gap
```

If the candidate only sounds elegant, it does not pass.

## Verification

Planning-only verification:

```sh
git diff --check -- openspec/changes/vbao-angular-interval-solver-board
```

Implementation phases choose focused checks:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoGtVbaoMath.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoReference.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
```
