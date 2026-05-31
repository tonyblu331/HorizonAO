## ADDED Requirements

### Requirement: Reference Quality Oracle

`VBAONode` quality candidates SHALL be judged against deterministic reference
fixtures before promotion.

#### Scenario: Open hemisphere reference

- **Given** an oracle fixture where no hemisphere ray is blocked
- **When** reference accessibility is estimated
- **Then** the result SHALL be `1`

#### Scenario: Fully blocked hemisphere reference

- **Given** an oracle fixture where every hemisphere ray is blocked
- **When** reference accessibility is estimated
- **Then** the result SHALL be `0`

#### Scenario: False curvature is a first-class failure

- **Given** a candidate creates stair-step or quantized-depth error
- **When** quality labels are classified
- **Then** `false-curvature` SHALL be reported separately from `noise`

#### Scenario: Filter candidates are oracle-gated

- **Given** raw VBAO accessibility, filtered candidate accessibility, and expected accessibility
- **When** the candidate is evaluated
- **Then** the candidate SHALL be accepted only when oracle quality does not regress
- **And** no failure labels such as `mud` or `edge-bleed` are introduced

#### Scenario: Required fixture matrix is deterministic

- **Given** the oracle fixture matrix is evaluated with a fixed sample count
- **When** fixture rows are produced
- **Then** the matrix SHALL include flat-open, full-blocked, two-wall corner,
  thin occluder, stair-step negative control, and museum-scale rows
- **And** their accessibility values SHALL stay inside documented expected ranges

#### Scenario: Stair-step negative control rejects false curvature

- **Given** the stair-step fixture is evaluated
- **When** quality labels are classified
- **Then** the fixture SHALL report `false-curvature`
- **And** the fixture row SHALL NOT be accepted

#### Scenario: Oracle is not public API

- **Given** the quality oracle exists
- **When** the package public surface is inspected
- **Then** `index.ts` SHALL NOT export the oracle helpers
