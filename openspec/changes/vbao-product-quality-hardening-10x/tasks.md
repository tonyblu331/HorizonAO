# Tasks: VBAO Product Quality Hardening 10x

## Phase 0: Baseline Freeze

- [x] 0.0 Record external research translation and local audit before new
  implementation.
- [x] 0.1 Freeze candidate/control row matrix.
- [x] 0.2 Add metaprompt and revised decision plan for remaining slices.
- [ ] 0.3 Regenerate reports that predate the product-quality matrix section.
- [ ] 0.4 Record current metrics for scalar-control, confidence-guided,
  full-res, and same-cost sample controls.
- [ ] 0.5 Define candidate overhead budget from pass timings.
- [x] 0.6 Ensure report rows classify candidate, control, private, diagnostic,
  and observability roles while keeping compute and temporal as matrix axes.
- [ ] 0.7 Confirm clean-checkout reproducibility for the regenerated evidence
  packet.

## Phase 1: Reference Observation Gate

- [ ] 1.1 Add or refresh required fixture observations for product rows.
- [x] 1.2 Fail product promotion when any required fixture is missing.
- [x] 1.3 Keep screenshot proxy metrics secondary to reference observations.
- [x] 1.4 Document fixture coverage in generated reports.

## Phase 2: Same-Cost Matrix

- [ ] 2.1 Capture scalar-control baseline rows.
- [ ] 2.2 Capture confidence-guided candidate rows.
- [ ] 2.3 Capture `same-cost-3x10` raw sample rows.
- [ ] 2.4 Capture `same-cost-2x16` raw sample rows.
- [ ] 2.5 Capture full-res product control rows.
- [ ] 2.6 Capture `compute-off-control` and `temporal-off-baseline` axes,
  `compute-smoke-observability`, and `velocity-internal-private` without
  making promotion claims.
- [ ] 2.7 Compare cost-normalized quality deltas.

## Phase 3: Noise Kill Gate

- [ ] 3.1 Identify whether noise is dominated by sampling, reconstruction, or
  half-res resolve.
- [ ] 3.2 Test one noise candidate at a time.
- [ ] 3.3 Reject candidates that trade `noise` for `mud`, `halo`, `thin-gap`,
  `edge-bleed`, `false-curvature`, or `scale-mismatch`.
- [ ] 3.4 Record visual and metric deltas at both required resolutions.

## Phase 4: Edge Metadata Gate

- [ ] 4.1 Define edge metadata semantics before runtime use.
- [ ] 4.2 Pick target format, lifetime, backend, and owner.
- [ ] 4.3 Wire the smallest private consumer path.
- [ ] 4.4 Compare against same-cost non-metadata controls.
- [ ] 4.5 Reject if edge metrics do not improve without regressions.

## Phase 5: Product Candidate Bakeoff

- [ ] 5.1 Produce candidate vs controls decision table.
- [ ] 5.2 Record rejected candidates with measured reasons.
- [ ] 5.3 Keep private lanes private unless promotion gates pass.
- [ ] 5.4 Choose next slice: keep-control, try-sampling, try-edge-metadata, or
  promote-private-candidate.

## Phase 6: Release Claim Gate

- [ ] 6.1 Require tracked screenshots and GPU timings.
- [ ] 6.2 Require complete reference observations.
- [ ] 6.3 Require no blocking failure labels.
- [ ] 6.4 Require clean-checkout reproducibility.
- [ ] 6.5 Update `EVIDENCE.md` and README only after the gate passes.

## Verification

- [x] 7.1 Run focused source/reference/report tests.
- [ ] 7.2 Run core and demo typecheck.
- [x] 7.3 Run SDD whitespace and diff hygiene checks.
- [x] 7.4 Do not run production build unless explicitly requested.
