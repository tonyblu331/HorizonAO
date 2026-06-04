# E2E Metaprompt: VBAO Receiver Visibility Solver

Use this prompt to drive the remaining receiver-solver work end to end without
falling back into the old post-effect mental model.

## Prompt

You are working in `G:\RWY37\horizon-ao`.

Goal: complete the `vbao-receiver-visibility-solver` change as a real product
architecture implementation, not a prototype, not a rename pass, and not a
denoise feature. The product remains scalar `VBAONode` AO. Internally, the work
must organize around receiver state:

```text
receiver inputs
-> estimate compact visibility
-> validate receiver/sample compatibility
-> reconstruct trusted scalar AO
-> reuse only compatible receiver state
-> derive directional data only from the same visibility state
```

Start by reading:

- `AGENTS.md`
- `openspec/specs/vbao-node/spec.md`
- `openspec/adr/ADR-007-vbao-pivot.md`
- `openspec/adr/ADR-011-raw-first-no-denoise.md`
- `openspec/adr/ADR-014-camera-only-temporal-rejection.md`
- `openspec/changes/vbao-receiver-visibility-solver/proposal.md`
- `openspec/changes/vbao-receiver-visibility-solver/design.md`
- `openspec/changes/vbao-receiver-visibility-solver/sdd-plan.md`
- `openspec/changes/vbao-receiver-visibility-solver/ultraplan.md`
- `openspec/changes/vbao-receiver-visibility-solver/tasks.md`
- `openspec/changes/vbao-receiver-visibility-solver/source-shape-audit.md`
- `openspec/changes/vbao-receiver-visibility-solver/product-api-collapse.md`

Current completed slice:

- `contact` is the artist-facing finite-occluder prior.
- `advanced` owns low-level overrides.
- deprecated low-level aliases remain for compatibility and evidence lanes.
- quality presets are product-shaped:
  - `performance`: `0.50`, `2x4`
  - `balanced`: `0.75`, `3x6`
  - `quality`: `1.00`, `4x8`
  - `ultra`: `1.00`, `4x10`

Do not change shader formulas, render target formats, public exports, or
benchmark labels in a refactor slice. If a runtime behavior changes, name the
receiver-state reason and add tests first.

## Implementation Order

1. Close SDD hygiene before new code:
   - fix spec/task wording drift;
   - keep completed verification reflected in `tasks.md`;
   - keep `apply-progress.md` current.
2. Complete Phase 2 behavior-preserving source shape:
   - rename private ownership concepts only where clarity improves;
   - keep render target texture names and public API stable;
   - update source tests from pass-name thinking to receiver-contract thinking.
3. Start Phase 3 only after Phase 2 is clean:
   - write RED tests for confidence/support semantics;
   - prove the smallest metadata representation before adding targets;
   - use confidence to guide reconstruction or diagnostics, never as a public
     product knob.
4. Add evidence only after runtime candidates exist:
   - screenshots;
   - GPU timings;
   - quality labels;
   - same-cost comparisons.
5. Leave temporal, compute, and directional output private unless their own
   gates prove they replace cost or ambiguity.

## Completion Criteria

The change is complete only when all of these are true:

- `openspec/changes/vbao-receiver-visibility-solver/tasks.md` has no ambiguous
  or stale completion marks.
- The active spec and change spec agree on public API, preset policy, and
  receiver-state boundaries.
- Phase 2 refactor has no shader math changes.
- Phase 3 confidence work, if implemented, has tests before runtime code and
  stays private unless a separate public API SDD exists.
- No public `temporal`, `confidence`, `metadata`, `mask`, `denoise`,
  `sector-count`, or directional-output option is added.
- `VBAONode` remains the single public product boundary.
- legacy low-level options remain compatibility aliases, not the taught product
  model.
- evidence rows include screenshots, timings, labels, and reference rows before
  README or release claims move.

## Required Verification

Run only the checks relevant to the touched files. Do not run production builds
unless explicitly requested.

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check -- openspec/changes/vbao-receiver-visibility-solver openspec/specs/vbao-node/spec.md packages/horizon-ao/src
```

For reference changes, also run the focused reference tests under:

```sh
packages/horizon-ao/reference/__tests__
```

For rendered product/evidence changes, run the repo's existing Playwright or
evidence capture path that covers the changed demo route, then record the
artifact paths in `apply-progress.md`.

## Report Back

Return:

1. what changed;
2. what gate it closes;
3. what verification passed;
4. what remains blocked;
5. whether production build was intentionally skipped.
