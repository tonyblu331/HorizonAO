# Design: VBAO Release-Candidate Gates

## Technical Approach

Use gates, not feature work. Each review finding becomes a falsifiable row in `EVIDENCE.md` or a source/shader contract. Runtime edits are allowed only when a gate proves boundary cleanup is needed.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
| --- | --- | --- | --- |
| Half-res gate | Compare half/full product rows before promotion | Make half-res default by cost alone | Quality regressions are the release risk. |
| Noise gate | Keep atlas default until measured Pareto win | Pick by visual taste | Sampling must be chosen by reconstruction error and cost. |
| Runtime trim | Move reference/debug-only code out of `src` | Leave research helpers near exports | Public runtime should be small and inevitable. |
| Shader proof | Capture generated shader evidence | Trust TS source strings only | TSL can generate unexpected WGSL/graph output. |
| Archive check | Manifest exact review files | Hand off partial zips | Missing imports made prior review incomplete. |

## Data Flow

    benchmark capture -> production report -> EVIDENCE.md gate rows
    source contracts  -> generated shader capture -> release readiness decision
    runtime audit     -> reference/debug relocation -> package API check

## File Changes

| File | Action | Description |
| --- | --- | --- |
| `EVIDENCE.md` | Modify | Add gate rows and pass/fail decisions. |
| `apps/demo/scripts/collect-ao-benchmark.mjs` | Modify if needed | Capture half/full product rows and noise rows. |
| `apps/demo/scripts/profiling/productionReport.mjs` | Modify if needed | Report gate status fields. |
| `packages/horizon-ao/src/vbaoGtVbaoMath.ts` | Move candidate | Relocate if runtime imports do not require it. |
| `packages/horizon-ao/src/vbaoConstants.ts` | Modify if needed | Move debug-only sector tables. |
| `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` | Modify | Protect boundary and shader-evidence contracts. |

## Interfaces / Contracts

No new public `VBAONodeOptions`. Any benchmark-only switch must stay internal and visibly labeled in reports.

## Testing Strategy

| Layer | What to Test | Approach |
| --- | --- | --- |
| Source contracts | Runtime boundary and benchmark labels | Vitest source tests. |
| Reports | Missing evidence is incomplete/fail | Existing production report tests. |
| Capture | Half/full and noise rows | Playwright benchmark capture when requested. |
| Shader | Fixed loops/pass shape | Captured generated shader artifact plus focused assertion. |

## Migration / Rollout

No migration required. Gates land incrementally; release-candidate label waits for all required gates.

## Open Questions

- [ ] Best generated-shader capture hook in current Three/TSL stack.