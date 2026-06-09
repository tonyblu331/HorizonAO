# ADR-015: Release Gap Closure Verdict Remains Incomplete

## Status

Accepted

## Context

The VBAO release gap closure SDD tightened the evidence path:

- required reference fixture coverage is now explicit in the production
  reference gate;
- product promotion reports fail closed when reference observations,
  screenshots, timings, or threshold verdicts are missing;
- private lanes stay `candidate-only`;
- `/lab` and `/museum` render evidence was captured at `1920x1080` and
  `1280x720`;
- generated shader inspection passed for the product preset and explicit
  `spatial-ultra` sample shape.

The capture is useful, but it still does not prove release readiness. The
rendered proxy rows are complete as screenshot/timing evidence, yet all rendered
proxy/reference comparison rows are blocked by missing reference observations.
Threshold rows are still incomplete, and current VBAO product rows retain
`noise` and `edge-bleed` labels.

## Decision

Keep the release readiness verdict as `incomplete`.

Do not update README/package claims to say VBAO is production-ready or proven
better on thin/contact geometry. The docs may say the bitmask representation is
designed for thin geometry, but any release-quality claim must wait for:

1. explicit product reference observations for the required fixture set;
2. threshold rows with material pass/fail decisions;
3. clean-checkout reproducible curated artifacts;
4. no blocking product failure labels.

## Consequences

- `EVIDENCE.md` records the Phase 3 capture as evidence, not promotion.
- `release-readiness-report.md` is the current release gate summary.
- README stays candid: architecture is promising, readiness is incomplete.
- Future work should wire reference observations into production rows before
  tuning thresholds or changing contact/thickness constants.
- Production builds remain outside this SDD unless explicitly requested.
