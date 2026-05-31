# Tasks: VBAO Production-Readiness Audit + Temporal-Free Roadmap

- [x] Add RED tests for paper/GLSL normal shift, horizon interval, thickness,
      and popcount-vs-cosine comparison.
- [x] Add paper/GLSL scalar reference helper.
- [x] Add RED tests for safe footprint-selected depth-MIP candidate behavior.
- [x] Add metadata-guarded depth-MIP candidate resolver.
- [x] Add RED test for temporal-free edge-aware filter report.
- [x] Add temporal-free spatial-filter report helper with accepted/rejected
      neighbor counts.
- [x] Update `EVIDENCE.md` with candid production-readiness status.
- [x] Add OpenSpec artifacts for the audit roadmap.
- [x] Implement the fixed-fixture WebGPU readback parity contract against scalar
      fixtures.
- [x] Run the WebGPU readback parity E2E successfully on hardware and record the
      result.
- [ ] Capture candidate GPU screenshots/timings before any promotion.
- [ ] Decide whether the live shader should move toward the paper popcount path,
      keep the cosine-weighted path, or support a measured internal comparison
      variant.
