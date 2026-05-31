## ADDED Requirements

### Requirement: Multi-Fixture GPU Parity Matrix

The VBAO parity route SHALL compare GPU readback against scalar reference rows
for flat plane, two-wall corner, and thin-occluder fixtures.

#### Scenario: Fixture IDs are stable

- **Given** the parity fixture matrix is inspected
- **Then** it SHALL contain `flat-plane`, `two-wall-corner`,
  `two-wall-corner-true-normal`, and `thin-occluder`

#### Scenario: Every fixture has scalar rows

- **Given** a fixture in the parity matrix
- **When** scalar expected rows are computed
- **Then** every row SHALL include a named anchor pixel, expected value,
  quantized expected value, finite mask metadata, anchor validation, and surface
  normal metadata

#### Scenario: WebGPU route exposes fixture reports

- **Given** `/vbao-parity` completes in WebGPU
- **When** `window.__vbaoParity` is read
- **Then** it SHALL include per-fixture reports
- **And** each report SHALL include `fixtureId`, `rows`, `maxAbsError`, and
  `passed`

### Requirement: Hardened Fixture Oracle

The parity matrix SHALL include a true-normal corner fixture before metadata
filter evidence is accepted.

#### Scenario: True-normal corner fixture is not a frontal proxy

- **Given** `two-wall-corner-true-normal` scalar rows are computed
- **Then** at least one row SHALL report a normal whose z component is not `1`
- **And** the WebGPU scene adapter SHALL render matching non-frontal wall planes

#### Scenario: Thin occluder anchors avoid silhouette ambiguity

- **Given** a candidate thin-occluder anchor is inspected
- **When** it is inside the silhouette or one-pixel coverage guard band
- **Then** the anchor validation SHALL reject it
- **And** the reason SHALL mention a silhouette or coverage discontinuity

### Requirement: Formula Variant Labels

The parity report SHALL label paper/popcount-vs-cosine formula agreement instead
of hiding mismatches.

#### Scenario: Formula labels are explicit

- **Given** GPU, paper-quantized, and cosine-quantized values are compared
- **Then** the label SHALL be one of `paper-matches-gpu`,
  `cosine-matches-gpu`, `both-drift`, or `visual-choice-required`

### Requirement: Fixture Expansion Stays Internal

The fixture matrix SHALL stay internal to tests and evidence.

#### Scenario: Public package surface remains unchanged

- **Given** multi-fixture parity helpers exist
- **When** `packages/horizon-ao/src/index.ts` is inspected
- **Then** no fixture helper, scalar adapter, or route-only parity type SHALL be
  exported from `@horizonao/core`
