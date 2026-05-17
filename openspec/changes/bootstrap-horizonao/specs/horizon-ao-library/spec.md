# Horizon AO Library Specification

## ADDED Requirements

### Requirement: Settings API

The library MUST expose validated HorizonAO settings before exposing rendering internals.

#### Scenario: Preset settings are created

- GIVEN a caller requests a preset
- WHEN settings are created
- THEN numeric values SHALL be clamped to supported ranges
- AND the returned object SHALL be immutable enough for consumers to share safely

### Requirement: Sample Budget Estimate

The library SHOULD expose a deterministic sample budget estimate for UI and tests.

#### Scenario: Higher quality increases budget

- GIVEN compact and cinematic settings
- WHEN budgets are estimated
- THEN cinematic SHALL have a higher budget than compact
