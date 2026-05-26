# Tasks: VBAO Depth Prefilter Experiment

## Phase 1: Reference RED/GREEN

- [x] 1.1 Add proposal/design/spec artifacts for an internal-only experiment.
- [x] 1.2 Add RED tests for representative-depth selection.
- [x] 1.3 Implement the minimal representative-depth helper.
- [x] 1.4 Keep the helper deterministic and history-free.

## Phase 2: Contract And Design

- [x] 2.1 Add source/docs contract tests proving no public API changes.
- [x] 2.2 Record the TSL render-target vs WebGPU compute decision.
- [x] 2.3 Define the benchmark-only prefilter label schema.

## Phase 3: Harness Experiment

- [x] 3.1 Add internal benchmark label for baseline vs prefilter.
- [ ] 3.2 Prototype depth prefilter behind the internal harness only.
- [ ] 3.3 Capture baseline vs prefilter radius-stress rows.
- [ ] 3.4 Accept/reject in `EVIDENCE.md`.
