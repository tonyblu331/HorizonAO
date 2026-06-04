# VBAONode Spec Delta: Receiver Visibility Solver

## ADDED Requirements

### Requirement: Receiver-State Architecture Boundary

`VBAONode` SHALL be specified internally as a receiver visibility solver while
preserving the scalar public product API.

#### Scenario: Public scalar output remains stable

- **GIVEN** callers use `VBAONode.getTextureNode()`
- **WHEN** receiver-state internals are refactored or extended
- **THEN** the returned node SHALL keep final scalar product AO semantics
- **AND** `getRawTextureNode()` SHALL remain explicit debug/readback access
- **AND** public `VBAONodeOptions` SHALL NOT expose receiver metadata, masks,
  denoise controls, temporal controls, or directional output controls from this
  change.

#### Scenario: Product controls collapse around contact

- **GIVEN** callers configure product AO
- **WHEN** public options are resolved
- **THEN** `contact` SHALL be the artist-facing finite-occluder/contact-density
  control
- **AND** internal thickness SHALL be derived from radius and contact unless an
  explicit `advanced.thickness` or deprecated top-level `thickness` override is
  provided
- **AND** `thickness`, `contrast`, `slices`, `samples`, and `resolutionScale`
  SHALL NOT be presented as peer product controls.

#### Scenario: Named presets reflect product quality levels

- **GIVEN** callers choose `performance`, `balanced`, `quality`, or `ultra`
- **WHEN** preset defaults are applied
- **THEN** all presets SHALL keep the same 32-sector mask contract
- **AND** `performance` MAY use half-resolution raw AO
- **AND** `balanced` SHALL use a higher-than-half raw resolution
- **AND** `quality` and `ultra` SHALL use full-resolution raw AO unless a later
  evidence gate changes the preset policy
- **AND** low-level resolution overrides SHALL remain explicit evidence or
  advanced controls.

#### Scenario: Receiver estimate owns visibility semantics

- **GIVEN** the raw kernel estimates accessibility for a shaded surface point
- **WHEN** implementation or documentation describes the raw result
- **THEN** it SHALL treat the 32-sector bitmask as compact receiver visibility
  state
- **AND** reconstruction SHALL be described as compatible receiver-state
  reconstruction rather than generic AO texture blur.

#### Scenario: Metadata earns bandwidth

- **GIVEN** receiver metadata such as confidence, support, edge data, or mask
  moments is proposed
- **WHEN** the candidate is evaluated
- **THEN** the candidate SHALL identify what cost or ambiguity it replaces
- **AND** it SHALL include source/reference tests or evidence rows before
  promotion
- **AND** it SHALL remain private unless a separate public API SDD proves a
  user-facing need.

#### Scenario: Private confidence guides reconstruction

- **GIVEN** the private receiver confidence sidecar is enabled
- **WHEN** product reconstruction uses cleanup or polish
- **THEN** `VBAONode` SHALL own the confidence sidecar lifecycle
- **AND** cleanup/polish SHALL consume confidence internally without adding a
  public option, getter, or package export
- **AND** high confidence SHALL preserve the raw receiver estimate more than low
  confidence
- **AND** any benchmark row for confidence SHALL remain private evidence, not a
  public output contract.

#### Scenario: Reuse is receiver-state compatibility

- **GIVEN** spatial or temporal reuse is proposed
- **WHEN** previous or neighboring data contributes to current AO
- **THEN** reuse SHALL validate receiver compatibility using geometry and
  history ownership evidence
- **AND** it SHALL NOT reuse final darkness blindly as a substitute for
  visibility-state compatibility.

#### Scenario: Directional outputs derive from visibility state

- **GIVEN** bent, bucketed, or directional visibility output is proposed
- **WHEN** the output is computed
- **THEN** it SHALL derive from open sectors or receiver visibility metadata
- **AND** it SHALL NOT be implemented as a separate estimator that bypasses the
  scalar VBAO receiver state.
