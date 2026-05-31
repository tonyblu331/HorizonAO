## ADDED Requirements

### Requirement: Paper Reference Comparison

VBAO correctness work SHALL keep a paper/GLSL-aligned scalar reference available
for internal comparison against the current production-candidate reference.

#### Scenario: Normal-centered shift is testable

- **Given** a view direction, surface normal, and slice direction
- **When** the paper reference computes the normal-centered shift
- **Then** a view-aligned normal SHALL produce zero shift
- **And** a tilted normal SHALL produce a signed non-zero shift

#### Scenario: Paper popcount is not assumed equivalent to production accessibility

- **Given** an asymmetric visibility mask
- **When** paper popcount and production cosine-measure CDF sectorization are compared
- **Then** the delta SHALL be reported instead of discarded
- **And** production accessibility SHALL remain mask-popcount accessibility
  averaged uniformly across slices

### Requirement: Depth-MIP Candidates Stay Metadata-Gated

Prototype depth hierarchy candidates SHALL fall back to base depth when edge
metadata says a coarse depth could create false curvature.

#### Scenario: Stable neighborhood accepts coarse depth

- **Given** a projected footprint that selects a coarse level
- **And** edge depth and edge normal are low
- **And** confidence is high
- **When** the candidate depth is within tolerance
- **Then** the coarse depth SHALL be accepted

#### Scenario: Suspicious neighborhood rejects coarse depth

- **Given** a projected footprint that selects a coarse level
- **And** edge depth or edge normal is high, confidence is low, or candidate
  depth differs too much from base depth
- **When** the depth-MIP candidate is resolved
- **Then** base depth SHALL be used instead

### Requirement: Temporal-Free Filter Contract

VBAO spatial-filter candidates SHALL be evaluable without temporal history before any
temporal accumulation is considered.

#### Scenario: Candidate report uses zero history frames

- **Given** a center sample and neighboring samples with edge/confidence metadata
- **When** the temporal-free reference filter runs
- **Then** `temporalFramesUsed` SHALL equal `0`
- **And** suspicious neighbors SHALL be counted as rejected
- **And** accepted neighbors SHALL affect accessibility only through spatial,
  normal, depth, confidence, and mask-coverage weights

### Requirement: Public API Remains Closed During Audit

Audit scaffolding SHALL NOT add public options or exports.

#### Scenario: Internal helpers remain internal

- **Given** paper reference, depth-MIP candidate, and temporal-free spatial filter
  helpers exist
- **When** the package public API is inspected
- **Then** no new `VBAONodeOptions` field or public helper export SHALL be added
