# Studio Practice Contrast: AO Signal Strategy

## Purpose

Capture the useful engineering lesson from the studio-practice cards without
turning unverified studio-specific implementation details into project facts.

The cards are directionally valuable: major engines usually do not ask one
small screen-space AO pass to solve every spatial frequency. They separate raw
signal, temporal/spatial filtering, broad-scale occlusion, contact detail, and
product polish. That is the part this SDD should import.

## Verification Boundary

| Card | Verification status | Keep as SDD input | Do not claim |
| --- | --- | --- | --- |
| IO Interactive / Hitman lineage | Weak public verification for the exact AO sample/radius claims. A GDC 2016 Hitman DX12 talk exists, but the currently checked public result does not prove the card's exact AO stack. | Signal-first, filter-second framing. | Exact `2x4` or `3x5` AO sample counts, velocity-reprojection budget, or separate thin-crevice pass. |
| Rockstar / RDR2-GTA lineage | Weak public verification for cascaded AO radii and thickness-specific passes. Public evidence supports RDR2 using screen-space AO, not the exact three-pass/radius model. | Multi-scale AO as an archetype. | Exact three-AO-pass decomposition, radii, or thickness-radius policy. |
| Crytek / CRYENGINE | Stronger support. CRYENGINE SVOGI docs explicitly describe voxel ray tracing, large-scale AO/indirect shadows, AO-only mode, GPU tracing, and known ghosting/noise limits. | Voxel/global representation owns broad occlusion; screen-space AO should be detail/refinement. | CryEngine 6-specific behavior unless separately sourced. |
| Epic / UE5 | Stronger support for Lumen owning large-scale indirect lighting and shadowing. UE docs say Lumen is default GI/reflections, replaces older screen-space GI/DFAO paths, and computes indirect lighting at lower resolution while shading full-res. | Lumen-style architecture: macro occlusion belongs to global scene representation; screen-space/local AO should cover short-range detail. | Exact `4x8x4=128 samples/pixel`, GTAO cost, or one-frame latency model unless sourced from UE renderer code or Epic talks. |

## Sourced Signals

- CRYENGINE SVOGI documentation says the system provides large-scale AO and
  indirect shadows from static geometry, prepares a voxel representation, traces
  on GPU every frame, and has an AO-only mode.
- Unreal Engine Lumen documentation says Lumen is UE5's fully dynamic GI and
  reflection system, replaces SSGI and DFAO, supports sky shadowing/indirect
  shadowing, and computes indirect lighting at much lower resolution for
  real-time performance while shading full-resolution.
- Activision GTAO research remains the best public source for the production
  real-time AO discipline of reference matching, spatial filtering, temporal
  stability, and low-cost half-resolution operation.
- SSILVB/VBAO research supports the project's bitmask identity, but it does not
  remove the need for product-level filtering and multi-frequency evidence.

## Correct Studio-Level Lesson

The correct lesson is not "copy Rockstar" or "copy Lumen." The correct lesson
is:

1. One noisy raw AO pass should not own every frequency band.
2. Broad occlusion needs a stable representation or a separate low-frequency
   pass.
3. Contact detail needs a near-field policy that is not accidentally erased by
   thickness collapse.
4. Temporal/spatial filtering is normal in shipped renderers, but this package
   must keep AO-owned temporal private until motion and disocclusion evidence
   earns promotion.
5. Product claims must be made against screenshots, reference rows, labels, and
   GPU timings, not against studio lore.

## Impact On This SDD

Use the cards as pressure for Phase 3 through Phase 8:

- Phase 3 should classify whether a visible defect is raw stochastic noise,
  phase-tile coherence, near-contact collapse, broad-contact under-occlusion, or
  polish/resolve error.
- Phase 4 should address contact thickness first because it is source-verified
  and directly explains the "thin" complaint.
- Phase 5 can test atlas/sample alternatives only after contact attribution is
  stable.
- Phase 7 may explore metadata, depth hierarchy, or confidence-aware polish as
  internal product-pipeline candidates.
- Phase 8 should describe studio contexts as archetypes unless exact engine
  details have primary-source proof.

## SDD Rule

Do not write "what IO/Rockstar/Crytek/Epic would do" as a literal claim unless
the exact claim has primary-source evidence.

Write "what a production renderer usually does" when the support is general AO
literature or public engine documentation. That is still a strong argument, and
it is cleaner engineering.
