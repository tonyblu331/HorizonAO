# Proposal: VBAO Review Reconciliation Roadmap

## Intent

Reconcile the latest pasted north-star review with the current repository state.
The review is useful, but it was written against an older snapshot: several
items it calls missing have already landed, while some remaining items now
belong to existing SDD gates. This change turns the review into an actionable
roadmap without duplicating completed work or bypassing evidence discipline.

## Scope

### In Scope

- Classify review claims as already done, still open, contradicted by current
  spec, or delegated to an existing SDD.
- Define the next milestone around evidence-backed correctness and signal
  quality, not raw line-count reduction.
- Plan documentation/spec work for bilateral constants, deprecated aliases,
  noise/source cleanup, and demo pipeline boundaries.
- Keep kernel formula changes behind the existing
  `vbao-kernel-canonical-drift-triage` fixture gate.

### Out of Scope

- Direct runtime shader edits.
- Production build commands.
- Public temporal, denoise, or reconstruction APIs.
- Reopening completed pass topology decisions without new evidence.

## Approach

Use source-truth reconciliation before implementation. Claims that are already
resolved should be closed in the contrast document. Claims that remain valid
should get a concrete SDD task and a verification gate. Claims that conflict
with the current spec should be routed through the appropriate spec/fixture SDD
instead of becoming direct code changes.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `openspec/changes/vbao-review-reconciliation-roadmap/` | New | SDD plan, contrast, and tasks for review reconciliation. |
| `openspec/changes/vbao-kernel-canonical-drift-triage/` | Referenced | Owns fixture-first slice reduction decisions. |
| `packages/horizon-ao/src/` | Future only | Possible later changes for aliases, phase hoist, constants docs, and source contracts. |
| `apps/demo/src/scenes/` | Future only | Possible later cleanup for remaining Museum-specific pipeline wiring. |
| `EVIDENCE.md` | Future only | Evidence rows if later tasks change runtime behavior or benchmark claims. |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Duplicating existing SDD work | High | Route kernel formula work to `vbao-kernel-canonical-drift-triage` and topology work to completed topology evidence. |
| Treating stale review claims as current bugs | High | Require source/spec evidence for every claim. |
| Refactoring demo code breaks evidence capture | Medium | Separate pure extraction from benchmark behavior changes. |
| Removing deprecated aliases breaks callers prematurely | Medium | Require migration policy before API removal. |

## Success Criteria

- [ ] The pasted review has a current-state contrast table.
- [ ] Completed claims are not re-planned as future work.
- [ ] Open claims have owners, gates, and verification commands.
- [ ] Slice weighting remains gated by non-axis/multi-slice fixtures.
- [ ] No runtime behavior changes land from this reconciliation-only SDD.
