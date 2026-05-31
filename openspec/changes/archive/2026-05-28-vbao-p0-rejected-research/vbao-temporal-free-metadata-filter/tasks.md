# Tasks: VBAO Temporal-Free Metadata-Aware Filter

## Phase 1: RED Contracts

- [x] Add source-contract tests for demo-only `metadata-aware` filter wiring.
- [x] Add source-contract tests proving no public `VBAONodeOptions` or package
      export changes.
- [x] Add source-contract tests requiring edge-depth, edge-normal, confidence,
      accepted/rejected tap accounting, and no temporal/history terms.

## Phase 2: GPU Candidate

- [x] Add `metadata-aware` to the internal Museum spatial-filter union.
- [x] Implement a spatial-only metadata-aware VBAO filter candidate.
- [x] Wire single and compose rendering paths.
- [x] Wire benchmark collector matrix support.
- [x] Wire targeted Museum E2E reporting.

## Phase 3: Evidence

- [x] Run package Vitest.
- [x] Run package and demo `tsc --noEmit`.
- [x] Run targeted Playwright route coverage.
- [x] Run WebGPU benchmark matrix with screenshots for raw/generic/custom/
      metadata-aware/GTAO/N8AO rows.
- [x] Update `EVIDENCE.md`.
- [x] No production build.

## Phase 4: Decision

- [x] Review screenshots and failure labels.
- [x] Accept/reject `metadata-aware` as internal candidate only.
- [x] If it fails, plan GPU-visible mask coverage/popcount metadata.
