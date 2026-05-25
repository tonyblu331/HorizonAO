# Delta for vbao-node

## ADDED Requirements

### Requirement: Adaptive Thickness Starts In The Scalar Reference

Adaptive blocker thickness SHALL be proven in the scalar JavaScript reference
before any TSL kernel or public API change is accepted.

#### Scenario: Public API remains unchanged

- GIVEN adaptive thickness reference work is implemented
- WHEN `VBAONodeOptions`, `VBAO_QUALITY_TIERS`, and `VBAONode` public uniforms
  are inspected
- THEN no new public adaptive-thickness option SHALL exist
- AND the existing `thickness` uniform SHALL remain available for the current
  constant-thickness path

#### Scenario: Constant-thickness reference behavior remains available

- GIVEN existing scalar reference tests call `buildSampleMask`
- WHEN those tests run
- THEN they SHALL continue to use the existing constant `thickness` input
- AND their expected masks and reductions SHALL remain valid

### Requirement: Same-Surface Runs Estimate Blocker Thickness

The scalar reference SHALL provide deterministic helpers that estimate blocker
thickness from consecutive same-surface samples.

#### Scenario: Isolated thin occluder remains thin

- GIVEN a sampled occluder has no same-surface continuation along the marched
  slice
- WHEN adaptive thickness is estimated
- THEN the estimate SHALL clamp near the configured minimum thickness
- AND the resulting mask SHALL occupy fewer sectors than a continuous thick wall

#### Scenario: Continuous thick wall becomes thicker

- GIVEN consecutive samples belong to the same apparent surface and span a
  larger view-space depth interval
- WHEN adaptive thickness is estimated
- THEN the estimate SHALL increase toward the configured maximum thickness
- AND the resulting mask SHALL block more sectors than an isolated thin
  occluder at the same front sample

#### Scenario: Gap behind object remains open

- GIVEN samples are separated by a depth/normal discontinuity that represents a
  gap behind the front object
- WHEN same-surface runs are detected
- THEN samples across the discontinuity SHALL NOT merge into one run
- AND adaptive thickness SHALL NOT close the gap by using the back sample as
  continuous blocker thickness

### Requirement: Adaptive Thickness Is Clamped And Deterministic

The scalar reference SHALL use internal clamp defaults and deterministic math so
that tests are stable.

#### Scenario: Clamp defaults bound the estimate

- GIVEN arbitrary valid same-surface sample runs
- WHEN adaptive thickness is estimated
- THEN the returned value SHALL be between `minThickness` and `maxThickness`

#### Scenario: No stochastic jitter in this change

- GIVEN adaptive thickness reference helpers run multiple times with identical
  inputs
- WHEN the output thickness is compared
- THEN the result SHALL be bit-stable JavaScript number output within normal
  floating-point equality expectations
