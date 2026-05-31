# Delta for vbao-node

## ADDED Requirements

### Requirement: Evidence Baseline Gates VBAO Math Changes

The system SHALL provide a reproducible evidence baseline before future VBAO
math, denoise, or sampling changes are accepted.

#### Scenario: Comparison captures are required

- GIVEN evidence is collected for VBAO visual quality
- WHEN `EVIDENCE.md` is updated
- THEN it SHALL include raw and denoised rows for GTAO, VBAO, and N8AO
- AND each row SHALL identify `beauty` or `ao` view mode

#### Scenario: Required resolutions are captured

- GIVEN a comparison row is added to `EVIDENCE.md`
- WHEN the row describes a required evidence capture
- THEN the resolution SHALL be either `1920x1080` or `1280x720`
- AND both resolutions SHALL be present for each required camera/mode pair

#### Scenario: Failure labels are recorded

- GIVEN a VBAO capture shows a visible problem
- WHEN the capture is documented
- THEN the row SHALL classify the failure as one or more of: `noise`, `mud`,
  `halo`, `thin-gap`, `edge-bleed`, or `scale-mismatch`

### Requirement: Full-Resolution Evidence Mode Is Demo-Local

The system SHALL expose a fair full-resolution VBAO evidence path without
changing the public `VBAONode` API or locked quality tiers.

#### Scenario: Evidence mode does not change core options

- GIVEN the evidence mode is implemented
- WHEN `VBAONodeOptions` and `VBAO_QUALITY_TIERS` are inspected
- THEN no new public option SHALL be added
- AND the locked `fast`, `balanced`, and `quality` tier values SHALL remain unchanged

#### Scenario: Full-resolution VBAO can be compared

- GIVEN the Museum comparison route runs on WebGPU
- WHEN the user selects the evidence comparison mode
- THEN VBAO SHALL render with `resolutionScale = 1.0`
- AND raw and denoised output SHALL remain selectable separately

### Requirement: GPU Timing Evidence Is Explicit

The system SHALL document timing evidence separately from Playwright smoke
coverage because headless browser fallback MAY not exercise WebGPU timing.

#### Scenario: Timing rows identify measurement source

- GIVEN GPU timing is recorded in `EVIDENCE.md`
- WHEN the row is reviewed
- THEN it SHALL include browser, device, renderer backend, timing method, and median frame/pass time

#### Scenario: Automated tests do not replace manual WebGPU evidence

- GIVEN Playwright route smoke tests pass
- WHEN evidence requirements are evaluated
- THEN the change SHALL still require manual WebGPU screenshots and timings before later math changes use the evidence as justification
