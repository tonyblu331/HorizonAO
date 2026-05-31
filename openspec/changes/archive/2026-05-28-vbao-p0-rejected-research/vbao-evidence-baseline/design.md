# Design: VBAO Evidence Baseline

## Technical Approach

Use the existing Museum/GTAO reference route as the evidence harness and extend
documentation/tests around it. The implementation will not alter `VBAONode`
math, public options, or locked quality tiers. Evidence-specific full-res VBAO
will be demo-local configuration applied where comparison pipelines are built.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
| --- | --- | --- | --- |
| Artifact store | `openspec` | Engram, hybrid | Repo already uses `openspec`; Engram tools are unavailable here. |
| Capture route | Museum/GTAO reference route | New standalone route | Existing route already compares GTAO/VBAO/N8AO with raw/denoised output. |
| Full-res mode | Demo-local evidence toggle/config | New core preset or `VBAONodeOptions` flag | Avoids public API churn and keeps locked tiers stable. |
| Timing source | Manual WebGPU evidence rows plus smoke tests | Playwright-only timing | Headless fallback may not exercise WebGPU. |

## Data Flow

```txt
Museum route
  -> prepass depth/normal
  -> GTAO, VBAO, N8AO pipelines
  -> raw or denoised scalar output
  -> beauty or AO-only view
  -> screenshot/timing capture
  -> EVIDENCE.md row with failure labels
```

## File Changes

| File | Action | Description |
| --- | --- | --- |
| `EVIDENCE.md` | Modify | Add raw/denoised comparison matrix, failure labels, timing method fields |
| `apps/demo/src/scenes/MuseumScene.tsx` | Modify | Add demo-local full-res VBAO evidence option if current controls lack it |
| `apps/demo/e2e/scene-routes.spec.ts` or `ao-compare.spec.ts` | Modify | Smoke test comparison route and controls |
| `openspec/changes/vbao-evidence-baseline/*` | Create | Proposal, delta spec, design, tasks |

## Interfaces / Contracts

No public `@horizonao/core` interface changes.

Evidence rows should capture:

```txt
scene | cameraId | resolution | algorithm | viewMode | denoise
device | browser | renderer | timingMethod | medianTime_ms
radius | thickness | slices | samples | resolutionScale | failureLabels | screenshotPath
```

Allowed `failureLabels`: `none`, `noise`, `mud`, `halo`, `thin-gap`,
`edge-bleed`, `scale-mismatch`.

## Testing Strategy

| Layer | What to Test | Approach |
| --- | --- | --- |
| Unit | Evidence label helpers only if introduced | Vitest RED/GREEN before helper implementation |
| E2E | Museum route renders and exposes AO comparison controls | Playwright smoke, no WebGPU quality assertion |
| Manual | Screenshots and GPU/frame timings | Chrome/WebGPU at 1920x1080 and 1280x720 |

## Migration / Rollout

No migration required. Evidence mode is demo-only and can be reverted without
touching package consumers.

## Open Questions

None.
