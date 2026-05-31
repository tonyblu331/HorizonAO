# HorizonAO Math Denoise Specification

## Requirements

### Requirement: Math Policy Is Testable

The system MUST expose deterministic scalar helpers for raw AO option clamps, sample/slice splitting, center-biased sample distance, falloff weight, and accessibility resolve.

#### Scenario: Clamp policy is stable

- GIVEN invalid or out-of-range raw AO options
- WHEN the options are clamped
- THEN values MUST match the raw node's supported ranges

#### Scenario: No occluder remains accessible

- GIVEN accumulated slice visibility equals slice count
- WHEN accessibility is resolved
- THEN the result MUST be `1`

### Requirement: Raw Kernel Uses Per-Pixel Rotation

The raw HorizonAO kernel MUST use deterministic per-pixel sample rotation or noise to avoid fixed slice orientation banding.

#### Scenario: Magic-square rotation is deterministic

- GIVEN an even requested noise size
- WHEN magic-square indices are generated
- THEN the output MUST use the next odd square size with unique indices

### Requirement: Spatial Denoise Is Separate And Optional

The system MUST provide a spatial depth/normal-aware denoise pass after raw AO without adding temporal accumulation.

#### Scenario: Denoised AO renders

- GIVEN the HorizonAO raw baseline
- WHEN `denoised-ao` debug view is selected
- THEN the harness MUST mark it as rendered and the canvas MUST remain non-empty

### Requirement: Harness Evidence Stays Honest

The harness MUST distinguish rendered debug views from metadata-only views and MUST NOT claim WebGPU validation or performance numbers without captured evidence.

#### Scenario: Debug status is explicit

- GIVEN `denoised-ao`
- WHEN debug status is requested
- THEN the status MUST be `rendered`

#### Scenario: WebGL fallback is not WebGPU validation

- GIVEN the renderer reports WebGL fallback
- WHEN screenshots or metadata are captured
- THEN the run MUST be treated as smoke coverage only
