## ADDED Requirements

### Requirement: Confidence-Aware Reference Filtering

VBAO denoise candidates SHALL account for confidence metadata before promotion.

#### Scenario: Confidence scales neighbor weight

- **Given** a same-surface neighbor with confidence below `1`
- **When** the reference spatial denoise weight is computed
- **Then** the weight SHALL be scaled by that confidence

#### Scenario: Discontinuities produce low confidence

- **Given** a neighbor separated by tangent-plane depth and normal discontinuity
- **When** edge/confidence metadata is computed
- **Then** `edgeDepth` and `edgeNormal` SHALL increase and confidence SHALL drop

#### Scenario: Metadata can suppress suspicious denoise neighbors

- **Given** a neighbor whose raw position and normal look same-surface
- **And** internal metadata reports high edge depth, high edge normal, or low confidence
- **When** the reference spatial denoise weight is computed
- **Then** the neighbor SHALL contribute zero or near-zero weight

#### Scenario: Public API remains unchanged

- **Given** confidence metadata is used internally
- **When** the package public surface is inspected
- **Then** no public `confidence`, `metadata`, or `denoise` option SHALL be added

### Requirement: Internal Metadata Debug Views

The demo harness SHALL expose internal metadata debug views for evidence capture
before any metadata-aware filter candidate is promoted.

#### Scenario: Museum route exposes metadata views

- **Given** the Museum demo is running in VBAO mode
- **When** the internal metadata debug selector is set to `edge-depth`, `edge-normal`, or `confidence`
- **Then** the rendered single-view output SHALL show that scalar instead of final VBAO accessibility

#### Scenario: Benchmark matrix records the selected metadata view

- **Given** `AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1`
- **When** the AO benchmark collector captures screenshots
- **Then** rows SHALL include `vbaoMetadataDebugView` and screenshot names SHALL identify the debug view

#### Scenario: Metadata debug remains internal-only

- **Given** metadata debug views exist in the demo
- **When** the package public API is inspected
- **Then** no public debug-view option, metadata target, or quality tier SHALL be added
