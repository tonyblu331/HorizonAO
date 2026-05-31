# Tasks: VBAO Edge Confidence Metadata

- [x] Add RED test for confidence-scaled spatial filter weight.
- [x] Add optional confidence field to reference denoise samples.
- [x] Multiply spatial denoise weight by clamped confidence.
- [x] Run targeted Vitest for denoise reference.
- [x] Add RED tests for edge-depth, normal discontinuity, and low-confidence neighborhoods.
- [x] Implement internal edge/confidence metadata helpers.
- [x] Wire metadata into the reference denoise weight without changing public API.
- [x] Add GPU metadata/debug view in the Museum demo.
- [x] Add benchmark collector support for the metadata debug matrix.
- [x] Capture WebGPU screenshots and contact sheet for `edge-depth`, `edge-normal`, and `confidence`.
- [ ] Build a metadata-aware GPU filter candidate after this debug harness.
