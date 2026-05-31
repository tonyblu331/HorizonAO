### Requirement: Internal GT-VBAO Attribution Gate

The project SHALL expose an internal scalar attribution report for the
`support-bitmask-v1` parity gate before any production promotion.

#### Scenario: Attribution rows explain the failing subpixel anchor

- **Given** the target fixture is `subpixel-thin-occluder`
- **And** the target anchor is `subpixel-thin-left-upper-receiver`
- **When** the attribution report is computed
- **Then** it SHALL include the target pixel `[27, 33]`
- **And** it SHALL include rows for `baseline-current`,
  `point-sample-quantized-mask`, `perspective-sample-view-thickness`,
  `acos-free-angle-path`, and `support-bitmask-attribution`
- **And** it SHALL expose slice masks, sample mask popcounts, hit masks,
  supported masks, broad interval counts, and boundary-risk flags
- **And** it SHALL NOT promote production.

#### Scenario: GPU correlation classifies the attribution target

- **Given** the support-bitmask candidate has live GPU fixture readbacks
- **When** the candidate is compared at the target upper receiver anchor
- **Then** the parity result SHALL expose `attributionGpuCorrelation`
- **And** the correlation SHALL include scalar support lift, GPU support lift,
  unresolved support lift, and the candidate absolute error
- **And** a matched candidate target SHALL be labelled `no-candidate-gpu-drift`
- **And** a partial GPU lift with remaining error SHALL still be labelled
  `partial-support-mask-divergence`
- **And** spatial-filter work and production promotion SHALL remain blocked.

#### Scenario: Support-bitmask shader accumulation snapshots previous hits

- **Given** the internal `support-bitmask-v1` shader path is compiled
- **When** a sample interval updates the hit and support masks
- **Then** the shader source SHALL snapshot the previous hit mask before
  computing repeated support
- **And** it SHALL compute next supported and next hit masks explicitly
- **And** this SHALL NOT add constructor options or public exports.

#### Scenario: Sample masks expose sector-boundary attribution

- **Given** the target fixture is `subpixel-thin-occluder`
- **And** the target anchor is `subpixel-thin-left-upper-receiver`
- **When** the attribution report is computed
- **Then** each attribution row SHALL expose per-sample mask details grouped by
  slice
- **And** each sample detail SHALL include slice, side, sample index, theta
  interval, raw/clamped sector interval, mask, popcount, sectors, and
  boundary-risk flags
- **And** high-sector samples near sectors 28/29 SHALL be inspectable.

#### Scenario: Boundary-sector hypotheses quantify the known GPU gap

- **Given** high-sector single-hit samples exist near sectors 28/29
- **When** the attribution report is computed
- **Then** it SHALL include diagnostic boundary-sector hypotheses
- **And** all-high-sector promotion SHALL be allowed to be refuted numerically
- **And** the closest high-sector subset hypothesis SHALL quantify whether the
  known `6/255` support-bitmask GPU gap is explained
- **And** the hypothesis SHALL NOT promote `support-bitmask-v1` or change
  production shader defaults.

#### Scenario: Precision envelope classifies the known high-angle interval

- **Given** the interval has `theta0=1.276090982663153`
- **And** `theta1=1.2852648789144832`
- **When** the WGPU precision envelope is evaluated
- **Then** f64 and simulated f32 sector indices SHALL both produce `[28, 30)`
- **And** the interval SHALL still be labelled boundary-risk
- **And** sectors 28/29 SHALL be reported as boundary-adjacent.

#### Scenario: Live shader diagnostic exposes exact target sample facts

- **Given** `/vbao-parity` renders the internal `support-bitmask-v1` candidate
- **And** the diagnostic target is `subpixel-thin-occluder` /
  `subpixel-thin-left-upper-receiver` at pixel `[27, 33]`, slice `0`,
  side `1`, sample `3`
- **When** the route completes
- **Then** it SHALL expose an internal `supportBitmaskShaderDiagnostic`
- **And** the diagnostic SHALL include live shader-side `thetaFront`,
  `thetaBack`, `k0`, `k1`, `sampleMask`, `hitMask`, `supportedMask`, and
  quantized AO
- **And** the diagnostic SHALL remain internal to `/vbao-parity`; it SHALL NOT
  add constructor options, public exports, spatial-filter work, or production
  shader promotion.

#### Scenario: Live slice diagnostic classifies accumulated support-mask state

- **Given** `/vbao-parity` renders the same internal `support-bitmask-v1`
  target diagnostic
- **When** the route completes
- **Then** it SHALL expose an internal `supportBitmaskSliceDiagnostic`
- **And** the diagnostic SHALL include live and scalar per-slice `hitMask`,
  `supportedMask`, `gammaNorm`, numerator, denominator, accessibility, and
  quantized AO
- **And** for the known target, slice `0` SHALL expose the same live/scalar
  `hitMask=0x3001ff80`
- **And** for the known target, slice `0` SHALL expose matching live/scalar
  `supportedMask=0x2001ff80`
- **And** for the known target, slice `1` SHALL expose matching live/scalar
  masks
- **And** for the known target, live and scalar quantized AO SHALL both be
  `231/255`
- **And** the diagnostic SHALL classify the previous `6/255` drift as closed
  after scalar frontmost-depth parity, not sector interval generation
- **And** the diagnostic SHALL remain internal to `/vbao-parity`; it SHALL NOT
  add constructor options, public exports, spatial-filter work, or production
  shader promotion.

#### Scenario: Live transition diagnostic exposes the repeated-support branch

- **Given** `/vbao-parity` renders the same internal `support-bitmask-v1`
  target diagnostic
- **When** the route completes
- **Then** it SHALL expose an internal `supportBitmaskTransitionDiagnostic`
- **And** the diagnostic SHALL include live and scalar `sampleMask`,
  `previousHitMask`, `previousSupportedMask`, `repeatedSupportMask`,
  `broadSupportMask`, `nextHitMask`, `nextSupportedMask`, and quantized AO
- **And** for the known target, live SHALL expose
  `previousHitMask=0x2001ff80`, `repeatedSupportMask=0x20000000`, and
  `broadSupportMask=0x00000000`
- **And** for the known target, scalar SHALL expose
  `previousHitMask=0x2001ff80`, `repeatedSupportMask=0x20000000`, and
  `broadSupportMask=0x00000000`
- **And** the diagnostic SHALL classify live/scalar repeated-support behavior as
  matched for the target sample after scalar fixture parity
- **And** the diagnostic SHALL remain internal to `/vbao-parity`; it SHALL NOT
  add constructor options, public exports, spatial-filter work, or production
  shader promotion.

#### Scenario: Prior-sample trace identifies the live high-sector contributor

- **Given** `/vbao-parity` renders the same internal `support-bitmask-v1`
  target diagnostic
- **When** the route completes
- **Then** it SHALL expose an internal `supportBitmaskPriorSampleTrace`
- **And** the trace SHALL include live and scalar sample masks for the samples
  before slice `0`, side `1`, sample `3`
- **And** for the known target, live SHALL identify sample order `6` as the
  contributor of sector `29`
- **And** sample order `6` SHALL map to side `1`, sample `2`
- **And** scalar SHALL also identify sample order `6` as the contributor of
  sector `29`
- **And** the diagnostic SHALL remain internal to `/vbao-parity`; it SHALL NOT
  add constructor options, public exports, spatial-filter work, or production
  shader promotion.

#### Scenario: Prior-sample detail classifies geometry/depth mismatch

- **Given** `/vbao-parity` identifies slice `0`, side `1`, sample `2` as the
  prior high-sector contributor
- **When** the route completes
- **Then** it SHALL expose an internal `supportBitmaskPriorSampleDetail`
- **And** the detail SHALL include live and scalar sample screen coordinate,
  sample validity, view-space sample position, adaptive thickness,
  `thetaFront`, `thetaBack`, `k0`, `k1`, and `sampleMask`
- **And** for the known target, live and scalar sample screen coordinates SHALL
  be near-equal
- **And** for the known target, live SHALL expose `sampleMask=0x20000000`,
  `k0=29`, and `k1=30`
- **And** for the known target, scalar SHALL expose `sampleMask=0x20000000`,
  `k0=29`, and `k1=30`
- **And** the diagnostic SHALL classify the previous mismatch as scalar
  geometry/depth sample selection drift, now closed by frontmost-depth parity
- **And** the diagnostic SHALL remain internal to `/vbao-parity`; it SHALL NOT
  add constructor options, public exports, spatial-filter work, or production
  shader promotion.

#### Scenario: Scalar fixture frontmost-depth parity covers the subpixel blocker

- **Given** the fixture is `subpixel-thin-occluder`
- **And** the scalar sampler is evaluated at the known live contributor screen
  coordinate `[0.4889061705, 0.5469606252]`
- **When** the fixture sampler chooses a frontmost surface
- **Then** it SHALL return a valid sample on the foreground occluder at
  approximately `z=-2.42`
- **And** the coverage padding SHALL remain internal fixture metadata
- **And** this SHALL NOT change production shader math, constructor options,
  public exports, spatial-filter work, or Museum defaults.

#### Scenario: Support-bitmask label review blocks unlabeled candidates

- **Given** `support-bitmask-v1` has passed the internal GPU/scalar parity gate
- **When** the route has no human-reviewed labels for the required artifact
  fixtures
- **Then** the parity result SHALL expose an internal `labelGate`
- **And** the gate SHALL expose explicit `pending-review` rows for every
  required fixture and both variants
- **And** `labelGate.verdict` SHALL be `requires-label-review`
- **And** `labelGate.promoteProduction` SHALL be `false`
- **And** the candidate-level verdict MAY remain `ready-for-label-review`
  because the next gate is now visual/fixture labels, not production.

#### Scenario: Support-bitmask label review requires improvement without regressions

- **Given** reviewed label rows exist for `baseline-current` and
  `support-bitmask-v1`
- **When** `support-bitmask-v1` worsens any fixture label
- **Then** the label gate SHALL reject with `reject-support-bitmask-labels`
- **And** it SHALL report the worsened labels.
- **When** `support-bitmask-v1` improves at least one label, worsens none, and
  hardened GPU/scalar parity has passed
- **Then** the label gate SHALL return `ready-for-museum-matrix`
- **And** `promoteProduction` SHALL remain `false`.

#### Scenario: Reviewed label rows are ingested by the candidate comparison

- **Given** the support-bitmask GPU/scalar fixture comparison is green
- **And** reviewed label rows are supplied for every required fixture and
  variant
- **When** the reviewed labels improve at least one fixture and worsen none
- **Then** the support-bitmask candidate result SHALL return
  `ready-for-museum-matrix`
- **And** its nested `labelGate` SHALL contain the supplied reviewed rows
- **And** `promoteProduction` SHALL remain `false`.

#### Scenario: Public API remains unchanged

- **Given** the attribution gate is implemented
- **When** the package public exports are inspected
- **Then** no GT-VBAO attribution helper SHALL be exported from
  `@horizonao/core`
- **And** no support-bitmask label-review helper SHALL be exported from
  `@horizonao/core`
- **And** no `VBAONodeOptions` field SHALL be added.
