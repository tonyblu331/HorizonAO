# VBAONode Spec Delta: Sampling Backtest

## ADDED Requirements

### Requirement: Sampling Schedules Are Deterministic

Sampling schedule candidates SHALL be deterministic functions of pixel/sample/slice coordinates and SHALL NOT depend on frame index, time, history buffers, or TAA jitter.

#### Scenario: Same inputs produce same schedule

- **GIVEN** the same pixel coordinate, slice index, sample index, viewport, and schedule name
- **WHEN** the reference schedule is evaluated twice
- **THEN** it SHALL return the same rotation/sample value both times

#### Scenario: No temporal input

- **GIVEN** a sampling schedule candidate
- **WHEN** its public reference function signature is reviewed
- **THEN** it SHALL NOT accept frame index, elapsed time, history sample count, or jitter phase

#### Scenario: Thin-gap behavior is preserved

- **GIVEN** a known thin-gap reference scene
- **WHEN** a candidate schedule is compared with the current schedule
- **THEN** it SHALL NOT close the gap or inflate the adaptive thickness estimate beyond the scalar reference tolerance
