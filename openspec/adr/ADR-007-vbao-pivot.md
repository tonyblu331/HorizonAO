# ADR-007: VBAO Pivot — Visibility-Bitmask Replaces Signed-Horizon Kernel

- **Status:** Accepted
- **Date:** 2026-05-22
- **Supersedes:** the implicit ADR-002 "signed-horizon kernel" inlined in `openspec/archive/horizonao-final-spec.md`.
- **Related:** ADR-008 (AO-only scope), ADR-009 (no legacy), ADR-010 (normal required), ADR-011 (raw first).

## Context

The previous `HorizonAoNode` implemented a GTAO-class signed-horizon kernel (Jimenez et al., SIGGRAPH 2016). Three.js's existing `GTAONode` already covers that algorithm class. Polishing it (renaming uniforms to match `GTAONode`, writing a normalisation formula, capturing denoise evidence) was the prior plan's "moves #1–#3" — defensible but uninteresting upstream, because there is no novelty.

The 2023 Visibility-Bitmask method (Therrien et al., arXiv:2301.11376) replaces the dual-scalar horizon `(h+, h-)` with an N-bit mask over uniformly distributed sectors of the slice hemisphere. It:

- handles thin geometry correctly by encoding occluder thickness as a bit range, not a heuristic threshold;
- eliminates the empirical `distanceFallOff` and `distanceExponent` weights GTAO needs;
- doubles as the building block for one-bounce indirect diffuse (SSILVB) in a separate node.

No TSL/WebGPU implementation has been published. This is the only post-GTAO step the field has actually taken since 2016 in screen-space AO.

Production references:
- ARK.KRA VBAO for Unreal: ~0.6 ms/1080p vs UE5 GTAO ~3 ms with strictly better thin-geometry output.
- `cdrinmatane/posts/ssaovb-code/` published a GLSL reference (32-sector u32 mask, popcount reduction).

Three.js TSL ships everything needed: `countOneBits()` (native WGSL on WebGPU, parallel-popcount GLSL emulation on WebGL2), `bitOr` / `bitAnd` / `shiftLeft` / `shiftRight` operators, and `uint` / `uvec*` types.

## Decision

Pivot the project's AO kernel from signed-horizon to Visibility-Bitmask. Source-level public node becomes `VBAONode`. The signed-horizon implementation is removed from active source and preserved as historical context in `packages/horizon-ao/archive/` and `openspec/archive/`.

Rename scope: **R1 source-only.** Git repo path (`G:\RWY37\horizon-ao`), GitHub remote URL, and npm package scope are unchanged. README adds a one-paragraph "repository name is historical" note. A future infra PR may rename the repo (R2); not in this change.

Reduction: cosine-weighted is the production formula:
`A_i = Σ_k open(k) · max(0, cos(θ_k − γ_i_norm)) / Σ_k max(0, cos(θ_k − γ_i_norm))`.
Popcount-only `A_i = 1 − countOneBits(M_i) / 32` lives in `vbaoReference.ts` as an ablation baseline.

## Consequences

**Positive:**

- Real upstream contribution to Three.js — the first TSL/WebGPU VBAO node.
- Eliminates `distanceFallOff` / `distanceExponent` heuristics. Smaller, more honest public API.
- Thin-geometry correctness (the headline claim) is structural, not tuned.
- Cosine-weighted reduction matches the GTAO radiometric framing the paper inherits.

**Negative:**

- All existing signed-horizon code, tests, and openspec docs are archived; nothing in active source survives the pivot.
- WebGL2 backend uses emulated popcount (~12 ALU ops). Functional but not the perf target.
- Bent normals are deferred; downstream IBL coupling is not improved in v1.

**Risks:**

- Cosine-weighted weight table evaluation per pixel is ~32 cos + 32 max per slice. Trivial vs. depth taps but worth measuring once the kernel ships.
- The mirrored-side / count-clamped maskRange invariants must agree byte-for-byte between `vbaoReference.ts` and the TSL kernel. Parity test catches divergence but only if its 5+ fixed configs cover the edge bits.

## Alternatives considered

1. **Polish the signed-horizon kernel ("modest pivot").** Land a contract-aligned GTAONode sibling first, propose VBAO later. Rejected: no novelty in v1, upstream maintainers will ask "what about VBAO?" and we have no answer.
2. **Skip AO, jump to SSILVB indirect diffuse.** Bigger contribution but bigger scope; would land slower and the AO node is a useful building block for SSILVB anyway. Deferred.
3. **Keep `HorizonAoNode` as `@deprecated` alongside `VBAONode`.** Rejected: pre-1.0, no downstream users. Dual-kernel package is confusing for no benefit.

## References

- Therrien, O., Levesque, Y., Gilet, G. *Screen Space Indirect Lighting with Visibility Bitmask*. arXiv:2301.11376, 2023.
- cdrinmatane. *SSAO using Visibility Bitmasks*. https://cdrinmatane.github.io/posts/ssaovb-code/
- Jimenez, J. et al. *Practical Real-Time Strategies for Accurate Indirect Occlusion*. SIGGRAPH 2016.
- Three.js. `GTAONode.js` reference implementation in `examples/jsm/tsl/display/`.
