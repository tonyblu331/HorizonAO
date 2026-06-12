# Delta: VBAO Node

## ADDED Requirements

### Requirement: Product defaults MUST match release evidence

`VBAONode` product preset defaults MUST NOT claim or imply release-candidate
promotion for a reconstruction path whose committed evidence is still marked
demoted, rejected, or not promoted.

#### Scenario: Default policy follows half-resolution evidence

- **GIVEN** committed evidence marks half-resolution product output as not
  promoted
- **WHEN** release-candidate readiness is reviewed
- **THEN** product defaults SHALL NOT use half-resolution for every quality tier
- **AND** `quality` and `ultra` SHALL use full-resolution raw AO unless a later
  evidence gate changes the preset policy
- **AND** explicit half-resolution rows SHALL remain evidence/advanced routes
  until they are promoted by committed evidence.

#### Scenario: Evidence-only passes stay private

- **GIVEN** an internal pass is used only for benchmark or evidence comparison
- **WHEN** package exports and product output are reviewed
- **THEN** the pass SHALL NOT be exported as public API
- **AND** tests or documentation SHALL identify whether it is archived, moved to
  an evidence/debug boundary, or intentionally retained as private source.

#### Scenario: Runtime pass ownership is audited before refactor

- **GIVEN** fullscreen VBAO passes manage renderer state
- **WHEN** pass ownership cleanup is proposed
- **THEN** the SDD SHALL name the files with module-level state
- **AND** any refactor SHALL preserve pass labels, public exports, and evidence
  capture behavior.

#### Scenario: Pasted benchmark claims are reconciled with committed evidence

- **GIVEN** a pasted review claims a competitor, noise-source, timing, edge, or
  thin-gap result
- **WHEN** committed `EVIDENCE.md` contains newer or conflicting data
- **THEN** the SDD SHALL prefer committed evidence for product decisions
- **AND** the pasted claim SHALL remain review pressure until reproduced or
  superseded by current harness artifacts.

#### Scenario: Temporal prototype constants do not reopen public temporal

- **GIVEN** private temporal source contains prototype thresholds or weights
- **AND** committed evidence rejects temporal promotion
- **WHEN** product-node hardening is planned
- **THEN** those constants SHALL NOT become public product options
- **AND** any rederivation SHALL require a separate temporal SDD with evidence.

#### Scenario: Competitor benchmark claims require current harness evidence

- **GIVEN** a pasted review compares VBAO against GTAO, SSAO, or N8AO
- **WHEN** the SDD changes product claims based on that comparison
- **THEN** current benchmark artifacts SHALL include all compared algorithms
- **AND** the rows SHALL use the same scene, camera, resolution, view, and output
  semantics.

#### Scenario: Product promotion requires fixture observations

- **GIVEN** a product AO row is used for release, README, or marketing quality
  claims
- **WHEN** the production reference gate is evaluated
- **THEN** every required production reference fixture SHALL be observed
- **AND** screenshot proxy metrics SHALL NOT replace ray-cast/reference fixture
  observations.
