# Tasks: VBAO Signal Quality Research Alignment

## Phase 0: Direction Freeze

- [x] 0.1 Create the research-aligned SDD plan.
- [x] 0.2 Decide to keep `VBAONode` as a 32-sector SSILVB/VBAO bitmask product.
- [x] 0.3 Reject GTAO pivot, public N8AO-style denoise controls, 64-sector-first,
  and temporal-first shortcuts.
- [x] 0.4 Add WebGPU/Three compute as an internal candidate lane, not a default
  architecture switch.

## Phase 1: Research Claim Ledger

- [x] 1.1 Create `research-claim-ledger.md`.
- [x] 1.2 Classify each claim as source truth, supported research pressure,
  local evidence gap, rejected shortcut, or stale claim.
- [x] 1.3 Correct stale claims about slice count, cosine weighting, and current
  production reduction.
- [x] 1.4 Record one local implication and one non-goal each for SSILVB, GTAO,
  XeGTAO, CACAO, Three GTAONode, and N8AO.
- [x] 1.5 Verify no runtime code changes land in this phase.

## Phase 2: Reference Alignment Gate

- [x] 2.1 Confirm existing reference tests cover the canonical scalar
  SSILVB/reference lane vs production VBAO drift-report lane.
- [x] 2.2 Confirm ray-cast AO reference rows cover thin-gap, contact corner,
  broad wall, grazing surface, and normal-sensitive cases.
- [x] 2.3 Add RED reference/report tests for any missing case.
- [x] 2.4 Preserve `missing-reference-observation` behavior for absent product
  observations.
- [x] 2.5 Decide which failing reference layer gates the first runtime candidate:
  ray-cast AO fixtures must add broad wall, grazing surface, and
  normal-sensitive finite-geometry rows before any shader/runtime edit starts
  for the near-contact thickness collapse candidate.
- [x] 2.6 Add raw VBAO vs product VBAO reference/report contrast so polish cannot
  hide signal defects.

## Phase 3: Raw Signal Attribution

- [x] 3.1 Add or confirm diagnostics for 32-sector boundary instability.
- [x] 3.2 Add or confirm diagnostics for stochastic sub-sector variance.
- [x] 3.3 Add or confirm metrics for 64px phase-tile residuals in
  `patternNoiseScore`.
- [x] 3.4 Add or confirm a near-contact thickness-collapse fixture for
  `0.85 * sampleDistance`.
- [x] 3.5 Add or confirm broad-contact under-occlusion coverage for
  `radius * 0.3` thickness cap.
- [x] 3.6 Keep raw AO evidence separate from product AO evidence.
- [x] 3.7 Contrast the pasted noise/thinness diagnosis against current source
  truth and mark the cosine-weighting claim as stale in the SDD record.
- [x] 3.8 Add a magic-number retirement plan that classifies invariants,
  atlas-layout constants, numeric guards, heuristics, and candidate-only values.
- [x] 3.9 Add the integrated three-lane SDD direction: contact policy fit,
  sampling atlas bakeoff, and bitmask metadata sidecar.

## Phase 4: Thickness Contact Candidate

- [x] 4.1 Decide whether the current thickness clamp stays documented as-is.
- [x] 4.2 If changing behavior, add RED fixtures before shader/runtime edits.
- [x] 4.3 Evaluate adaptive thickness from the existing reference-first path.
- [x] 4.4 Evaluate a minimum effective-thickness floor only as an internal
  candidate.
- [x] 4.5 Reject any candidate that closes valid thin gaps or weakens broad
  contact.
- [x] 4.6 Migrate source-contract tests from exact `0.3` / `0.85` literals to
  named internal policy contracts before behavior-preserving refactors.

## Phase 5: Sampling And Noise Candidate

- [x] 5.1 Re-run or extend noise-source comparison for
  `phase-atlas-stable-hash`.
- [x] 5.2 Evaluate larger or differently arranged phase atlas only behind an
  internal benchmark label.
- [x] 5.3 Evaluate IGN/STBN/Hilbert-R2-style candidates as same-cost candidates.
- [x] 5.4 Compare against same-cost slice/sample increases.
- [x] 5.5 Reject candidates that add `mud`, `halo`, `edge-bleed`, `thin-gap`, or
  `scale-mismatch`.
- [x] 5.6 Prefer CPU-baked atlas/LUT candidate placement before procedural
  shader hot-path sampling changes.

## Phase 6: Compute Candidate Gate

- [x] 6.1 Add a fixture or screenshot gate that the current render-target path
  fails or cannot answer cleanly before any compute prototype starts.
- [x] 6.2 Add source-contract tests proving compute candidates are private and
  not public `VBAONodeOptions`.
- [x] 6.3 Add benchmark schema fields for compute dispatch timing, storage target
  inventory, output resolution, and true WebGPU backend status.
- [x] 6.4 Extend or reuse `benchmark:ao:gpu-readback` for oracle/readback rows.
- [x] 6.5 Prototype the smallest Three TSL compute candidate first: depth prepare
  or sector-confidence metadata.
- [x] 6.6 Feed compute output back into the existing product graph as an internal
  texture-node input.
- [x] 6.7 Keep the current render-target path as the control.
- [x] 6.8 Capture screenshots, AO-only rows, product rows, timings, labels, and
  backend status.
- [x] 6.9 Reject compute if it does not win a named gate.

## Phase 7: Product Pipeline Candidate

- [x] 7.1 Evaluate sector support/confidence metadata for confidence-aware
  polish.
- [x] 7.2 Evaluate edge metadata for resolve/polish.
- [x] 7.3 Evaluate depth hierarchy or representative-depth prepare only if it
  preserves thin occluders.
- [x] 7.4 Count compute dispatch cost beside raw/cleanup/resolve/polish cost.
- [x] 7.5 Keep `getTextureNode()` final product AO and `getRawTextureNode()`
  debug/readback only.

## Phase 8: Evidence And Decision

- [x] 8.1 Update `EVIDENCE.md` only after screenshots, timings, labels, and
  backend status exist.
- [x] 8.2 Decide whether each candidate is promoted, kept private, or rejected.
- [x] 8.3 Document rejected candidates with measured reasons.
- [x] 8.4 Keep README/marketing claims blocked until reference gates prove them.
- [x] 8.5 Capture studio-practice cards as archetypes, not audited exact
  per-studio implementation claims.

## Phase 9: Verification

- [x] 9.1 Run targeted source-contract Vitest for touched source.
- [x] 9.2 Run relevant reference tests for the verified reference/report claims:
  `pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/vbaoCanonicalDriftReport.test.ts packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
- [x] 9.3 Run `pnpm --filter @horizonao/core typecheck`.
- [x] 9.4 Run `pnpm --filter @horizonao/demo typecheck` when demo/evidence code
  is touched.
- [x] 9.5 Run `pnpm --filter @horizonao/demo benchmark:ao:gpu-readback` when
  compute/readback evidence changes.
- [x] 9.6 Run the smallest rendered benchmark required by the active evidence
  gate.
- [x] 9.7 Run `git diff --check` for tracked diff hygiene and an explicit
  trailing-whitespace scan for the untracked SDD files.
- [x] 9.8 Do not run production build unless explicitly requested.
