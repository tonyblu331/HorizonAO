# VBAONode Spec Delta: Directional Visibility Reference

## ADDED Requirements

### Requirement: Directional Visibility Comes From Open Sectors

Directional reference outputs SHALL be derived from open visibility sectors in the VBAO mask, not guessed from surface normals or from a GTAO-style single horizon cone.

#### Scenario: Full open mask has accessibility one

- **GIVEN** a slice mask with all sectors open
- **WHEN** directional accessibility is reconstructed
- **THEN** accessibility SHALL be `1`
- **AND** directional weight SHALL be non-zero where cosine weights are non-zero

#### Scenario: Full blocked mask has zero directional weight

- **GIVEN** a slice mask with all sectors blocked
- **WHEN** directional visibility is reconstructed
- **THEN** accessibility SHALL be `0`
- **AND** bent-normal and bucket weights SHALL be zero

#### Scenario: Separated lobes remain separated

- **GIVEN** two non-contiguous open-sector lobes with comparable weights
- **WHEN** visibility buckets are reconstructed
- **THEN** the reference SHALL return two buckets
- **AND** it SHALL NOT collapse them into a single misleading bent direction
