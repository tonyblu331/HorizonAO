# Tasks: VBAO Reference Evidence Gate

## Phase 0: Freeze Scope

- [ ] 0.1 Confirm `vbao-product-discipline-hardening` remains complete and this
  change does not reopen JBU fallback, default polish, low-res softness, fixed
  loop, or reference-folder work.
- [ ] 0.2 Confirm no public `VBAONodeOptions` field is added.
- [ ] 0.3 Confirm no production build is run unless explicitly requested.

## Phase 1: Evidence Contract Tests

- [ ] 1.1 RED: Add evidence-contract tests that fail when required candidate
  rows are missing for VBAO/GTAO/SSAO/N8AO.
- [ ] 1.2 RED: Add tests proving missing screenshots or timing rows produce
  `incomplete` or `fail`, never `pass`.
- [ ] 1.3 RED: Add tests proving canonical/product drift rows remain visible.

## Phase 2: Reference Gate Integration

- [ ] 2.1 GREEN: Wire ray-cast reference report rows into the product evidence
  matrix.
- [ ] 2.2 GREEN: Wire canonical/product VBAO drift summaries into the same
  matrix.
- [ ] 2.3 REFACTOR: Keep reference/report helpers under
  `packages/horizon-ao/src/reference/` and out of public package exports.

## Phase 3: Real Capture Evidence

- [ ] 3.1 Capture `/lab` at `1920x1080` and `1280x720` using pinned cameras.
- [ ] 3.2 Capture `/museum` at `1920x1080` and `1280x720` using pinned cameras.
- [ ] 3.3 Add committed screenshot paths or documented blockers to
  `EVIDENCE.md`.
- [ ] 3.4 Add raw/product, AO-only/beauty, failure-label, median, and p95 timing
  rows.
- [ ] 3.5 Ensure pass rows distinguish measured, unmeasured, skipped, and blocked
  states.

## Phase 4: Noise-Source Comparison Gate

- [ ] 4.1 Add an internal-only comparison matrix for current hash atlas, IGN,
  static STBN, and FAST-like candidates.
- [ ] 4.2 Capture or compute noise, thin-gap, edge-bleed, and timing rows for
  each candidate.
- [ ] 4.3 Keep the default phase atlas unchanged unless the matrix shows a
  Pareto win.
- [ ] 4.4 Record rejected candidates with reasons instead of deleting the
  evidence.

## Phase 5: Lint Policy

- [ ] 5.1 Fix or document `.mjs` Node globals in `eslint.config.js`.
- [ ] 5.2 Decide and implement the TSL typing policy: narrow scoped override or
  full typing cleanup.
- [ ] 5.3 Update the SDD notes with the tradeoff chosen.

## Phase 6: Verification

- [ ] 6.1 Run targeted evidence/reference Vitest suites.
- [ ] 6.2 Run `pnpm test`.
- [ ] 6.3 Run `pnpm typecheck`.
- [ ] 6.4 Run `pnpm typecheck:tsgo`.
- [ ] 6.5 Run `pnpm lint`, or document the exact remaining lint blocker.
- [ ] 6.6 Run `git diff --check`.
- [ ] 6.7 Update `apply-progress.md` with commands, results, and blockers.
