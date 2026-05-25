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

#### Scenario: Radius stress rows are labeled before promotion

- **Given** the Museum benchmark collector runs with
  `AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1`
- **When** a VBAO row is captured for the depth hierarchy gate
- **Then** the row includes `vbaoRadiusStressPreset`
- **And** the row includes `vbaoRadius`
- **And** the row includes `vbaoExpectedDepthHierarchyLevel`
- **And** the row may be promoted only when screenshot review assigns
  `scale-mismatch` or distant large-radius instability labels
