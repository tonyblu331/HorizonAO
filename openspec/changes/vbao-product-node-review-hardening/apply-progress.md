# Apply Progress: VBAO Product Node Review Hardening

## 2026-06-04

Status: planning/audit work started; no runtime behavior changes made by this
SDD pass.

## Completed

- Created the SDD shell:
  - `proposal.md`
  - `sdd-plan.md`
  - `tasks.md`
  - `current-state-contrast.md`
- Added `metaprompt.md` so future work starts from the goal, constraints, and
  verified source/evidence facts.
- Added `specs/vbao-node/spec.md` with executable OpenSpec scenarios for:
  - preset/evidence consistency;
  - evidence-only pass privacy;
  - renderer-state ownership audit before refactor.
- Added `preset-policy-audit.md`.
  - Current classification: all-half-resolution defaults fail the
    release-candidate policy gate because committed evidence still says
    half-resolution product output is not promoted.
- Added `runtime-boundary-audit.md`.
  - `VBAOResolvePolishNode.ts` is private from package exports but imported by
    `MuseumScene.tsx` for evidence-only fused resolve/polish capture.
  - Module-level renderer-state owner files are named for follow-up audit.

## Verification

```sh
git diff --check -- openspec/changes/vbao-product-node-review-hardening
Test-Path openspec/changes/vbao-product-node-review-hardening/specs/vbao-node/spec.md
```

Both checks passed.

Targeted Vitest and typecheck were not run because this pass changed only
OpenSpec planning/audit Markdown files. No production build was run.

## Scope Note

The broader worktree contains unrelated runtime/demo/benchmark changes outside
this SDD folder. This pass only added OpenSpec planning and audit artifacts under
`openspec/changes/vbao-product-node-review-hardening/`.
