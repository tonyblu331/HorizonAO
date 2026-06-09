# VBAONode Capability Specification

## Purpose

`VBAONode` produces scalar ambient-occlusion accessibility from depth, normal, and camera inputs using a visibility-bitmask kernel in Three.js TSL. The production architecture is one public VBAO product node: raw visibility-bitmask AO with selected GT-VBAO corrections, internal pass-elided reconstruction when raw resolution is below output resolution, optional full-resolution polish controlled by `softness`, and raw AO exposed only as debug/readback output. It is not a renderer fallback, public denoiser toolkit, temporal accumulator, bent-normal system, indirect-diffuse system, or research-gate host.

## Requirements

### Requirement: Visibility-Bitmask Kernel Contract

The production kernel SHALL use one coherent visibility-bitmask path with GT-VBAO corrections: axial slice directions, two-sided screen-space marching, one signed hemislice mask coordinate, sample-local thickness, cosine-measure CDF remapping, point-sample sector quantization, popcount accessibility reduction, and projected-normal weighted slice accumulation after cosine-measure sectorization.

#### Scenario: Axial slice directions match two-sided marching

- **GIVEN** a slice index `i`, per-pixel rotation, and `sliceCount`
- **WHEN** the slice direction is computed
- **THEN** `phi` SHALL cover `π * (i + rotation) / sliceCount`
- **AND** the two march sides SHALL sample `+S_i` and `-S_i`
- **AND** the production kernel SHALL NOT use `2π` slice spacing for the two-sided march.

#### Scenario: CDF-remapped point-sample sectors build the mask

- **GIVEN** a front/back blocker interval in a slice
- **WHEN** the interval is converted to mask bits
- **THEN** both marched sides SHALL use signed slice angles `α = atan2(dot(D, S_i), dot(D, V))` in one shared hemislice domain
- **AND** the horizon angles SHALL be remapped through the slice-local cosine-measure CDF before quantization
- **AND** the interval SHALL use point-sample quantized sector treatment, not the old ceil-length sector range.

#### Scenario: Cosine-measure masks reduce by popcount and projected-normal slice weight

- **GIVEN** the visibility-bitmask `M_i` and projected-normal angle `γ_i_norm`
- **WHEN** per-slice accessibility is reduced
- **THEN** the mask bits SHALL already represent equal chunks of cosine-weighted measure
- **AND** the value SHALL be derived from `A_i = 1 − countOneBits(M_i)/32`
- **AND** slices SHALL be weighted by the projected normal length for that slice
- **AND** the production kernel SHALL NOT apply a second cosine-weighted sector loop after CDF remapping.

#### Scenario: Sample-local thickness is perspective-correct

- **GIVEN** a shaded pixel position `P` and a depth-sampled position `Q`
- **WHEN** the blocker back face is reconstructed for the mask interval
- **THEN** the back face SHALL be `Q - thickness * normalize(-Q)`
- **AND** it SHALL NOT use the shaded pixel view vector `normalize(-P)` for that sample-local offset.

#### Scenario: Research gates are not production source shape

- **GIVEN** the package source under `packages/horizon-ao/src`
- **WHEN** production code is reviewed
- **THEN** old adaptive-thickness, formula-decision, support-bitmask, WGPU precision, and label-review gate modules SHALL NOT be active package source
- **AND** demo parity diagnostics SHALL live outside `@horizonao/core` source.

#### Scenario: Production sampling is single-scheme and stable

- **GIVEN** production source under `packages/horizon-ao/src`
- **WHEN** the raw kernel sampling is reviewed
- **THEN** there SHALL be one deterministic internal sampling scheme
- **AND** radial sample distance SHALL use x² near-biased spacing
- **AND** the shader SHALL use a non-interpolated phase-indexed atlas so slice/sample phases do not share one scalar noise value
- **AND** intervals narrower than one sector SHALL use stochastic sub-sector coverage from the phase atlas
- **AND** benchmark schedule injection SHALL NOT be part of `VBAONode`.

### Requirement: Temporal-Free Product Output Boundary

The package SHALL expose product AO through one public `VBAONode` product boundary. Resolve, cleanup, and polish passes are internal reconstruction stages, not peer public products, and SHALL NOT introduce history inputs or research/debug knobs into `VBAONode`.

#### Scenario: Half-resolution raw AO is resolved before product use

- **GIVEN** `VBAONode` has rendered raw AO into its internal render target
- **WHEN** callers request `getTextureNode()`
- **THEN** it SHALL return final product AO
- **AND** `getRawTextureNode()` SHALL expose the raw AO texture for debug/readback only
- **AND** raw half-resolution AO SHALL NOT be the default product output.

#### Scenario: Internal reconstruction and polish are spatial-only

- **GIVEN** raw AO, current depth, current normal, camera reconstruction context, and resolution
- **WHEN** resolve, cleanup, or polish is enabled internally
- **THEN** filtering SHALL be bilateral/cross-bilateral and edge-aware
- **AND** it SHALL NOT require a history texture, frame index, reprojection, or TAA.

#### Scenario: Raw and denoise APIs stay honest

- **GIVEN** `VBAONodeOptions`
- **WHEN** callers configure the raw AO pass
- **THEN** `denoise?: boolean`, `denoiseRadius`, and `denoiseStrength` SHALL NOT be accepted by `VBAONode`
- **AND** `getTextureNode()` SHALL return final product AO semantics
- **AND** callers that want raw output SHALL explicitly call `getRawTextureNode()`
- **AND** callers SHALL NOT compose `VBAOResolveNode`, `VBAOHalfResCleanupNode`, or `VBAOFullResPolishNode` from the public package API
- **AND** low-resolution cleanup, JBU resolve, and full-resolution polish SHALL be lazily allocated and elided inside `VBAONode`
- **AND** full-resolution polish SHALL use a small rotated isotropic stencil, not a fixed 5x5 grid blur
- **AND** visibility modes, benchmark schedules, diagnostic fields, and formula gates SHALL NOT be public options.

### Requirement: Required Normal Input

`VBAONode` SHALL require a non-null `normalNode` and SHALL NOT provide a silent depth-derived normal fallback in v1.

#### Scenario: Constructor rejects null normal

- **GIVEN** a constructor call `new VBAONode(depthNode, null, camera)` or `new VBAONode(depthNode, undefined, camera)`
- **WHEN** the constructor executes
- **THEN** it SHALL throw `TypeError` with the message `VBAONode: normalNode is required`.

### Requirement: GTAONode-Shaped Public API

`VBAONode` SHALL match `GTAONode`'s integration shape where the semantics overlap: depth/normal/camera + factory + `getTextureNode()` + `setSize()`. Public product options SHALL remain compact (`quality`, deprecated alias `preset`, `radius`, `contact`, `strength`, `softness`, legacy alias `intensity`, and `advanced`). `contact` SHALL be the artist-facing finite-occluder prior and SHALL resolve to internal thickness. Low-level controls (`thickness`, `contrast`, `slices`, `samples`, `resolutionScale`) SHALL be available only as deprecated compatibility aliases or under `advanced`, and SHALL NOT be presented as peer product controls. `VBAONodeOptions` SHALL NOT expose denoise, temporal, research, debug, sector-count, mask, or directional output gates. Extra smoothing is controlled by `softness` and implemented as internal pass-elision, not public pass composition.

#### Scenario: Contact maps to internal thickness

- **GIVEN** callers provide `radius` and `contact`
- **WHEN** `VBAONodeOptions` are resolved
- **THEN** internal `thickness` SHALL be derived from the configured radius and clamped contact value
- **AND** the product API SHALL treat `contact` as the primary finite-occluder/contact-density control
- **AND** `advanced.thickness` or deprecated top-level `thickness` SHALL override the derived value only as an explicit low-level escape hatch.

#### Scenario: Product quality presets are not all half-resolution

- **GIVEN** callers select product `quality`
- **WHEN** quality tier defaults are resolved
- **THEN** `performance` MAY use half-resolution raw AO
- **AND** `balanced` SHALL use a higher-than-half raw resolution
- **AND** `quality` and `ultra` SHALL use full-resolution raw AO unless a later evidence gate changes the preset policy.
