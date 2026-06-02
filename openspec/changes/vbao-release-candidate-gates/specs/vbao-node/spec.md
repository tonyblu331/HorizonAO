# Delta: VBAO Node

## ADDED Requirements

### Requirement: Release-candidate claims MUST be evidence-gated

`VBAONode` release-candidate claims MUST be backed by committed evidence rows for the actual product path being claimed. Missing screenshots, timings, shader evidence, or review files SHALL be incomplete evidence, not passing evidence.

#### Scenario: Half-resolution promotion is falsifiable

- **GIVEN** half-resolution VBAO is proposed as a performance path
- **WHEN** release evidence is reviewed
- **THEN** `EVIDENCE.md` SHALL compare half-res and full-res product rows at `1920x1080` and `1280x720`
- **AND** it SHALL report pattern/noise, stripe, edge-bleed, thin-gap, median timing, and p95 timing outcomes.

#### Scenario: Noise-source changes require a Pareto win

- **GIVEN** a noise source other than the current phase atlas is proposed as default
- **WHEN** the decision is made
- **THEN** the candidate SHALL have matrix rows against atlas hash, IGN, static STBN, and FAST-like candidates
- **AND** rejected candidates SHALL keep concrete rejection reasons.

#### Scenario: Runtime and reference boundaries stay clean

- **GIVEN** package runtime source under `packages/horizon-ao/src`
- **WHEN** release-candidate readiness is checked
- **THEN** reference/report/debug-only helpers SHALL live outside the public runtime path unless a runtime import proves they are needed.

#### Scenario: Generated shader output confirms source contracts

- **GIVEN** source-contract tests claim fixed product loop shapes
- **WHEN** shader readiness is reviewed
- **THEN** captured generated shader evidence SHALL confirm fixed loop bounds and no unexpected JBU, wide-polish, or extra pass in product rows.

#### Scenario: Review archives are self-contained

- **GIVEN** a review archive is produced
- **WHEN** an external reviewer opens it
- **THEN** imported internal pass files, `src/index.ts`, reference modules, tests, and a manifest SHALL be present or explicitly documented as excluded.