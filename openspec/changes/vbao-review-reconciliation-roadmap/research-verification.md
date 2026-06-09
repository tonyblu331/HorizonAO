# Research Verification: VBAO Review Reconciliation Roadmap

## Verdict

The pasted review should be treated as a stale-but-useful critique, not as an
implementation order. A principal-level response is to preserve the valid
pressure while refusing stale tasks and unproven shader edits.

The current roadmap is therefore correct only if it keeps three boundaries:

1. Completed work stays closed.
2. Formula changes go through fixture evidence.
3. Signal-quality work is measured separately from structural cleanup.

## Sources Checked

Date searched: 2026-06-03.

- Therrien, Levesque, and Gilet, "Screen Space Indirect Lighting with Visibility
  Bitmask", arXiv:2301.11376:
  https://arxiv.org/abs/2301.11376
- Readable ar5iv rendering of the same paper:
  https://ar5iv.labs.arxiv.org/html/2301.11376
- Jimenez et al., "Practical Realtime Strategies for Accurate Indirect
  Occlusion", Activision technical report:
  https://www.activision.com/cdn/research/PracticalRealtimeStrategiesTRfinal.pdf
- Bevy 0.15 release notes:
  https://bevy.org/news/bevy-0-15/
- Bevy 0.14 to 0.15 migration guide:
  https://bevy.org/learn/migration-guides/0-14-to-0-15/
- XeGTAO repository:
  https://github.com/GameTechDev/XeGTAO
- CDRIN implementation notes:
  https://cdrinmatane.github.io/posts/ssaovb-code/

## Local Verification

Source search confirmed:

- `VBAOEffectPass` exists in `packages/horizon-ao/src/VBAOEffectPass.ts`.
- `VBAOResolvePolishNode` exists and extends `VBAOEffectPass`.
- `computeVbaoBilateralGeometryWeight` exists and is imported by cleanup,
  resolve, resolve-polish, and polish passes.
- `sourceResolution` exists on `VBAONode` and is used for noise pixel and safe
  texel calculations.
- `vbaoRawNoisePixel` exists; the stale `vbaoPixel` claim no longer applies.
- `VBAO_NOISE_SOURCE_CANDIDATES` was not found in active runtime sampling.
- `preset`, `scale`, and `intensity` remain in `VBAONodeOptions` as deprecated
  public aliases.
- Production slice accumulation now uses projected-normal weighting after the
  kernel triage fixture gate:
  `weightedAccessibility.addAssign(sliceAccessibility.mul(NprojLen))` and
  `weightSum.addAssign(NprojLen)`.
- `sampleNoisePhase(i, j)` remains inside the sample loop.

## Research Findings

### Visibility Bitmask Core

SSILVB replaces two horizon angles with a visibility bitmask over sectors in a
hemisphere slice and motivates this specifically around finite-thickness thin
geometry. Bevy's adoption of VBAO reinforces this direction: Bevy replaced its
old GTAO path with visibility bitmasks and added `constant_object_thickness`.

Decision: do not reopen the VBAO pivot. The product direction is valid.

### Thickness

SSILVB explicitly says single-layer depth cannot know real object thickness and
therefore relies on a small constant value, optionally distance-scaled. The
repo's `sampleDist * 0.85` cap is not directly research-derived; it is a local
production heuristic.

Decision: the cap may stay only as a named, tested policy. It should not remain
anonymous tuning.

### x² / Exponential Sample Placement

SSILVB notes that low sample density loses small-object detail and describes
distributing samples exponentially around the shaded pixel because nearby
surfaces tend to matter more.

Decision: the repo's x² near-biased spacing is defensible. The risk is not the
spacing itself; the risk is comparing it against a uniform-step reference
without saying so.

### Slice Weighting

GTAO's technical report is unambiguous that projected normal magnitude appears
in the outer integral after projecting the normal into the slice plane. That is
the strongest support for the pasted review's cosine/projection weighting
concern.

However, this repo originally specified CDF-remapped cosine-measure sectors and
uniform slice averaging. That contract could not be changed from research
citation alone because this is no longer plain GTAO horizon integration.

Decision: keep slice weighting under `vbao-kernel-canonical-drift-triage`. The
required multi-slice/non-axis fixture now fails the old uniform contract at
warning level, so runtime moved to projected-normal weighted slice accumulation
with raw-kernel evidence.

### Temporal And Denoise

GTAO/XeGTAO and Bevy both normalize temporal/spatial filtering as production
techniques. That does not mean this package should expose public temporal or
denoise APIs. This package is a node-level WebGPU/TSL integration, not a full
renderer with motion vectors, history ownership, and disocclusion policy.

Decision: temporal promotion remains rejected here. Denoise/public filter knobs
remain out of scope. Evidence can justify internal reconstruction changes, not
API expansion by default.

## Principal Decisions

| Decision | Rationale | Owner |
| --- | --- | --- |
| Close stale missing-refactor claims. | The code already contains the claimed missing pieces. Re-planning them would waste review bandwidth. | This reconciliation SDD. |
| Change slice formula only after fixture proof. | GTAO supports projected-normal weighting; the repo changed runtime only after a multi-slice/non-axis fixture failed the old uniform contract. | `vbao-kernel-canonical-drift-triage`. |
| Specify bilateral constants before tuning. | Current helper made duplication better but did not make the math explainable. | This roadmap, Phase 3. |
| Treat phase hoist as performance-only. | It must not change stochastic thin-sector behavior. | This roadmap, Phase 4. |
| Define alias migration before deletion. | Public compatibility debt is real, but abrupt removal is not architecture. | This roadmap, Phase 5. |
| Keep temporal/denoise APIs closed. | Existing evidence and package ownership boundaries do not justify public expansion. | Existing temporal/evidence SDDs. |

## Required Next Action

The next real engineering task is not another broad review. It is one of:

- capture product-stage reconstruction evidence for the projected-normal
  candidate; or
- open a separate evidence SDD for bilateral tuning after the current constants
  are now named and pinned.

Everything else is lower leverage until those are handled.
