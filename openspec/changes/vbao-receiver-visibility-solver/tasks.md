# Tasks: VBAO Receiver Visibility Solver

## Phase 0: Canonical SDD

- [x] 0.1 Create `proposal.md` for the receiver-solver architecture.
- [x] 0.2 Create `design.md` with the receiver-state diagram.
- [x] 0.3 Create `sdd-plan.md` with phase order, guardrails, and skill routing.
- [x] 0.4 Create `ultraplan.md` with gate stack, readiness, and kill criteria.
- [x] 0.5 Create spec delta for receiver-state boundary.

## Phase 1: Source Shape Audit

- [x] 1.1 Audit `VBAONode.ts` for raw/product terminology that hides receiver
  estimate ownership.
- [x] 1.2 Audit cleanup/resolve/polish classes as receiver reconstruction
  stages.
- [x] 1.3 Audit private temporal and benchmark hooks for receiver-reuse
  vocabulary and leakage risk.
- [x] 1.4 Identify behavior-preserving refactors that do not touch shader math.
- [x] 1.5 Record which source tests must change from pass-name assertions to
  receiver-contract assertions.

## Phase 2: Behavior-Preserving Refactor

- [x] 2.1 Refactor only names/ownership boundaries that reduce ambiguity.
- [x] 2.2 Keep public exports unchanged.
- [x] 2.3 Keep raw loop shape and shader formulas unchanged.
- [x] 2.4 Preserve pass labels and benchmark capture behavior.
- [x] 2.5 Run targeted source tests and typecheck.

Note: Phase 2.5 intentionally landed before Phase 2 because it corrected the
public product boundary without touching shader formulas, render targets, or
receiver reconstruction math. Phase 2 remains the behavior-preserving source
shape cleanup and must not reinterpret the product API collapse as confidence,
temporal, or compute promotion.

## Phase 2.5: Product API Collapse

- [x] 2.5.1 Add `contact` as the artist-facing finite-occluder prior.
- [x] 2.5.2 Add `advanced` overrides for `thickness`, `contrast`, `slices`,
  `samples`, and `resolutionScale`.
- [x] 2.5.3 Keep legacy top-level low-level fields as deprecated aliases.
- [x] 2.5.4 Map contact to internal thickness with a bounded radius ratio.
- [x] 2.5.5 Move balanced/quality/ultra presets away from all-half-res defaults.
- [x] 2.5.6 Update source contracts and capability spec for the new product
  shape.

## Phase 3: Receiver Confidence Gate

- [x] 3.1 Define confidence/support semantics in tests before runtime changes.
- [x] 3.2 Choose the smallest metadata representation, starting with `RG16F`
  only if source/render-target evidence supports it.
- [x] 3.3 Compute confidence from observable receiver-state terms.
- [x] 3.4 Use confidence to modulate cleanup/polish, not public options.
- [x] 3.5 Compare scalar control vs confidence candidate with screenshots,
  labels, and pass timings.
- [x] 3.6 Reject or keep private unless it improves a named label or reduces
  pass cost without regressions.

## Phase 4: Input Preparation And Optimization

- [x] 4.1 Decide whether depth hierarchy/representative depth is needed from a
  failing reference or radius-stress gate.
- [x] 4.2 Decide whether edge metadata can replace repeated reconstruction
  compatibility work.
- [x] 4.3 Add compute only when storage/tiled data shape has a named win.
- [x] 4.4 Include target format, lifetime, backend, and dispatch timing in
  evidence rows.
- [x] 4.5 Reject compute candidates that are only architecturally neat.

## Phase 5: Receiver Reuse

- [x] 5.1 Reframe temporal docs/tests as receiver-state reuse.
- [x] 5.2 Keep camera-only temporal rejected.
- [x] 5.3 Keep velocity-backed temporal private until same-cost motion evidence
  wins.
- [x] 5.4 Do not add public temporal options from this SDD.
- [x] 5.5 If confidence exists, evaluate it as validation input only after the
  base velocity path wins.

## Phase 6: Directional Visibility

- [x] 6.1 Keep directional visibility reference-only until scalar gates are
  stable.
- [x] 6.2 Derive buckets/moments from open sectors, not from normals or a second
  estimator.
- [x] 6.3 Prove separated lobes stay separated.
- [x] 6.4 Do not expose public bent/directional output without a consumer SDD.

## Phase 7: Evidence And Claims

- [x] 7.1 Update `EVIDENCE.md` only when screenshots, timings, labels, and
  reference rows exist.
- [x] 7.2 Keep README/product claims blocked until release gates are complete.
- [x] 7.3 Record rejected candidates with measured reasons.
- [x] 7.4 Preserve scalar AO as public output until metadata or directional
  output earns promotion.

## Verification

- [x] 8.1 Run `git diff --check -- openspec/changes/vbao-receiver-visibility-solver`.
- [x] 8.2 For product API/source contract changes, run `pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`.
- [x] 8.3 For reference changes, run relevant tests under
  `packages/horizon-ao/reference/__tests__`. Phase 3.1 ran
  `vbaoReceiverConfidence.test.ts`, `vbaoReference.test.ts`, and
  `vbaoEvidenceContract.test.ts`.
- [x] 8.4 Run `pnpm --filter @horizonao/core typecheck`.
- [x] 8.5 Run `pnpm --filter @horizonao/demo typecheck` when demo/evidence code
  changes.
- [x] 8.6 Do not run production build unless explicitly requested.
- [x] 8.7 Run Phase 3.5 scalar-control and confidence-diagnostic benchmark
  captures with screenshots and pass timings.
- [x] 8.8 Run Phase 4.4 compute-inventory benchmark capture with target
  format, lifetime, backend, and dispatch timing rows.
- [x] 8.9 Run final Phase 5-7 verification: focused core tests, production
  report test, core/demo typecheck, SDD scans, and diff hygiene.
