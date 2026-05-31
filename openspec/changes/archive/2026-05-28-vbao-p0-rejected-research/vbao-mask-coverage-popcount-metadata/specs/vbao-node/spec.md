## ADDED Requirements

### Requirement: Internal Mask Metadata Gate

The project SHALL require bitmask-derived metadata before further
metadata-aware VBAO filter promotion.

#### Scenario: Metadata-aware v1 fails promotion

- **Given** the `metadata-aware` filter evidence is reviewed
- **Then** promotion SHALL be rejected if it still shows `noise`,
  `false-curvature`, or `scale-mismatch`
- **And** the next gate SHALL be mask coverage / popcount metadata, not blind
  blur tuning

#### Scenario: Mask metadata remains internal

- **Given** mask coverage / popcount metadata is implemented
- **Then** it SHALL NOT add public `VBAONodeOptions`
- **And** it SHALL NOT add a public `@horizonao/core` export
- **And** it SHALL only be used by demo/evidence/filter experiments until a
  later promotion decision passes evidence

#### Scenario: Paper popcount debug remains a formula diagnostic

- **Given** an internal `paper-popcount` view exists
- **Then** it SHALL be computed from a paper/reference mask construction path
  using normal shift, front/back sector range, constant view-direction
  thickness, and popcount reduction
- **And** it SHALL NOT promote the paper/reference branch as production shader
  math until GPU parity and Museum evidence pass
