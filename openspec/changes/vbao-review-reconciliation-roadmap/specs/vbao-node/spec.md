# vbao-node Spec Delta

## Modified Requirements

### Requirement: Review Reconciliation Before Runtime Changes

The project SHALL reconcile pasted external reviews against current source,
specs, and evidence before turning review items into runtime changes.

#### Scenario: Stale claims are closed instead of re-planned

- **GIVEN** a pasted review claims a feature or refactor is missing
- **WHEN** current source or source-contract tests show the item already exists
- **THEN** the SDD SHALL classify the item as already done
- **AND** SHALL NOT create duplicate implementation tasks for it.

#### Scenario: Formula claims route through fixture gates

- **GIVEN** a pasted review proposes a production kernel formula change
- **WHEN** the current spec intentionally defines a different formula
- **THEN** the change SHALL be routed through fixture evidence and spec updates
- **AND** production shader code SHALL NOT change directly from review prose.

#### Scenario: Cleanup claims preserve evidence behavior

- **GIVEN** a review proposes pass, demo, or API cleanup
- **WHEN** the cleanup could affect product evidence rows or public options
- **THEN** the SDD SHALL define a migration or evidence-preserving gate before
  implementation.
