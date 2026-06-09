# Delta: VBAO Node

## ADDED Requirements

### Requirement: Product defaults MUST match release evidence

`VBAONode` product preset defaults MUST NOT claim or imply release-candidate
promotion for a reconstruction path whose committed evidence is still marked
demoted, rejected, or not promoted.

#### Scenario: Half-resolution default policy follows evidence

- **GIVEN** all product quality tiers default to half-resolution
- **AND** committed evidence marks half-resolution product output as not promoted
- **WHEN** release-candidate readiness is reviewed
- **THEN** the SDD SHALL classify the default policy as failing
- **AND** implementation SHALL either update defaults to match promoted evidence
  or keep half-resolution behind an explicit non-default evidence route.

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
