## ADDED Requirements

### Requirement: Depth Hierarchy Evidence Gate

`VBAONode` SHALL NOT expose public depth hierarchy, depth MIP, depth prefilter,
or temporal history options before evidence proves a Pareto win.

#### Scenario: Reference selector remains internal

- **Given** the depth hierarchy reference selector exists
- **When** the package public surface is inspected
- **Then** `index.ts` does not export the selector
- **And** `VBAONodeOptions` contains no depth hierarchy option

#### Scenario: Evidence precedes production path

- **Given** a depth hierarchy implementation is proposed
- **When** `EVIDENCE.md` lacks screenshot paths, failure labels, and median/p95
  timing rows showing `scale-mismatch` or distant large-radius instability
- **Then** the production shader path remains unchanged
