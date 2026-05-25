# VBAONode Spec Delta: Adaptive Thickness TSL Port

## ADDED Requirements

### Requirement: Adaptive Thickness Is Internal Shader Behavior

`VBAONode` SHALL estimate blocker thickness per sample from same-surface continuity along the marched slice side and SHALL NOT add a public adaptive-thickness option.

#### Scenario: Public option surface does not grow

- **GIVEN** the `VBAONodeOptions` type
- **WHEN** consumers configure `VBAONode`
- **THEN** no adaptive-thickness key SHALL be accepted
- **AND** the public uniform surface SHALL remain `radius`, `thickness`, `scale`, `slices`, `samples`, `resolution`

#### Scenario: Constant thickness is not used as the production back face

- **GIVEN** a valid depth sample `Q` and shaded pixel `P`
- **WHEN** the shader builds the blocker interval
- **THEN** the back face SHALL use an estimated per-sample adaptive thickness
- **AND** it SHALL NOT always use the raw `thickness` uniform for every sample

#### Scenario: Adaptive thickness preserves sample-local perspective correction

- **GIVEN** a depth sample `Q`
- **WHEN** the estimated thickness is applied
- **THEN** the back face SHALL be `Q - adaptiveThickness * normalize(-Q)`
- **AND** it SHALL NOT use `normalize(-P)` for the offset

#### Scenario: Adaptive scan ignores background

- **GIVEN** a candidate sample in the adaptive continuity scan
- **WHEN** its sampled depth is background (`depth >= 1`)
- **THEN** it SHALL break same-surface continuity
- **AND** it SHALL NOT enlarge the current sample's thickness

#### Scenario: No temporal dependency

- **GIVEN** two frames with the same depth, normal, camera, and options
- **WHEN** the adaptive-thickness shader runs
- **THEN** the estimated thickness SHALL be identical
- **AND** frame index, time, TAA jitter, or history buffers SHALL NOT participate in the estimate
