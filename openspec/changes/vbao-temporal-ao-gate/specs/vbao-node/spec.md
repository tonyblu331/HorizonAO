# Delta for vbao-node

## MODIFIED Requirements

### Requirement: Temporal-Free Default Product Output Boundary

The package SHALL expose product AO through one public `VBAONode` product
boundary. Resolve, cleanup, and polish passes are internal reconstruction stages,
not peer public products. The default product path SHALL remain temporal-free and
SHALL NOT allocate history textures, reprojection passes, or TAA-dependent state.

Future temporal behavior MAY be added only as an opt-in product mode after the
evidence gate proves that it improves quality or same-quality performance against
non-temporal alternatives.

#### Scenario: Default product remains temporal-free

- GIVEN a caller constructs `VBAONode` without a temporal mode
- WHEN the product graph is built
- THEN the graph SHALL NOT allocate AO history
- AND it SHALL NOT require frame reprojection
- AND it SHALL NOT require host TAA/TRAA

#### Scenario: Host temporal mode decorrelates sampling only

- GIVEN host temporal mode is enabled by internal evidence/demo plumbing or a
  future public option
- WHEN the product graph is built
- THEN VBAO MAY animate or decorrelate its sampling phase across frames
- AND it SHALL NOT allocate an internal AO history texture
- AND quality claims SHALL state that integration depends on the host temporal
  antialiasing path

#### Scenario: Internal temporal mode owns AO history

- GIVEN internal temporal mode is enabled by internal evidence/demo plumbing or a
  future public option
- WHEN the product graph is built
- THEN VBAO SHALL allocate and own AO history state
- AND temporal accumulation SHALL happen after full-resolution resolve
- AND history SHALL be validated with depth and normal continuity before blending
- AND history SHALL be clamped to current-frame AO neighborhood bounds before
  blending
- AND resize, camera-cut, or invalid reprojection conditions SHALL reset or reject
  history

#### Scenario: Low-resolution output resolves before temporal accumulation

- GIVEN `resolutionScale < 0.99`
- AND internal temporal mode is enabled
- WHEN product AO is generated
- THEN raw low-resolution AO SHALL be cleaned up and resolved to full output
  resolution before temporal accumulation
- AND this change SHALL NOT accumulate unresolved half-resolution raw AO directly

#### Scenario: Temporal mode must beat same-cost alternatives

- GIVEN a temporal mode is proposed for product use
- WHEN evidence is collected
- THEN screenshots, failure labels, and GPU timings SHALL compare temporal output
  against the temporal-free product baseline
- AND they SHALL compare against spending similar cost on higher raw samples,
  full-resolution output, or stronger spatial polish
- AND temporal SHALL NOT be accepted if it improves noise by adding ghosting,
  disocclusion artifacts, mud, halo, edge bleed, or thin-gap loss
