# Tasks: VBAO Sampling Backtest

## Phase 1: Reference Sampling

- [x] 1.1 Add a sampling schedule type to the scalar reference layer.
- [x] 1.2 Add RED tests for deterministic output with no frame/time input.
- [x] 1.3 Add tests for valid sector/slice distribution.

## Phase 2: Candidate Schedules

- [x] 2.1 Implement current magic-square reference schedule.
- [x] 2.2 Implement deterministic R2 schedule.
- [x] 2.3 Implement Hilbert-style deterministic schedule.
- [x] 2.4 Implement blue-noise-like deterministic schedule only if it can be static and non-temporal.

## Phase 3: Benchmark Integration

- [x] 3.1 Add benchmark labels for sampling schedules without exposing public API.
- [x] 3.2 Wire benchmark-only schedule switching into the actual VBAONode shader path.
- [x] 3.3 Record single-mode 1920x1080 and 1280x720 rows.
- [x] 3.4 Record split-composer comparison rows.
- [x] 3.5 Choose or reject a production schedule from evidence.
