# ADR-007: VBAO Pivot — Visibility-Bitmask Production Cleanup

- **Status:** Accepted
- **Date:** 2026-05-22
- **Updated:** 2026-05-27
- **Supersedes:** the implicit ADR-002 signed-horizon kernel and the interim hybrid VBAO research-gate shape.
- **Related:** ADR-008 (AO-only scope), ADR-009 (no legacy), ADR-010 (normal required), ADR-011 (raw first).

## Context

The project pivoted from the old signed-horizon `HorizonAoNode` to `VBAONode`, but the active source accumulated original SSILVB/VBAO ideas, GT-VBAO ideas, cosine-weighted reduction, adaptive-thickness scans, parity harnesses, and diagnostic decision gates. That hybrid made the implementation hard to reason about and biased the production package toward research machinery.

Current community GT-VBAO work keeps the visibility-bitmask foundation but fixes important production details: axial slice directions for two-sided marching, slice-local sample distribution / CDF remapping, point-sample sector treatment, perspective-correct sample-local thickness direction, and a coherent cosine-weighted resolve.

## Decision

`VBAONode` production is now **one visibility-bitmask AO product node with selected GT-VBAO corrections**, with raw AO reconstructed through lazy internal cleanup/resolve/polish stages when the configured quality shape needs them. It remains visibility-bitmask AO with selected GT-VBAO corrections, but the public product boundary is stricter. Extra smoothing is controlled by `softness`; cleanup/resolve/polish are not public peer products, not original uniform-angle popcount-only VBAO, and not the previous hybrid. The production package source is consolidated around:

- `VBAONode.ts` — TSL/WebGPU node and production shader path.
- `VBAOResolveNode.ts` — internal JBU4 resolve/upsample from low-resolution raw AO.
- `VBAOHalfResCleanupNode.ts` — internal 3x3 edge-aware raw-AO cleanup before low-resolution resolve.
- `VBAOFullResPolishNode.ts` — internal 8-tap rotated full-resolution polish.
- `vbaoConstants.ts` — public constants/options.
- `vbaoSampling.ts` — one deterministic non-temporal phase-atlas sampling scheme with x² radial spacing and stochastic sub-sector thresholds.
- `vbaoGtVbaoMath.ts` — scalar visibility/GT-correction reference helpers for tests.
- `index.ts` — stable public API exports: `VBAONode`, `vbao`, and public option types.

The production shader uses:

1. `π` axial slice spacing with two-sided marching.
2. Sample-local thickness direction: `Q - thickness * normalize(-Q)`.
3. Slice-local CDF remap before sector quantization.
4. Point-sample sector mask construction.
5. Normal-centered, no-atan cosine-measure sectorization with popcount accessibility reduction and a uniform slice average. The projected normal frames the sector CDF; it is not a second slice-weighting reduction.

Sampling is intentionally single-scheme in production: no benchmark schedule injection, no runtime sampling-mode switch, and no animated temporal dependency by default. The raw shader uses a non-interpolated phase-indexed atlas so slice rotation, radial jitter, sub-sector coverage, and polish rotation do not all derive from one scalar pixel value.

`VBAONode` is the public product boundary for spatial reconstruction. `VBAONode.getTextureNode()` returns final product AO; `VBAONode.getRawTextureNode()` exposes raw AO for debug/readback only. When `resolutionScale < 0.99`, `VBAONode` lazily allocates low-resolution cleanup only when `softness > 0`, then JBU4 resolve. When `resolutionScale >= 0.99`, it bypasses JBU entirely. When `softness > 0`, it lazily allocates full-resolution polish. The resolve/cleanup/polish stages use current depth/normal/camera inputs and must not require history buffers, frame indices, reprojection, or TAA. TAA can cooperate downstream; it does not define this package's core contract.

Uniform-angle popcount-only reduction remains diagnostic/reference math in `vbaoGtVbaoMath.ts`; it is not the production resolve.

Research gates and historical diagnostics are removed from `@horizonao/core` active source. Demo parity machinery is no longer allowed to define package architecture.

## Consequences

**Positive:**

- The active package source now has one algorithmic story.
- The public API is now product-output first: `getTextureNode()` returns final AO, while `getRawTextureNode()` keeps raw access explicit for debug/readback; reconstruction passes are internal and lazily elided instead of public peer nodes.
- The `2π`/two-sided slice duplication bug is eliminated.
- The O(samples²) adaptive-thickness scan is removed from the production shader.
- Resolve/upscale has a production boundary without bloating the raw AO kernel.

**Negative:**

- Historical parity/decision-gate tests are deleted or archived instead of kept as active package tests.
- Demo parity evidence must be rebuilt around the visibility-bitmask production kernel if future GPU readback gates are needed.
- `VBAOResolveNode` is now pure JBU4 over a half-float raw AO target; cleanup/polish remain separate internal passes so hidden axis-aligned blur cannot sneak into resolve again.

**Risks:**

- GT-VBAO CDF framing, no-atan point-sample sector treatment, and uniform slice averaging require visual/evidence follow-up on real scenes.
- The simplified production path intentionally drops diagnostic hooks; debugging future regressions should happen through separate debug variants, not production shader branches.

## References

- Therrien, O., Levesque, Y., Gilet, G. *Screen Space Indirect Lighting with Visibility Bitmask*. arXiv:2301.11376, 2023.
- cdrinmatane. *SSAO using Visibility Bitmasks*. https://cdrinmatane.github.io/posts/ssaovb-code/
- Bevy issue #19713, SSAO/VBAO Improvements, GT-VBAO notes.
- Three.js `GTAONode.js` reference integration shape.
