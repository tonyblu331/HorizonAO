# Proposal: VBAO Kernel Canonical Drift Triage

## Intent

Convert the latest kernel review into falsifiable SDD gates before changing the
production VBAO kernel. The review identifies plausible correctness and
performance gaps, but several claims conflict with current source contracts or
have already been addressed by earlier topology work. This change separates
verified gaps from already-closed work and speculative tuning.

## Scope

### In Scope

- Triage pasted review claims against current source, specs, ADRs, and tests.
- Add missing drift fixtures for non-axis-aligned normals before considering
  slice weighting changes.
- Document and test the empirical `0.85` thickness cap.
- Evaluate x² radial spacing against reference expectations.
- Inspect per-sample phase atlas work for a safe hoist opportunity.
- Keep generated shader/source-contract coverage tied to every accepted change.

### Out of Scope

- Public temporal AO, denoise controls, bent AO, or indirect-light extensions.
- Production build commands unless explicitly requested.
- Pass fusion or half-resolution promotion already covered by existing SDDs.
- Replacing the current uniform slice average without a failing fixture.

## Approach

Start with source-truth and fixture coverage, not implementation. The current
spec intentionally uses uniform slice averaging after cosine-measure
sectorization. Any move toward projected-normal slice weighting must first prove
that the current contract fails a non-axis-aligned fixture and must update the
spec/ADR before runtime code changes.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `packages/horizon-ao/src/VBAONode.ts` | Modified if gates fail | Possible kernel changes for weighting, sampling, thickness, or phase hoist. |
| `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` | Modified | Source contracts for accepted kernel decisions. |
| `packages/horizon-ao/reference/*` | Modified | Drift fixtures and reference comparisons. |
| `openspec/specs/vbao-node/spec.md` | Modified if contract changes | Kernel contract updates only after evidence. |
| `EVIDENCE.md` | Modified | Records triage verdicts, captures, and gate outcomes. |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Review claim contradicts current spec | High | Treat contradiction as a RED contract decision, not a code edit. |
| Kernel tuning improves one fixture and regresses product captures | Medium | Require fixture and screenshot/timing evidence before promotion. |
| Phase hoist changes stochastic decorrelation | Medium | Compare generated shader shape and evidence labels before accepting. |

## Success Criteria

- [ ] Every pasted review claim is classified as accepted, already done, rejected,
      or deferred with source evidence.
- [ ] Non-axis-aligned drift fixtures exist before any slice weighting change.
- [ ] Thickness cap behavior is either justified in spec/ADR or queued for a
      measured replacement.
- [ ] x² spacing remains only if reference/product evidence agrees with the
      current contract.
- [ ] Any accepted kernel optimization has tests, generated shader inspection,
      screenshots, and GPU timing evidence.
