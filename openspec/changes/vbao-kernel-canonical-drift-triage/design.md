# Design: VBAO Kernel Canonical Drift Triage

## Technical Approach

Use a claim ledger before writing runtime code:

```text
pasted review claim -> source/spec check -> fixture need -> RED gate -> code only if gate fails
```

This keeps the SDD honest. The current production contract is selected GT-VBAO
corrections, not full canonical GT-VBAO. A review can identify a real gap, but a
gap becomes product work only when a source contract or fixture proves the
current behavior is wrong for the project target.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
| --- | --- | --- | --- |
| Slice reduction | Keep uniform average until a fixture fails | Directly apply cosine-weighted slice weighting | Current spec says mask bits already represent cosine-measure chunks; changing this without proof risks double weighting. |
| Bilateral helper | Treat as already addressed | Re-extract duplicated bilateral code | `computeVbaoBilateralGeometryWeight` already exists and is used by cleanup, resolve, resolve-polish, and polish. |
| Thickness cap | Document and test before tuning | Leave `0.85` as unexplained magic | The cap is load-bearing and appears in source contracts. |
| Radial spacing | Compare x² against evidence | Assume uniform reference means production is wrong | Near-biased spacing is an intentional product contract today. |
| Phase atlas work | Hoist only if decorrelation remains intact | Move phase math blindly | The atlas phase is part of the stochastic thin-sector behavior. |

## Claim Ledger

| Review claim | Current evidence | SDD verdict |
| --- | --- | --- |
| Bilateral formula is duplicated | `vbaoBilateralWeight.ts` exists and tests require all pass call sites to use it. | Already done. |
| Kernel uses uniform slice averaging | `VBAONode.ts` uses `weightSum += 1`; spec requires uniform average after CDF remapping. | Accept as triage target, not immediate fix. |
| Existing drift fixtures miss grazing normals | Source search shows source tests protect against cosine-weighted production code; reference has cosine helper tests. | Accept: add non-axis-aligned fixtures first. |
| x² radial spacing may compress radius | `vbaoSampling.ts` returns `t * t`; spec requires x² spacing. | Accept: evaluate against fixture evidence before changing. |
| `0.85` thickness cap is empirical | Source and tests pin `sampleDist * 0.85`; spec does not explain the constant. | Accept: document or replace through evidence. |
| Per-sample phase atlas math may be hoistable | `sampleNoisePhase(i, j)` is called inside the sample loop. | Accept as optimization spike with generated shader/evidence gate. |
| Internal temporal should promote | Existing temporal gate rejects promotion. | Rejected for this SDD. |
| Resolve/polish should be fused | Existing topology SDD already measured and rejected broad fusion by default. | Deferred outside this SDD. |

## Testing Strategy

| Layer | What to Test | Approach |
| --- | --- | --- |
| Source contracts | Current kernel commitments and rejected premature changes | Vitest source tests. |
| Reference fixtures | Non-axis-aligned normals and grazing slices | Extend canonical/reference drift tests. |
| Evidence | Product visual labels and GPU timing | Existing demo capture scripts and `EVIDENCE.md`. |
| Generated shader | Loop shape and phase atlas behavior | Existing generated shader inspection path where applicable. |

## Rollout

1. Add the claim ledger and RED tests for missing non-axis-aligned fixture
   coverage.
2. Fill reference/product observations for those fixtures.
3. Decide whether slice weighting is a spec correction, a rejected double-weight,
   or a deferred research option.
4. Document the thickness cap and x² spacing outcomes.
5. Attempt phase-hoist only after correctness gates are stable.

## Open Questions

- Does a grazing-normal fixture show a real uniform-slice error after
  cosine-measure sectorization?
- Is the `0.85` thickness cap the smallest stable clamp, or only a historical
  artifact?
- Does x² spacing improve near-contact stability enough to justify the reference
  mismatch?
