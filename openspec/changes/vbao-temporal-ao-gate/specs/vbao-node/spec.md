# Delta for vbao-node

## MODIFIED Requirements

### Requirement: Temporal-Free Default Product Output Boundary

The package SHALL expose product AO through one public `VBAONode` product
boundary. Resolve, cleanup, and polish passes are internal reconstruction stages,
not peer public products. The default product path SHALL remain temporal-free and
SHALL NOT allocate history textures, reprojection passes, or TAA-dependent state.

Future temporal behavior MAY be added only after the evidence gate proves that it
improves quality or same-quality performance against non-temporal alternatives.
Host temporal mode is the only current demo/evidence temporal mode. AO-owned
temporal history requires a separate velocity-backed proposal.

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

#### Scenario: AO-owned internal temporal is removed

- GIVEN `VBAONode` receives internal/demo temporal plumbing
- WHEN the requested mode is `internal`
- THEN VBAO SHALL resolve it to temporal-free product output
- AND it SHALL NOT allocate AO history
- AND it SHALL NOT allocate previous depth or previous normal guide targets
- AND it SHALL NOT expose internal temporal diagnostics

#### Scenario: Future AO-owned temporal requires velocity

- GIVEN AO-owned temporal history is proposed again
- WHEN the proposal defines its input contract
- THEN it SHALL require host-provided velocity or motion vectors
- AND it SHALL consume host-provided guide history through an explicit contract
- AND it SHALL NOT duplicate previous depth/normal guide render targets by default

#### Scenario: Temporal mode must beat same-cost alternatives

- GIVEN a temporal mode is proposed for product use
- WHEN evidence is collected
- THEN screenshots, failure labels, and GPU timings SHALL compare temporal output
  against the temporal-free product baseline
- AND they SHALL compare against spending similar cost on higher raw samples,
  full-resolution output, or stronger spatial polish
- AND temporal SHALL NOT be accepted if it improves noise by adding ghosting,
  disocclusion artifacts, mud, halo, edge bleed, or thin-gap loss
