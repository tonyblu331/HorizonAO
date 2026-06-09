# Design: VBAO Release Gap Closure

## Gate Model

Release readiness is a gate stack:

```text
research ledger -> reference truth -> product quality -> release cleanliness -> evidence verdict
```

Each gate must fail closed. Missing observations, screenshots, or timing rows
produce `incomplete` or `fail`, never `pass`.

## Gate 0: Research Ledger

The SDD must start from verified claims, not vibes. `research-ledger.md` owns
the source-to-plan mapping:

- SSILVB/VBAO defines the bitmask and thin-surface motivation.
- GTAO defines the reference-and-runtime discipline.
- CACAO defines the production-pipeline measurement pressure.
- Three.js defines the local integration and generated-shader risk.
- N8AO defines product-quality pressure, not mathematical truth.
- Local source/tests define what is already implemented.

Any future phase that changes kernel math, adds a pass, promotes temporal, or
changes the public API must add a ledger row first.

## Gate 1: Reference Truth

The current blocker is not that screenshots are absent; it is that screenshots
are not truth. Add product-lane observations for fixtures that expose the risk:

- `thin-gap-separated-slabs`
- broad wall/contact region
- two-wall corner gap
- grazing-normal contact
- normal discontinuity / edge-bleed case

Local verification note: `packages/horizon-ao/reference/aoRaycastReference.ts`
already contains fixtures covering these categories. The plan should wire and
gate existing fixtures before inventing more.

The ray-cast/reference report owns truth rows. Rendered screenshots can support
the diagnosis but cannot promote a math/kernel claim alone.

## Gate 2: Product Quality

Create a promotion matrix with the fixed VBAO product path as the default row.
Debug overrides, same-cost variants, temporal, compute, and noise-source
candidates must remain separately labeled.

Required dimensions:

- scene: `museum`, `lab`
- resolution: `1920x1080`, `1280x720`
- output: `raw-debug`, `product`
- view: `ao`, `beauty`
- algorithm: `vbao`, `gtao`, `n8ao` where available
- candidate label: default product or explicit private candidate

Required metrics:

- reference error or observation status
- pattern/noise score
- stripe score
- edge-bleed proxy
- thin-gap proxy
- failure labels
- median and p95 timing
- pass timing status: measured, derived, skipped, missing, unexpected

## Gate 3: Release Cleanliness

Release cleanliness means the default path is easy to explain:

- public package exports only `VBAONode`, `vbao`, and public option types;
- `getTextureNode()` is product AO;
- `getRawTextureNode()` is debug/readback AO;
- temporal, compute, reconstruction-stage capture, benchmark noise sources, and
  sample-shape overrides stay private/demo-only;
- README claims match proven evidence, not candidate hopes.

## Evidence Verdict

The final report should produce one verdict:

- `pass`: all required reference, screenshot, label, and timing gates pass;
- `fail`: a measured gate regresses beyond threshold;
- `incomplete`: required proof is missing or untracked;
- `candidate-only`: a private lane runs but cannot promote product behavior.

## Threshold Policy

Initial threshold work should be conservative. Do not tune thresholds to pass
the current implementation. Start by freezing current reported metrics and
making explicit which deltas are material enough to block promotion.

Thresholds must be source-aware:

- reference thresholds compare against ray-cast/product observations;
- product thresholds compare against GTAO/N8AO only as baselines;
- timing thresholds include raw, cleanup, resolve, polish, temporal, and compute
  pass statuses when those lanes are present;
- screenshots are allowed to trigger investigation, but not to override failed
  reference truth.

## Verification

Planning-only verification:

```sh
git diff --check -- openspec/changes/vbao-release-gap-closure
```

Implementation phases should use the smallest relevant subset of:

```sh
pnpm --filter @horizonao/core test -- packages/horizon-ao/reference
pnpm --filter @horizonao/core test -- packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/demo test
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
git diff --check
```
