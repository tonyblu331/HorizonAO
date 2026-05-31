# Tasks: VBAO Mask Coverage / Popcount Metadata

## Phase 1: Contracts

- [x] Add tests that the metadata-aware filter gate is rejected from promotion.
- [x] Add source contracts for internal mask coverage/popcount metadata.
- [x] Prove no public `VBAONodeOptions` or package exports are added.
- [x] Add revised roadmap with architecture, ratings, and stop conditions.

## Phase 2: GPU Metadata Channel

- [x] Design an internal output channel for `maskCoverage` and `maskPopcount`.
- [x] Wire demo-only debug views for mask coverage and mask popcount.
- [x] Keep existing edge-depth / edge-normal / confidence views.
- [x] Add demo-only `paper-popcount` debug view for SSILVB-style normal-shift
  popcount comparison.

## Phase 3: Filter v2

- [ ] Add a second metadata-aware candidate that consumes mask metadata.
- [ ] Reject saturated/unstable mask taps before blending.
- [ ] Keep the filter spatial-only.

## Phase 4: Evidence

- [ ] Capture raw VBAO, metadata-aware v1, mask-aware v2, GTAO, and N8AO.
- [x] Review actual raw VBAO and paper-popcount screenshots and assign failure
  labels.
- [x] Update `EVIDENCE.md`.
- [ ] No production build.
