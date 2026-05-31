## ADDED Requirements

### Requirement: Per-Step Sampling Decorrelation

`VBAONode` SHALL avoid marching every sample on a ray with one shared radial
scale.

#### Scenario: Per-step jitter

- **Given** one pixel, one slice, and multiple sample indices
- **When** sample fractions are generated
- **Then** each sample SHALL use a deterministic per-step jitter
- **And** the gaps SHALL NOT all be equal

#### Scenario: No public sampling knob

- **Given** sampling v2 is active internally
- **When** `VBAONodeOptions` is inspected
- **Then** it SHALL NOT expose `samplingSchedule`
