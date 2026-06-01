# Delta for vbao-node

## ADDED Requirements

### Requirement: JBU Fallback Uses Manual Four-Tap Reconstruction

`VBAOResolveNode` SHALL keep raw AO targets nearest-filtered and SHALL manually
reconstruct fallback AO from the same four low-resolution AO taps used by the
edge-aware JBU resolve.

#### Scenario: Edge-aware weights are invalid

- GIVEN the center pixel is valid but depth/normal edge weights reject every tap
- WHEN the resolve pass falls back
- THEN fallback AO SHALL be reconstructed from the four bilinear raw AO taps
- AND fallback AO SHALL NOT depend on hardware bilinear filtering

### Requirement: Default Full-Resolution Polish Has A Bounded Tap Budget

The default full-resolution polish path SHALL use the near 8-tap kernel only.
Additional wide taps SHALL NOT run in the default product path without committed
evidence proving the cost and visual tradeoff.

#### Scenario: Default product polish is enabled

- GIVEN `softness > 0` enables full-resolution polish
- WHEN the default product graph is built
- THEN the polish kernel SHALL visit the near Poisson taps
- AND it SHALL NOT also visit the wide taps by default

### Requirement: Low-Resolution Softness Funds Cleanup Before Polish

When `resolutionScale < 0.99`, softness SHALL fund half-resolution cleanup first.
Full-resolution polish SHALL only run when the internal low-resolution polish
budget is greater than zero.

#### Scenario: Low-resolution moderate softness

- GIVEN `resolutionScale < 0.99`
- AND `softness <= 0.5`
- WHEN the product graph is built
- THEN cleanup SHALL receive the softness budget
- AND full-resolution polish SHALL be elided

#### Scenario: Low-resolution high softness

- GIVEN `resolutionScale < 0.99`
- AND `softness > 0.5`
- WHEN the product graph is built
- THEN cleanup SHALL run
- AND full-resolution polish SHALL receive only the remaining thresholded budget

### Requirement: Product Presets Use Fixed Hot-Loop Shapes

Known product quality presets SHALL use fixed hot-loop shapes for the raw VBAO
shader. Advanced explicit `slices` and `samples` overrides MAY retain dynamic
debug behavior.

#### Scenario: Product quality preset is used

- GIVEN a caller constructs `VBAONode` with `quality: "performance"`,
  `"balanced"`, `"quality"`, or `"ultra"`
- WHEN the raw shader graph is built
- THEN the slice/sample loop shape SHALL match the corresponding product preset
- AND those loop bounds SHALL not depend on user-uniform values in the hot path

#### Scenario: Explicit advanced override is used

- GIVEN a caller passes explicit `slices` or `samples`
- WHEN the raw shader graph is built
- THEN the implementation MAY use the advanced dynamic shape
- AND evidence claims SHALL treat this path as debug/development unless separately
  benchmarked

### Requirement: Internal Pass Evidence Is Pass-Level

Evidence for product output SHALL distinguish raw, cleanup, resolve, full polish,
and total product output timing. Elided passes SHALL be reported as skipped, not
as zero-cost passes.

#### Scenario: Full-resolution raw product path

- GIVEN `resolutionScale >= 0.99`
- AND `softness = 0`
- WHEN evidence rows are collected
- THEN cleanup, resolve, and polish SHALL be marked as skipped
- AND the total row SHALL still identify raw output cost

### Requirement: Noise Source Changes Are Evidence-Gated

The default phase/noise source SHALL NOT change unless a frozen comparison shows
an improvement over the current stable hash atlas.

#### Scenario: Candidate noise source is proposed

- GIVEN a candidate such as IGN, static STBN, or a FAST-like tile
- WHEN it is compared against the current stable hash atlas
- THEN the comparison SHALL include failure labels and timing
- AND the candidate SHALL NOT become default if it improves noise by adding mud,
  halo, thin-gap loss, or unbounded cost

### Requirement: Runtime Source Does Not Depend On Reference Reports

Reference and report modules SHALL stay outside the package public API and SHALL
not be imported by runtime product nodes.

#### Scenario: Package exports are inspected

- GIVEN `packages/horizon-ao/src/index.ts`
- WHEN package exports are inspected
- THEN only `VBAONode`, `vbao`, and option types SHALL be exported
- AND reference/report helpers SHALL remain internal test/evidence tools
