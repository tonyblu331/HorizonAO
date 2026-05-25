# VBAONode Spec Delta: Denoise Evidence Gate

## ADDED Requirements

### Requirement: Denoise Requires Evidence

A VBAO denoise pass SHALL NOT ship unless raw adaptive VBAO evidence shows a named noise failure and the denoise pass improves the Pareto tradeoff against raw higher sample counts.

#### Scenario: Raw evidence precedes filter code

- **GIVEN** a proposed denoise implementation
- **WHEN** the change is reviewed
- **THEN** `EVIDENCE.md` SHALL include raw VBAO screenshots and median/p95 timings
- **AND** the visible failure SHALL be labelled with one or more named failure modes

#### Scenario: Spatial filter respects geometry edges

- **GIVEN** neighboring pixels with depth or normal discontinuity
- **WHEN** spatial denoise gathers neighbors
- **THEN** discontinuous neighbors SHALL have zero or near-zero weight
- **AND** the filter SHALL NOT smear AO across foreground/background boundaries

#### Scenario: No temporal dependency

- **GIVEN** two identical frames
- **WHEN** denoise runs
- **THEN** output SHALL be identical without history buffers, TAA, or frame index
