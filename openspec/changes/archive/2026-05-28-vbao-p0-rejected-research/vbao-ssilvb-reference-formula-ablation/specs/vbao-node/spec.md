## ADDED Requirements

### Requirement: Internal SSILVB/reference formula ablation

The project SHALL expose a demo/benchmark-only formula ablation for VBAO.

#### Scenario: Formula variants are internal only

- **Given** the Museum benchmark selects `production-cosine`
- **Then** it SHALL render the existing raw VBAO production output
- **And** no public `VBAONodeOptions` field SHALL be added

#### Scenario: SSILVB/reference variant is not a promotion

- **Given** the Museum benchmark selects `ssilvb-reference`
- **Then** it SHALL render the internal SSILVB/reference accessibility scalar
- **And** it SHALL NOT use denoise, history, velocity, temporal accumulation, or compatibility aliases
- **And** evidence SHALL decide whether this variant remains diagnostic or becomes a future production candidate

### Requirement: Evidence-first formula decision

The project SHALL keep formula promotion behind an explicit visual and GPU parity decision gate.

#### Scenario: Visual labels block formula promotion

- **Given** SSILVB/reference formula rows contain `mud`, `halo`, `thin-gap`, `edge-bleed`, `false-curvature`, or `scale-mismatch`
- **Then** production SHALL remain `production-cosine`
- **And** the SSILVB/reference formula SHALL remain diagnostic only

#### Scenario: Clean visual rows still require parity

- **Given** SSILVB/reference formula rows have no blocking visual labels
- **When** no explicit hardened GPU parity pass exists for the promoted SSILVB/reference variant
- **Then** the project SHALL require GPU parity before promotion
