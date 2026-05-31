# Tasks: VBAO Denoise Evidence Gate

## Phase 0: Verifier Hardening

- [x] 0.1 Add a split-composer smoke that fails when any selected segment is black or missing.
- [x] 0.2 Extend benchmark capture to include raw/denoised and beauty/AO mode rows.
- [x] 0.3 Record social/Shadertoy/forum claims only as hypotheses in the proof ledger.

## Phase 1: Evidence Capture

- [x] 1.1 Capture raw adaptive VBAO at 1920x1080 and 1280x720.
- [x] 1.2 Label failure modes explicitly in `EVIDENCE.md`.
- [x] 1.3 Compare raw higher-sample VBAO before proposing a filter.
- [x] 1.4 Compare magic-square, R2, Hilbert-style, and blue-noise-like sampling before blaming denoise. Screenshot/timing rows are captured and labelled in `EVIDENCE.md`.

## Phase 2: Spatial Filter Prototype

- [x] 2.1 Add reference-only depth/normal bilateral formula.
- [x] 2.2 Add tests proving background and normal edges stop filtering.
- [x] 2.3 Add tests proving deterministic output with no frame index or history input.
- [x] 2.4 Prototype demo-only filter without public API.

## Phase 3: Gate Decision

- [x] 3.1 Benchmark raw higher samples vs raw+denoise.
- [x] 3.2 Reject filters that create `edge-bleed`, `halo`, `mud`, or close `thin-gap`.
- [x] 3.3 Reject filters that reduce `noise` by adding `mud`.
- [x] 3.4 Only promote if median/p95 and screenshots support it.
