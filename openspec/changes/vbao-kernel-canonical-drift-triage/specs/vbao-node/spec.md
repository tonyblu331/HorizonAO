# vbao-node Spec Delta

## Modified Requirements

### Requirement: Visibility-Bitmask Kernel Contract

The SDD SHALL NOT change slice reduction, radial spacing, thickness caps, or
phase atlas behavior until the relevant claim has source evidence and a failing
fixture or evidence gate.

#### Scenario: Slice weighting changes require non-axis-aligned evidence

- **GIVEN** the production spec currently requires uniform slice averaging after
  cosine-measure sectorization
- **WHEN** a change proposes projected-normal or cosine-weighted slice reduction
- **THEN** at least one non-axis-aligned reference/product fixture SHALL fail
  under the current uniform reduction
- **AND** the spec or ADR SHALL be updated before `VBAONode.ts` changes.

#### Scenario: Projected-normal weighting candidate is gated

- **GIVEN** the multi-slice/non-axis scalar reference fixture shows a
  warning-level gap between uniform and projected-normal weighted reduction
- **WHEN** runtime slice accumulation is changed
- **THEN** the candidate SHALL use the already-computed projected normal length
  as the slice weight
- **AND** source contracts SHALL be updated in the same change
- **AND** screenshots and GPU timings SHALL be recorded before promotion.

#### Scenario: Empirical thickness cap is documented

- **GIVEN** production source clamps blocker thickness by sample distance
- **WHEN** the clamp constant is reviewed or changed
- **THEN** the SDD SHALL record the current failure it prevents
- **AND** any replacement SHALL include before/after fixture or screenshot
  evidence.

#### Scenario: Sampling and phase optimization preserves behavior

- **GIVEN** the production kernel uses x² radial spacing and a phase-indexed
  atlas for slice/sample stochastic behavior
- **WHEN** spacing or phase computation is optimized
- **THEN** source contracts SHALL prove the accepted behavior
- **AND** generated shader/evidence rows SHALL show no quality regression.
