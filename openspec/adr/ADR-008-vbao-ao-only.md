# ADR-008: VBAONode v1 Is AO-Only

- **Status:** Accepted
- **Date:** 2026-05-22
- **Related:** ADR-007 (pivot), ADR-011 (raw first / no denoise).

## Context

The Visibility-Bitmask paper (Therrien et al., arXiv:2301.11376) presents an algorithm whose visibility mask is reusable for:

- ambient occlusion (the AO part — scalar accessibility output);
- bent normals (centroid of the unoccluded sector subset);
- one-bounce indirect diffuse (SSILVB — shade each unoccluded sector and weight);
- a step toward indirect specular via bent cones.

Each of these is a distinct contribution with its own integration shape, output format, validation surface, and review burden. Bundling them inflates the PR and the spec, dilutes the headline claim, and creates a moving target during evidence capture.

## Decision

`VBAONode` v1 ships **scalar ambient-occlusion accessibility only**.

The following are explicitly out of scope for v1 and require their own ADR, spec, and proposal before any code lands:

- Bent normals — the mask-centroid direction recovery is well-defined but needs a separate output node, IBL coupling story, and validation. Future ADR.
- Indirect diffuse / SSILVB — separate node, separate proposal, separate render-target format. Future change.
- Bent cones / specular coupling — depends on bent normals. Future change.
- Ray-traced AO comparison or hybrid SS+RT path — not in this repo.
- Neural denoise. Out.
- ReSTIR temporal reuse. Out.

## Consequences

**Positive:**

- One headline claim per PR: "TSL/WebGPU VBAO with cosine-weighted reduction, thin-geometry-correct, AA-agnostic."
- EVIDENCE.md compares one output format (scalar R channel) against one baseline (`GTAONode`).
- The capability spec stays under one page of requirements.

**Negative:**

- Repository looks "smaller" than the underlying algorithm allows.
- Downstream consumers wanting bent normals must wait for the follow-up.

**Risks:**

- Pressure to add bent normals "just for IBL coupling" during PR review. The ADR is the line; if the bent-normal claim leaks into v1, this ADR is the place to reverse it explicitly.

## Implementation notes

The render-target format is `RedFormat` (single channel) for v1. The green channel is reserved for PR-06 edge metadata (denoise) but not written to in v1. A future bent-normal PR will require either a new render target or a re-packing of channels — not retroactively fitting bent normals into the v1 target.
