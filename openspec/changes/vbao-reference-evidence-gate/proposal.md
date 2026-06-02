# Proposal: VBAO Reference Evidence Gate

## Summary

Add a strict evidence gate that compares product AO output against committed
reference fixtures and captured render evidence before any new quality claim,
noise-source promotion, denoise change, or public API expansion.

This change is planning and verification infrastructure first. It does not
change `VBAONode` runtime behavior.

## Motivation

The completed product-discipline pass fixed the immediate architectural seams:
manual JBU fallback, documented 8-tap default polish, low-resolution softness
budgeting, fixed product loop shapes, pass timing status rows, and reference
module separation.

The remaining risk is different: the project can still fool itself by treating a
better-shaped product node as a better AO algorithm without enough proof. The
current evidence already keeps canonical/product drift visible, so the next SDD
must turn that honesty into a hard gate.

## Goals

- Compare VBAO, GTAO, SSAO, and N8AO rows against the same reference/canonical
  evidence instead of relying on visual vibes.
- Capture `/lab` and `/museum` evidence at `1920x1080` and `1280x720`.
- Record screenshots, raw/product AO rows, beauty rows, failure labels, and GPU
  timings in `EVIDENCE.md`.
- Add a noise-source comparison gate for the current hash atlas, IGN, static
  STBN, and FAST-like candidates before changing the default phase atlas.
- Resolve lint policy blockers so `pnpm lint` can become a meaningful gate
  again.

## Non-Goals

- No new public `VBAONodeOptions` knobs.
- No bent AO, temporal accumulation, denoise promotion, or shader-quality
  promotion.
- No default noise-source change.
- No production build unless explicitly requested.
- No marketing claim that VBAO is closer to path tracing until this gate passes.

## Approach

1. Freeze evidence contracts before collecting more screenshots.
2. Add reference comparison rows that treat missing candidate data as
   incomplete or failing evidence, not success.
3. Capture real render evidence using the pinned cameras already documented by
   the project.
4. Run the noise-source matrix as an internal evidence experiment with unchanged
   defaults.
5. Make lint policy explicit, then verify the repo with the agreed gate set.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `EVIDENCE.md` | Modified | Add reference gate rows, capture links, timing rows, and noise-source results |
| `apps/demo/scripts/collect-ao-benchmark.mjs` | Modified | Emit comparison/timing fields needed by the gate |
| `apps/demo/scripts/profiling/productionReport.mjs` | Modified | Report pass-level status and reference-gate summaries |
| `packages/horizon-ao/reference/` | Modified | Feed gate rows from ray-cast and canonical/reference reports |
| `packages/horizon-ao/src/__tests__/` | Modified | Add RED/GREEN evidence-contract tests |
| `eslint.config.js` | Modified if needed | Document `.mjs` globals and scoped TSL typing policy |

## Success Criteria

- [ ] Reference/evidence tests fail when candidate rows are missing.
- [ ] `/lab` and `/museum` have committed `1920x1080` and `1280x720`
  screenshots or documented capture blockers.
- [ ] `EVIDENCE.md` records raw/product, AO-only/beauty, failure labels, and
  median/p95 timing rows.
- [ ] Noise-source candidates are compared without changing the default atlas.
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm typecheck:tsgo`, and the agreed lint
  gate pass.

## Rollback Plan

Revert this change folder and any evidence/test/report additions. Runtime
`VBAONode` behavior and the public package surface must remain unchanged.
