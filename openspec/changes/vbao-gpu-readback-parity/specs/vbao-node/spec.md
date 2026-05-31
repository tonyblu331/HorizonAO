## ADDED Requirements

### Requirement: Fixed GPU Readback Fixture Parity

The VBAO parity harness SHALL compare named GPU readback pixels against scalar
reference values for a fixed synthetic scene.

#### Scenario: Flat-plane fixture rows are named

- **Given** the `/vbao-parity` scene renders the flat-plane fixture
- **When** parity rows are reported
- **Then** rows SHALL include `flat-plane-center`, `flat-plane-left-quarter`,
  and `flat-plane-upper-right`

#### Scenario: Scalar expected values are quantized before comparison

- **Given** the VBAO render target is read back from a byte-format texture
- **When** scalar expected values are compared with GPU readback
- **Then** the scalar values SHALL be quantized to render-target byte precision
- **And** the tolerance SHALL be no wider than one byte plus epsilon

#### Scenario: E2E fails on scalar drift

- **Given** `E2E_WEBGPU_PARITY=1`
- **When** the Playwright parity test reads `window.__vbaoParity`
- **Then** each fixed fixture row SHALL pass
- **And** `maxAbsError` SHALL be less than or equal to the reported tolerance

### Requirement: GPU Parity Helpers Stay Internal

GPU readback parity helpers SHALL NOT become public package API.

#### Scenario: Public exports remain unchanged

- **Given** the internal `vbaoParity/` modules exist
- **When** `packages/horizon-ao/src/index.ts` is inspected
- **Then** it SHALL NOT export the GPU parity helper module or functions
