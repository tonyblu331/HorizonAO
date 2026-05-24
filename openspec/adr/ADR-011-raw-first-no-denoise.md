# ADR-011: Raw VBAO First — No Denoise Until Evidence

- **Status:** Accepted
- **Date:** 2026-05-22
- **Related:** ADR-007 (pivot), ADR-008 (AO-only scope), ADR-009 (no legacy).

## Context

The pre-pivot repository shipped a `HorizonAoDenoiseNode` bilateral pass with `lumaPhi` / `depthPhi` / `normalPhi` parameters. The denoise was added without:

- a formula in any spec doc;
- screenshots showing its effect;
- GPU timings justifying the cost;
- a discoverable evidence trail (`artifacts/` is gitignored).

This directly contradicted the README's "Evidence Loop" section, which states every pass must justify itself with screenshots and timings.

VBAO has lower per-pixel variance than GTAO by construction (more information per sample — 32 bits vs. 2 scalars). It is plausible that raw VBAO output is acceptable without any spatial denoise, especially at the `Balanced` and `Quality` tiers. We do not know this until we capture the screenshots.

## Decision

**Raw VBAO ships first. No denoise in v1.**

The TSL kernel writes the cosine-weighted accessibility value directly to the R channel of the output render target. The G channel is reserved for future edge metadata but is not written in v1.

A denoise pass MAY be proposed in a future PR (PR-06 in the implementation order) under the following gates:

1. The proposal includes `EVIDENCE.md` updates showing specific scenes / cameras / configurations where raw VBAO output is visibly insufficient. "Looks noisy" without a screenshot does not qualify.
2. The proposal writes the denoise filter's mathematical formula into a new spec or this spec's successor before any TSL code lands. "Bilateral with lumaPhi / depthPhi / normalPhi" is not a formula.
3. The proposal includes GPU timings for raw VBAO + denoise vs. raw VBAO alone vs. higher-tier raw VBAO, so reviewers can see whether the denoise cost would be better spent on more samples.
4. The denoise pass is its own ADR.

If a future PR adds denoise without satisfying these four gates, this ADR is the basis for rejection.

## Consequences

**Positive:**

- The README's "Evidence Loop" rule is honoured at the architecture level, not just in the docs.
- v1 is smaller: one kernel, one pass, one output texture.
- The "post-VBAO denoise" PR, when it comes, will be defensible from day one because its evidence is the entry condition.

**Negative:**

- Users running VBAO at the `Fast` tier on noisy scenes may see grain that a cheap bilateral would clean up. That is an honest tradeoff documented in EVIDENCE.md (PR-05).
- If raw VBAO at `Quality` is still too noisy, v1 ships with a real visual limitation. Acceptable — the alternative is shipping an unverified denoise pass that hides the actual signal quality.

**Risks:**

- Reviewer pressure to "just add a bilateral, it's free." The gate above is the rebuttal.

## Implementation notes

- The render-target format stays `RedFormat` in v1. If a future denoise PR needs the G channel (edge metadata), that is part of its proposal — v1 does not pre-allocate by writing zeros.
- The current bilateral implementation from `HorizonAoDenoiseNode` is preserved in `packages/horizon-ao/archive/` as a starting point only. Re-using it requires re-justifying it under the four gates above.
- No `denoise: boolean` option appears on `VBAONodeOptions` in v1.
