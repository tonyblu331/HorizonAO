# ADR-012: AO reference demo and benchmark direction

Date: 2026-05-25

## Status

Accepted

## Context

The demo needs a direct visual comparison against the current Three.js WebGPU AO example, plus a debug mode that can show multiple AO implementations as beauty or AO-only output.

Verified references:

- Three.js `GTAONode` is the current WebGPU/TSL AO baseline. It supports `radius`, `thickness`, `distanceFallOff`, `distanceExponent`, `scale`, `samples`, `resolutionScale`, optional temporal filtering with `TRAANode`, and optional manual denoise through `DenoiseNode`.
- The current Three.js `webgpu_postprocessing_ao.html` example uses a Tennyson bust room scene, half-resolution GTAO, packed unsigned-byte normals, velocity, and TRAA. The local benchmark route mirrors the scene layout but keeps temporal filtering off for fair raw/denoised comparisons.
- XeGTAO is archived by Intel as of 2024-04-22. The implementation is a DirectX/HLSL sample with three compute passes: depth prefilter/MIP generation, main AO, and denoise. Treating XeGTAO as a single shader toggle would be technically wrong.
- XeGTAO's public guidance says its spatial denoise is a 5x5 depth-aware filter and relies on TAA when available. It also uses full-resolution defaults, 3 slices, 6 samples per slice, Hilbert/R2 sampling, near-field falloff, and optional thin-occluder compensation.
- AMD FidelityFX CACAO is an optimized adaptive compute AO derived from Intel ASSAO. It is designed around native/downsampled quality presets and compute-friendly adaptive sampling.
- Visibility Bitmask AO/SSILVB replaces horizon angles with a 32-sector visibility mask, enabling fixed-thickness surfaces to let light pass behind thin geometry. This repo's `VBAONode` already follows the AO-only subset with required normals and no falloff heuristic.
- Public Shadertoy/community VBAO references exist, but they are not all production-equivalent. The Unreal forum thread explicitly calls one Three.js/WebGL port flawed because samples are unbalanced and AO-only.

Sources:

- https://threejs.org/docs/pages/GTAONode.html
- https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgpu_postprocessing_ao.html
- https://github.com/GameTechDev/XeGTAO
- https://gpuopen.com/fidelityfx-cacao/
- https://github.com/GPUOpen-Effects/FidelityFX-CACAO
- https://arxiv.org/abs/2301.11376
- https://cdrinmatane.github.io/posts/ssaovb-code/
- https://cybereality.com/screen-space-indirect-lighting-with-visibility-bitmask-improvement-to-gtao-ssao-real-time-ambient-occlusion-algorithm-glsl-shader-implementation/
- https://forums.unrealengine.com/t/ark-kra-vbao-visibility-bitmask-ambient-occlusion/2705204

## Decision

Add `/gtao-reference` as the comparison route before attempting a full XeGTAO or CACAO port.

The route provides:

- A scene based on the Three.js animation keyframes example (`LittlestTokyo.glb`), with its animated GLTF model and camera framing adapted to the WebGPU AO comparison harness.
- A local museum variant with walls, plinths, artifacts, and blockers built from WebGPU-compatible solid geometry. The City and Museum scene roots are toggled inside the same `Scene`, so every AO mode uses the same render graph and render-target split path.
- Off, GTAO, SSAO, VBAO, and N8AO single-view comparison modes.
- Beauty and AO-only views.
- Single and 4-split debug layouts. The 4-split mode is a single fullscreen debug composite over the same camera and scene buffers, showing SSAO, GTAO, VBAO, and N8AO side by side without narrowing the scene camera.
- Optional spatial denoise for GTAO and VBAO using Three.js `DenoiseNode`.
- Live frame-time sampling in the overlay.

## Tradeoffs

- This is a fair visual harness, not a complete XeGTAO/CACAO port.
- Three.js `DenoiseNode` gives us a proven depth/normal-aware spatial denoise quickly. A dedicated VBAO denoiser can still outperform it later if tuned around bitmask-specific edge confidence.
- Headless browser verification falls back to WebGL, so it validates route/UI/canvas loading but not WebGPU shader execution. WebGPU evidence still needs a real browser/GPU capture pass.
- The original WebGL keyframes example uses `Sky`, which is a `ShaderMaterial`. That material is not compatible with this WebGPU/TSL render path, so the harness keeps the animated model/framing but uses compatible background and lighting instead.
- The route is labeled Museum. `/museum` is the canonical route; `/gtao-reference` remains as a compatibility alias for existing browser sessions.
- The Littlest Tokyo ground plane is intentionally removed. It was useful as a shadow/contact receiver, but in this comparison it read as an intrusive plane between the camera and city scene.
- N8AO uses its dedicated `N8AONode` scene pass and docs-aligned screen-space radius configuration. Half-resolution is intentionally disabled for this repo's current `three@0.184.0` because `n8ao-webgpu@0.1.0` targets `three@0.182.x` and its half-res downsample path can fail WebGPU validation.

## Next Steps

- Add GPU timestamp benchmarks on a WebGPU-capable browser session.
- Capture 1920x1080 and 1280x720 evidence for GTAO, VBAO, and N8AO in beauty and AO-only modes.
- If we port XeGTAO, implement it as compute-style passes: depth prefilter/MIPs, AO + edge data, denoise. Do not reduce it to a renamed GTAO preset.
- If we port CACAO, preserve its adaptive preset model and evaluate whether WebGPU compute or TSL display nodes are the better integration point.
