# Delta: VBAO Node

## ADDED Requirements

### Requirement: Product evidence MUST measure fixed product presets

Museum product VBAO benchmark rows MUST construct `VBAONode` with a named quality preset and MUST NOT pass explicit `samples` or `slices` for product rows.

#### Scenario: Museum product path uses fixed quality loop shape

- **GIVEN** the Museum benchmark creates VBAO product pipelines
- **WHEN** `VBAONode` is constructed for product evidence
- **THEN** the options include `quality: 'quality'`
- **AND** the options do not include explicit `samples` or `slices`
- **AND** benchmark metadata reports the fixed quality preset shape.

### Requirement: Debug sample overrides MUST NOT be product evidence

Explicit VBAO sample/slice overrides MUST be labeled as debug or override evidence when they are benchmarked.

#### Scenario: Override rows stay separate

- **GIVEN** a benchmark row uses explicit `samples` or `slices`
- **WHEN** the row is reported
- **THEN** it is not labeled as a fixed product preset row.