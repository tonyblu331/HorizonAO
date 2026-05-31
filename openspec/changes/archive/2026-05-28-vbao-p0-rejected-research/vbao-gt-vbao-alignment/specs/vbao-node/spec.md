## ADDED Requirements

### Requirement: GT/reference parity SHALL use paper-aligned masks

The internal VBAO parity oracle SHALL compute paper/GT expected accessibility from the paper-aligned mask convention instead of reusing production masks.

#### Scenario: Paper expected output uses separate mask metadata

- **Given** a parity fixture row has both production and paper/reference expected values
- **When** the row exposes mask diagnostics
- **Then** it SHALL expose production mask popcount/coverage and paper mask popcount/coverage separately
- **And** `paperExpected` SHALL be reduced from the paper/reference mask path
- **And** helpers SHALL remain internal to tests and demo diagnostics

### Requirement: Formula disagreements SHALL remain explicit

The internal parity report SHALL classify whether GPU output matches paper/reference, production/cosine, both, or neither.

#### Scenario: Formula label is reviewable

- **Given** GPU, paper/reference, and production expected values are compared
- **When** they disagree beyond tolerance
- **Then** the row SHALL use one of `paper-matches-gpu`, `cosine-matches-gpu`, `both-drift`, or `visual-choice-required`
