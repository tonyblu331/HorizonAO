# Metaprompt: VBAO Product Quality Hardening 10x

You are working in `G:\RWY37\horizon-ao` on the existing OpenSpec change:

```text
openspec/changes/vbao-product-quality-hardening-10x/
```

## Goal

Move VBAO from promising candidate evidence toward a release-grade scalar AO
product without promoting private experiments or skipping the evidence gates.

The current truth is simple: the candidate is promising but not promotable.
The earliest blockers are missing reference observations and an unfrozen
same-cost control matrix in the tracked evidence artifacts.

## Read First

Read these before changing code or claims:

- `proposal.md`
- `sdd-plan.md`
- `research-audit.md`
- `tasks.md`
- `apps/demo/scripts/profiling/productionReport.mjs`
- `packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`

Also check `git status --short --branch` before editing. Generated local
directories such as `.tmp/` and `.gpu-profiler/` are not product work.

## Current Architecture Shape

- Public product output is scalar AO only.
- `VBAONode` keeps the 32-sector visibility bitmask as receiver truth.
- Confidence/support data is private evidence and reconstruction guidance.
- Compute, temporal, directional, bent-normal, mask, and metadata lanes are not
  public product surfaces.
- Production reports now classify candidate, control, private, diagnostic, and
  observability rows through the frozen product-quality matrix.
- Missing fixture observations must stay a hard promotion blocker.

## Decision Rules

1. If a product row has `missing-reference-observation`, stop promotion work and
   attach or regenerate reference observations first.
2. If captured reports do not include the frozen product-quality matrix section,
   regenerate the report before using it for a product decision.
3. Compare the confidence-guided candidate against scalar-control, same-cost raw
   samples, full-res controls, compute-off and temporal-off axes,
   compute-smoke observability, and velocity-internal private rows.
4. Treat `same-cost-3x10` and `same-cost-2x16` as controls, not product wins.
5. If same-cost raw sampling beats confidence at similar cost, keep confidence
   private and move the next slice toward sampling/noise provenance.
6. If confidence beats same-cost controls but reference observations are missing,
   keep it candidate-only.
7. If noise improves and `edge-bleed` remains the named blocker, then define
   edge metadata semantics, lifetime, owner, target format, and pass timing
   before wiring runtime use.
8. If temporal looks attractive, reject promotion unless static gates pass and
   velocity/history/disocclusion evidence is complete and clean.
9. Never change README or `EVIDENCE.md` to release-ready language until tracked
   screenshots, GPU timings, complete reference observations, threshold gates,
   no blocking labels, and clean-checkout reproducibility all pass.

## Current Evidence Shape

- `product-preset` at 2560x1440 reports pattern `0.07012`, stripe `0.10459`,
  edge proxy `0.06653`, thin-gap proxy `0.01464`, and total product GPU time
  `4.823ms`; labels remain `noise,edge-bleed`.
- `same-cost-3x10` is approximately flat against product-preset: pattern
  `0.07027`, stripe `0.10367`, edge proxy `0.06682`, thin-gap `0.01479`,
  total `4.930ms`.
- `same-cost-2x16` improves pattern, stripe, and edge proxy but costs more and
  reduces thin-gap proxy: pattern `0.06580`, stripe `0.09836`, edge proxy
  `0.05914`, thin-gap `0.01355`, total `5.186ms`.
- `spatial-ultra` is currently poor value: similar image metrics to
  product-preset at `6.127ms`.
- The temporal verdict is `reject-promotion`; clean-checkout reproducibility is
  not proven, velocity-backed evidence exists only as incomplete private smoke,
  and stripe regression remains.

Use these as planning evidence only until regenerated reports include the
current product-quality matrix output.

## Remaining Work Order

1. Regenerate and normalize product reports so every current row carries matrix
   classification, reference status, screenshot metrics, and pass timings.
2. Attach required fixture observations to product rows and keep failures
   closed when any fixture is missing.
3. Capture the same-cost matrix at required resolutions and views.
4. Attribute dominant noise to raw sampling, cleanup, resolve, polish, or final
   composition before tuning multiple knobs.
5. Choose one next implementation slice from measured evidence:
   `try-sampling`, `try-edge-metadata`, `keep-control`,
   `reject-current-candidates`, or `promote-private-candidate`.
6. Only after static gates pass, run a private temporal audit.
7. Only after all release gates pass, update release-facing claims.

## Do Not Promote

- confidence as public API;
- compute as product path;
- velocity temporal;
- directional or bent-normal output;
- mask or edge metadata as public output;
- release README or `EVIDENCE.md` claims.

## Verification

Run only focused checks unless the user explicitly expands scope:

```sh
pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs
pnpm --filter @horizonao/core exec vitest run --root ../.. packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts
pnpm --filter @horizonao/demo typecheck
git diff --check -- openspec/changes/vbao-product-quality-hardening-10x apps/demo/scripts/profiling/productionReport.mjs packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts
```

Do not run production build commands unless explicitly requested.
