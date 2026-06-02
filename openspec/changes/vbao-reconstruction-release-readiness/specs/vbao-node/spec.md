# Delta: VBAO Node

## ADDED Requirements

### Requirement: Half-resolution reconstruction readiness MUST be stage-gated

Half-resolution `VBAONode` output MUST NOT be promoted as the performance path until reconstruction artifacts are measured at each internal stage and the first failing stage is identified.

#### Scenario: Half-resolution stage evidence identifies where artifacts enter

- **GIVEN** half-resolution VBAO is evaluated for release readiness
- **WHEN** evidence is captured
- **THEN** the evidence SHALL include rows for raw half-res AO, half-res cleanup, full-res JBU resolve, optional polish, and final AO
- **AND** each row SHALL label noise, stripe, edge bleed, thin gap, scale mismatch, and false curvature outcomes.

#### Scenario: Half-resolution promotion requires visual and timing evidence

- **GIVEN** half-resolution has lower GPU cost than full-resolution
- **WHEN** promotion is considered
- **THEN** lower timing alone SHALL NOT be sufficient
- **AND** quality labels SHALL be acceptable or the path SHALL remain demoted for release.

### Requirement: Release diagnostics MUST be clean or explicitly blocked

Generated shader inspection MUST NOT silently tolerate known duplicate-name warnings in release-readiness claims.

#### Scenario: Duplicate shader name warnings are release blockers until resolved

- **GIVEN** generated shader inspection emits duplicate `vbaoPixel` warnings
- **WHEN** release readiness is reported
- **THEN** the warning SHALL be fixed or documented as a concrete blocker
- **AND** the report SHALL distinguish diagnostics debt from shader pass-shape failure.

### Requirement: Product runtime MUST avoid benchmark-only sampling fat where safe

Runtime sampling code SHOULD contain only the default product source and supported injection path unless benchmark candidates are proven necessary at runtime.

#### Scenario: Benchmark noise candidates are quarantined

- **GIVEN** noise sources exist only for benchmark comparison
- **WHEN** runtime boundary checks run
- **THEN** those candidates SHALL live outside the public runtime path or be clearly hidden behind internal benchmark-only contracts.

### Requirement: Product fixture observations MUST gate quality claims

Product quality claims MUST include product fixture observations for the correctness fixtures used by the reference gate.

#### Scenario: Missing product fixture observations block release quality claims

- **GIVEN** flat plane, full hemisphere, two-wall corner, and thin occluder fixtures exist
- **WHEN** product quality is claimed
- **THEN** product observations for those fixtures SHALL be present
- **AND** missing observations SHALL be reported as blockers, not passes.
