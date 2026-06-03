# VBAONode Spec Delta: Velocity-Backed Temporal AO

## ADDED Requirements

### Requirement: Velocity-Backed Temporal Boundary

Any future AO-owned temporal accumulation SHALL require velocity or motion-vector
input and host-provided previous guide history. Camera-matrix-only AO-owned
temporal accumulation SHALL NOT be a valid product path.

#### Scenario: AO-owned temporal requires velocity

- **GIVEN** a temporal accumulation path is introduced
- **WHEN** it validates previous-frame AO
- **THEN** it SHALL consume velocity or motion-vector input
- **AND** it SHALL reject history when velocity is missing or invalid
- **AND** it SHALL NOT rely on camera reprojection alone.

#### Scenario: Previous guide history is host-owned

- **GIVEN** temporal validation needs previous depth and normal
- **WHEN** the temporal path is constructed
- **THEN** previous depth and previous normal SHALL be supplied by the host
- **AND** `@horizonao/core` SHALL NOT allocate duplicated private previous
  depth/normal guide targets for promotion.

#### Scenario: AO history is separate from output

- **GIVEN** velocity-backed temporal is enabled privately
- **WHEN** the temporal pass executes
- **THEN** it SHALL read previous AO history from a separate texture
- **AND** write current temporal output to a distinct render target
- **AND** copy accepted output into AO history after rendering
- **AND** reset history on first frame and resize
- **AND** expose a host reset hook for camera cuts, device/format changes, or
  explicit host resets before promotion.

#### Scenario: Temporal remains evidence-gated

- **GIVEN** public `VBAONodeOptions`
- **WHEN** temporal evidence is not `candidate`
- **THEN** public `temporal` options SHALL remain absent
- **AND** README/product claims SHALL NOT state that temporal improves VBAO
  quality.

#### Scenario: Static evidence is insufficient

- **GIVEN** velocity-backed temporal evidence exists for static scenes
- **WHEN** candidate promotion is evaluated
- **THEN** motion or disocclusion evidence SHALL also exist
- **AND** ghosting or disocclusion failure labels SHALL block promotion.
