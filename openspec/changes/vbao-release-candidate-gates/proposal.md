# Proposal: VBAO Release-Candidate Gates

## Intent

Convert the remaining external review findings into SDD gates before any release-candidate claim. The problem is not missing ambition; it is proof discipline. Product rows must prove the actual product path, half-res must earn promotion, and runtime must stop carrying reference/debug weight.

## Scope

### In Scope
- Capture and judge half-res versus full-res VBAO product quality.
- Compare noise candidates without changing the default atlas.
- Trim runtime/reference/debug boundaries.
- Inspect generated shader output for product presets.
- Define self-contained archive/package checks for review handoff.

### Out of Scope
- Temporal AO, bent AO, new public denoise knobs, or new public reconstruction nodes.
- Default noise-source changes without evidence.
- Production build unless explicitly requested.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `vbao-node`: adds release-candidate evidence gates for product claims, half-res promotion, noise-source changes, runtime boundary cleanup, shader inspection, and review archive completeness.

## Approach

Use existing benchmark/report infrastructure and `EVIDENCE.md`. Add only the minimum code/tests needed to make each gate falsifiable. Prefer source contracts plus generated shader evidence over claims based on TypeScript strings alone.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `EVIDENCE.md` | Modified | Add pass/fail rows for half-res, noise, shader, and archive gates. |
| `apps/demo/scripts/*` | Modified | Capture and label gate rows when needed. |
| `packages/horizon-ao/src/` | Modified | Trim debug/reference-only runtime material. |
| `packages/horizon-ao/reference/` | Modified | Keep reference/report code outside public runtime. |
| `openspec/changes/vbao-release-candidate-gates/` | New | SDD artifacts for this roadmap. |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Evidence capture flakes on WebGPU timestamps | Medium | Treat missing timestamps as incomplete, not pass. |
| Runtime trim breaks tests | Medium | Move in small patches with source-contract coverage. |
| Shader inspection is hard to automate | Medium | Start with captured artifacts and focused assertions. |

## Rollback Plan

Revert this change folder and any gate-specific report/test additions. Runtime behavior must remain unchanged unless a later gate task explicitly edits runtime files.

## Success Criteria

- [ ] Half-res promotion has explicit pass/fail evidence.
- [ ] Noise default remains unchanged unless a candidate wins measured gates.
- [ ] Runtime no longer carries reference/debug-only source where avoidable.
- [ ] Generated shader evidence confirms product loop/pass intent.
- [ ] Review archive has no missing implementation imports.