# Proposal: VBAO Release Gap Closure

## Summary

Close the remaining gap between a strong VBAO core and a defensible release
candidate. The work turns the current blockers into falsifiable gates:
reference truth, quality promotion, and release-path cleanliness.

## Motivation

Current evidence shows a real product-shaped `VBAONode`, but it also says the
hard parts are not fully proven yet. Rendered thin-gap screenshots are proxy
evidence, temporal and compute candidates are private/rejected, and several
benchmark lanes exist beside the default product path. A release claim needs
proof, not volume.

## Goals

- Add missing ray-cast/product observations for thin-gap and contact cases.
- Define a product promotion matrix across reference rows, screenshot metrics,
  failure labels, and GPU timings.
- Ground every release gate in verified source pressure from SSILVB/VBAO,
  GTAO, CACAO, Three.js TSL/WebGPU, N8AO, and local tests/evidence.
- Keep experimental lanes private and make the default release path boring,
  reproducible, and documented.
- Update `EVIDENCE.md` only with rows that distinguish pass, fail,
  incomplete, skipped, and derived states.

## Non-Goals

- No public temporal AO API.
- No public denoise/reconstruction nodes.
- No sector-count, atlas, edge-metadata, or compute options in
  `VBAONodeOptions`.
- No production build unless explicitly requested.

## Success Criteria

- `research-ledger.md` records the source-backed reason for every major gate.
- Missing reference observations block release instead of being hidden by
  screenshots.
- VBAO product rows can be judged against GTAO/N8AO/reference rows with named
  thresholds.
- Experimental benchmark lanes cannot be mistaken for default product evidence.
- The final release-readiness verdict is reproducible from tracked artifacts or
  explicitly marked incomplete.
