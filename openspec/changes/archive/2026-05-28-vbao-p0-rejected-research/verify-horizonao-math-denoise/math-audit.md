# Math Audit: HorizonAO Raw Kernel And Spatial Denoise

## AO Contract

Ambient occlusion accessibility is:

```text
A(p) = 1 / pi integral_Omega V(p, w) max(0, n dot w) dw
O(p) = 1 - A(p)
```

Current HorizonAO stores an accessibility-like scalar, where `1` means fully accessible and `0` means fully dark. The debug/composite path multiplies scene color by this scalar. Calling the internal accumulator "occlusion" is imprecise; the returned value behaves as accessibility.

## Reference Alignment

| Topic                      | Reference                                 | HorizonAO status         |
| -------------------------- | ----------------------------------------- | ------------------------ |
| AO-first scalar output     | Three `GTAONode`, XeGTAO, CACAO           | Aligned                  |
| Inputs                     | Depth, normal optional, camera/projection | Aligned                  |
| Normal fallback            | Three `GTAONode`, CACAO                   | Aligned                  |
| Horizon slices             | Activision GTAO, Three `GTAONode`         | Approximation aligned    |
| Per-pixel rotation         | Three `GTAONode`, XeGTAO spirit           | Added in this change     |
| Spatial denoise            | Three `DenoiseNode`, XeGTAO, CACAO        | Added in this change     |
| Temporal                   | Three optional, XeGTAO optional TAA       | Deferred                 |
| Stereo-aware adaptive SSAO | Wu 2025                                   | Deferred future research |

## Checked Math Pieces

- Slice count and sample count now split with deterministic ceil behavior.
- Sample radius is center-biased with exponent `1.35`, matching the previous shader policy and now covered by unit tests.
- Falloff weight is explicitly `mix(1, 2 / (step + 2), falloff)`.
- No-occluder resolve should remain fully accessible when accumulated slice visibility equals slice count.
- Thickness remains a heuristic screen-space rejection rule, not a paper-derived physical visibility test.
- Intensity remains a post-resolve power curve, not the strict `O = 1 - A` transform.

## Current Corrections

- Added deterministic magic-square noise indices for sample rotation.
- Added shader-side per-pixel slice rotation and radius jitter comparable in spirit to Three `GTAONode`.
- Added a separate scalar denoise target after raw AO.
- Added `denoised-ao` as a rendered debug view.

## Known Non-Proofs

- This is not a ground-truth validation.
- No benchmark numbers are produced by this audit.
- WebGPU validation is not proven when the browser reports WebGL2 fallback.
- Denoise quality still needs screenshot review on failure cases: silhouettes, thin geometry, contact shadows, large flat walls, and high-frequency depth.
