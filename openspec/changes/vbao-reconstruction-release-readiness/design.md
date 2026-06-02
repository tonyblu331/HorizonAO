# Design: VBAO Reconstruction Release Readiness

## Technical Approach

Use a stage autopsy before optimization. The half-resolution path is a reconstruction pipeline, so evidence MUST show where artifacts enter:

```text
half-res raw AO -> half cleanup -> full-res JBU resolve -> optional polish -> final AO
```

For each stage, capture labels for stripe, noise, edge bleed, thin gap, scale mismatch, and false curvature. Do not blur harder until the failing stage is known.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
| --- | --- | --- | --- |
| Half-res gate | Stage-by-stage autopsy | Tune final output blindly | Reconstruction errors can be introduced before or after upsampling. |
| Temporal policy | Keep temporal out of v1 | Add AO history now | Spatial output is not clean enough to justify history/reprojection complexity. |
| Public API | Keep one public `VBAONode` / `vbao()` boundary | Public denoiser or reconstruction knobs | Existing product architecture is correct; evidence, not API surface, is the gap. |
| Diagnostics | Fix duplicate shader naming warnings | Ignore release-time warnings | Release candidates should not emit known shader diagnostics. |
| Runtime sampling | Keep default + injectable product path | Keep benchmark candidates in runtime indefinitely | Benchmark options are acceptable internally, but product runtime should stay inevitable. |

## Data Flow

```text
capture stages -> classify artifact labels -> identify failing stage -> targeted fix -> recapture -> EVIDENCE.md decision
```

```text
source contract -> generated shader inspection -> warning/pass-graph evidence -> release readiness row
```

## Interfaces / Contracts

No new public `VBAONodeOptions` are planned. Any stage capture switch MUST be demo/test/internal-only and MUST NOT appear from `packages/horizon-ao/src/index.ts`.

## Testing Strategy

| Layer | What to Test | Approach |
| --- | --- | --- |
| Source contracts | No public debug/reconstruction API leaks | Vitest source tests. |
| Pass graph | Full-res elides JBU; low-res includes cleanup/JBU only when needed | Existing/generated shader inspection plus source tests. |
| Diagnostics | Duplicate `vbaoPixel` warning removed or documented | Generated shader inspection artifact. |
| Evidence reports | Stage labels and product fixture observations are required | Production report tests. |
| Visual capture | Per-stage half-res screenshots | Playwright/demo benchmark scripts. |

## Rollout

1. Add RED evidence/report contracts for missing per-stage reconstruction labels and product fixture observations.
2. Add capture support for half-res raw, cleanup, resolve, and polish stages.
3. Fix only the stage proven to introduce the blocker labels.
4. Fix `vbaoPixel` diagnostics and tiny runtime cleanup.
5. Re-run targeted tests and evidence capture; production build only if explicitly authorized.

## Open Questions

- [ ] Is half-res raw already wrong, or does cleanup/JBU introduce false curvature and scale mismatch?
- [ ] Are JBU radius/depth weights mismatched to the half-resolution AO radius projection?
- [ ] Does cleanup blur structural edges before upsampling?
- [ ] Can benchmark noise candidates move fully outside runtime without losing useful internal comparison hooks?
