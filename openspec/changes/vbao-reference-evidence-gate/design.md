# Design: VBAO Reference Evidence Gate

## Technical Approach

The gate connects three existing threads:

1. scalar/ray-cast reference fixtures under `packages/horizon-ao/src/reference/`;
2. product benchmark/report scripts under `apps/demo/scripts/`;
3. committed evidence in `EVIDENCE.md`.

The implementation should be boring on purpose: deterministic rows, explicit
missing-data states, and screenshot/timing artifacts that can be reviewed later.
This is not the place to invent another AO algorithm.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| Runtime behavior | Unchanged | Promote a new filter/noise source while measuring | The gate must measure the current product honestly first |
| Evidence state | Missing rows warn/fail | Treat missing rows as neutral | Missing evidence is not proof; we are not children here |
| Noise sources | Internal matrix only | Public `noiseSource` option | Defaults change only after evidence proves a Pareto win |
| Timings | Median/p95 plus pass status | Single anecdotal frame | One frame is a screenshot of luck, not performance evidence |
| Lint policy | Explicit repo rule | Keep ignoring broad lint failures | A blocked gate is useless unless the policy is written down |

## Evidence Model

Each candidate row should answer:

```txt
scene/camera/resolution
algorithm: VBAO | GTAO | SSAO | N8AO
output: raw | product | beauty | AO-only
reference: ray-cast | canonical-vbao | render-review
labels: noise | mud | halo | edge-bleed | thin-gap | scale-mismatch | false-curvature
timing: median-ms | p95-ms | sample-count | pass-status
artifact: screenshot path or documented blocker
verdict: pass | warn | fail | incomplete
```

The exact serialized shape can follow the existing benchmark/report style, but
the semantics must stay this strict.

## Reference Comparison Gate

Reference reports already distinguish ray-cast fixture expectations and
canonical/product VBAO drift. This change should wire those into product
evidence:

- candidate algorithms must be present before a comparison is treated as
  complete;
- canonical/product drift remains visible even if product corrections are
  intentionally different;
- a product divergence can pass only when ray-cast/render evidence says it is
  better and labels do not worsen.

## Capture Gate

Use the pinned cameras from `apps/demo/src/evidence/evidenceCameras.ts`.

Required captures:

- `/lab` at `1920x1080`;
- `/lab` at `1280x720`;
- `/museum` at `1920x1080`;
- `/museum` at `1280x720`.

For each required capture, commit either:

- screenshot artifacts plus timing rows; or
- a documented blocker explaining why the capture did not happen.

## Noise-Source Gate

The current hash atlas remains the default while the matrix runs.

Candidates:

- current phase hash atlas;
- IGN-style deterministic pattern;
- static STBN tile;
- FAST-like candidate.

Metrics:

- noise label;
- thin-gap preservation;
- edge bleed;
- timing;
- artifact path;
- whether the candidate worsens any existing accepted label.

Promotion rule:

```txt
Promote only if the candidate improves at least one target label,
worsens none, and does not hide cost in polish or resolve.
```

## Lint Policy Gate

The broad lint blocker must be resolved before `pnpm lint` becomes a final gate.

Known policy choices:

- `.mjs` scripts should have explicit Node globals in `eslint.config.js`.
- TSL source files need either real typing or a narrow scoped override for
  known Three TSL declaration gaps.

Tradeoff:

- scoped override is faster and honest if documented;
- full typing is cleaner, but risks spending this SDD on declaration fights
  instead of evidence.

## Verification Strategy

Run only verification commands relevant to this change:

```sh
pnpm test
pnpm typecheck
pnpm typecheck:tsgo
pnpm lint
git diff --check
```

If lint policy is not yet implemented, report lint as blocked with exact
evidence instead of pretending it passed.

Do not run a production build unless explicitly requested.

## Open Questions

| Question | Default for this change |
| --- | --- |
| Should lint policy be fixed before captures? | Yes, if it blocks the final gate; otherwise keep it a separate phase |
| Should noise-source candidates be runtime options? | No |
| Should half-resolution output return to product claims? | No, not without separate scale-artifact evidence |
| Should render evidence override canonical drift? | Only when ray-cast/render evidence and failure labels agree |
