## ADDED Requirements

### Requirement: Artifact-Specific Oracle Fixtures

The project SHALL define internal oracle fixtures that target the named visual failures that blocked formula and filter promotion.

#### Scenario: Thin gap fixture targets edge leaks

- **Given** the upstream signal correction gate is active
- **Then** an internal `thin-gap-parallel-planes` fixture SHALL exist
- **And** it SHALL target `thin-gap` and `edge-bleed`

#### Scenario: Flat floor fixture targets false curvature

- **Given** the upstream signal correction gate is active
- **Then** an internal `large-flat-floor-no-curvature` fixture SHALL exist
- **And** it SHALL target `false-curvature` and `scale-mismatch`

#### Scenario: Small contact fixture targets scale

- **Given** the upstream signal correction gate is active
- **Then** an internal `small-contact-object-on-plane` fixture SHALL exist
- **And** it SHALL target `scale-mismatch` and `mud`

#### Scenario: Filter tuning is blocked until upstream signal improves

- **Given** raw VBAO still has unchanged fixture failures
- **Then** new filter tuning SHALL NOT be promoted
- **And** candidates SHALL first pass sampling distribution or radius/thickness scale gates

### Requirement: Sampling Distribution Candidate Gate

The project SHALL keep sampling schedule changes behind fixture-targeted evidence.

#### Scenario: Existing schedules remain diagnostic

- **Given** `magic-square`, `r2`, `hilbert`, and `blue-noise` are evaluated
- **When** no non-production schedule clears all artifact-specific fixture labels
- **Then** production sampling SHALL remain `magic-square`

#### Scenario: Schedule promotion requires fixture cleanup

- **Given** a non-production schedule clears every artifact-specific fixture label
- **Then** the sampling gate MAY mark that schedule as the promoted candidate
- **And** the change SHALL still remain internal until Museum evidence is captured

### Requirement: Radius/Thickness Scale Candidate Gate

The project SHALL keep radius/thickness changes behind fixture-targeted evidence.

#### Scenario: Existing presets remain diagnostic

- **Given** `museum-baseline`, `thin-gap-conservative`, `small-contact-tight`, and `large-radius` are evaluated
- **When** no non-baseline preset clears all artifact-specific fixture labels
- **Then** production radius/thickness SHALL remain `museum-baseline`

#### Scenario: Scale promotion requires fixture cleanup

- **Given** a non-baseline radius/thickness preset clears every artifact-specific fixture label
- **Then** the scale gate MAY mark that preset as the promoted candidate
- **And** the change SHALL still remain internal until Museum evidence is captured

### Requirement: Adaptive Radius/Thickness Candidate Gate

The project SHALL evaluate fixture-aware adaptive radius/thickness as one
internal raw-signal candidate before any production behavior change.

#### Scenario: Adaptive candidate derives fixture-specific parameters

- **Given** the adaptive radius/thickness gate is active
- **Then** `fixture-adaptive-v1` SHALL derive radius/thickness from the fixture
  artifact class
- **And** thin-gap, large-flat-floor, small-contact, grazing-corner, and
  subpixel fixtures SHALL each have an explicit internal decision reason

#### Scenario: Adaptive candidate may only advance when labels improve

- **Given** `fixture-adaptive-v1` is compared against `museum-baseline`
- **Then** it SHALL improve at least one targeted fixture label
- **And** it SHALL introduce no new fixture label relative to baseline
- **And** it SHALL be marked only as ready for GPU fixture comparison

#### Scenario: Adaptive candidate does not promote production behavior

- **Given** `fixture-adaptive-v1` passes the internal label model
- **Then** production radius/thickness SHALL remain `museum-baseline`
- **And** no public `VBAONodeOptions` or package export SHALL be added

### Requirement: Adaptive Radius/Thickness GPU Fixture Comparison

The project SHALL compare the adaptive radius/thickness candidate against the
expanded `/vbao-parity` GPU fixture matrix before any Museum evidence claim.

#### Scenario: Candidate is rendered with fixture-specific radius/thickness

- **Given** `/vbao-parity` renders `fixture-adaptive-v1`
- **Then** upstream artifact fixtures SHALL use the adaptive radius/thickness
  selected for that fixture
- **And** non-upstream parity fixtures SHALL keep the baseline parity config

#### Scenario: Candidate must pass GPU/scalar parity

- **Given** candidate fixture readbacks are collected
- **Then** candidate rows SHALL match scalar rows within the quantized readback
  tolerance
- **And** baseline raw VBAO rows SHALL also continue passing parity

#### Scenario: GPU fixture pass is not production promotion

- **Given** baseline and candidate GPU/scalar parity pass
- **And** the label model improves at least one targeted label and worsens none
- **Then** the gate MAY report `ready-for-museum-matrix`
- **And** production radius/thickness SHALL remain `museum-baseline`

### Requirement: Adaptive Radius/Thickness Museum Matrix

The project SHALL keep Museum evidence for `fixture-adaptive-v1` narrow and
internal after the GPU fixture gate passes.

#### Scenario: Museum matrix captures only required rows

- **Given** `AO_BENCHMARK_VBAO_ADAPTIVE_RADIUS_MATRIX=1`
- **Then** the benchmark SHALL capture raw single-mode rows
- **And** rows SHALL include GTAO, baseline VBAO, `fixture-adaptive-v1` VBAO,
  and N8AO
- **And** rows SHALL cover `beauty` and `ao` views at `1920x1080` and
  `1280x720`

#### Scenario: Museum candidate remains internal

- **Given** the Museum matrix includes `fixture-adaptive-v1`
- **Then** production radius/thickness SHALL remain `museum-baseline`
- **And** no public `VBAONodeOptions` or package export SHALL be added

### Requirement: Support-Bitmask Visibility Candidate

The project SHALL specify the next raw-signal math candidate as an internal
support-weighted bitmask before any live shader promotion.

#### Scenario: Candidate uses two WebGPU-native bit planes

- **Given** `support-bitmask-v1` accumulates per-sample sector masks
- **Then** it SHALL track sectors hit at least once in `hitMask`
- **And** it SHALL track repeated-hit sectors in `supportedMask`
- **And** it SHALL also treat broad single intervals as self-supported
- **And** the repeated accumulation SHALL be expressible as `supportedMask |= hitMask & sampleMask; hitMask |= sampleMask`
- **And** the broad self-support SHALL remain internal and fixture-gated

#### Scenario: Candidate preserves coherent binary visibility

- **Given** every hit sector is also supported
- **Then** support-bitmask visibility SHALL match the production cosine-weighted
  binary reduction for that slice

#### Scenario: Candidate does not erase broad near blockers

- **Given** one sample interval spans many angular sectors
- **Then** those sectors SHALL be treated as supported
- **And** a broad one-sample blocker SHALL NOT be discounted like a one-sector
  speckle

#### Scenario: Candidate discounts uncertain single-hit sectors

- **Given** a sector is hit exactly once
- **Then** the candidate SHALL treat that sector as partially occluding rather
  than fully blocked or fully open
- **And** the single-hit confidence SHALL remain internal until GPU fixture
  evidence chooses a value

#### Scenario: Candidate is not production promotion

- **Given** support-bitmask scalar contracts pass
- **Then** production VBAO SHALL continue using the current binary visibility
  shader path
- **And** no public `VBAONodeOptions` or package export SHALL be added
- **And** live shader wiring SHALL require RED GPU fixture tests first

#### Scenario: Live candidate route is evidence-only

- **Given** `/vbao-parity` renders `support-bitmask-v1`
- **Then** the route SHALL compare support-bitmask readbacks against
  support-bitmask scalar rows under the WGPU precision envelope
- **And** the route SHALL expose a pass or reject verdict without promoting
  production
- **And** any GPU/scalar drift SHALL block label review

### Requirement: WGPU Precision and Memory Envelope

The project SHALL require precision-aware WebGPU evidence for every raw-signal
candidate before any shader promotion claim.

#### Scenario: AO readback uses quantized tolerance

- **Given** current raw VBAO AO is read through the byte-quantized red-channel
  parity target
- **Then** scalar expected AO values SHALL be compared after byte quantization
- **And** the readback tolerance SHALL cover one AO byte plus epsilon

#### Scenario: Texture-copy row padding is part of evidence

- **Given** WebGPU texture readbacks may use 256-byte-aligned rows
- **Then** the parity harness SHALL strip row padding before interpreting AO
  pixels
- **And** candidate evidence SHALL NOT assume tightly packed readback memory

#### Scenario: Sector-boundary anchors are not promotion anchors

- **Given** horizon masks depend on `atan -> floor/ceil`
- **Then** anchors close to sector boundaries SHALL be treated as
  `boundary-risk`
- **And** promotion evidence SHALL include stable anchors away from sector and
  silhouette discontinuities

#### Scenario: Precision gate is not production promotion

- **Given** a candidate satisfies the WGPU precision envelope
- **Then** it MAY advance to precision-aware GPU fixture comparison
- **And** production VBAO SHALL remain unchanged until fixture labels and Museum
  evidence pass

### Requirement: Upstream GPU Fixture Evidence Matrix

The project SHALL expose the artifact-specific upstream fixtures through the internal GPU/scalar parity route before using screenshots as promotion evidence.

#### Scenario: Artifact fixtures participate in GPU parity

- **Given** the upstream signal correction gate is active
- **Then** the internal GPU/scalar parity scene matrix SHALL include:
  - `thin-gap-parallel-planes`
  - `large-flat-floor-no-curvature`
  - `small-contact-object-on-plane`
  - `grazing-wall-corner`
  - `subpixel-thin-occluder`
- **And** each fixture SHALL expose accepted scalar anchors away from silhouette/coverage discontinuities

#### Scenario: GPU fixture semantics match guarded artifacts

- **Given** the upstream GPU fixture evidence matrix is generated
- **Then** `large-flat-floor-no-curvature` SHALL remain a single flat receiver
- **And** `grazing-wall-corner` SHALL include true non-frontal normals
- **And** `subpixel-thin-occluder` SHALL include a subpixel-width foreground occluder
