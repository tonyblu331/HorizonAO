# vbao-node Spec Delta — Product Resolve Readiness

## Added Requirements

### Requirement: Raw samples are local before they can occlude

`VBAONode` SHALL reject reconstructed screen-space samples that are outside the local AO radius, have effectively zero distance, or lie behind the marched side direction before writing visibility sectors.

#### Scenario: Far wall sample is rejected

- **Given** a reconstructed sample whose view-space distance from `P` is greater than `radius + thickness`
- **When** the sample reaches the bitmask update block
- **Then** it SHALL NOT update `occludedMask`

#### Scenario: Back point is thickness-clamped

- **Given** a valid sample close to `P`
- **When** computing the back interval endpoint
- **Then** effective thickness SHALL be `min(thickness, 0.85 * sampleDistance)`

### Requirement: Product AO is edge-aware resolved when raw AO is low-resolution

`VBAONode` SHALL keep resolve, cleanup, and polish passes internal. When raw AO is below output resolution, it SHALL use temporal-free edge-aware reconstruction with scene depth, scene normals, and camera reconstruction. When full-resolution raw AO is configured, it SHALL lazily elide the upsample resolve.

#### Scenario: Public texture semantics are explicit

- **Given** callers request `VBAONode.getTextureNode()`
- **Then** the returned node SHALL represent final product AO
- **And** callers that need raw debug/readback output SHALL use `VBAONode.getRawTextureNode()`
- **And** `VBAOResolveNode`, `VBAOHalfResCleanupNode`, and `VBAOFullResPolishNode` SHALL NOT be public package exports

### Requirement: Product presets are single-product quality tiers

`VBAONode` SHALL expose product presets `performance`, `balanced`, `quality`, and `ultra`. It SHALL NOT expose separate platform presets or compatibility aliases that imply a second product contract.