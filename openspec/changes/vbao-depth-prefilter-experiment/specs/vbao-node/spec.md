## ADDED Requirements

### Requirement: Internal Depth Prefilter Experiment

`VBAONode` SHALL keep depth prefiltering internal until evidence proves a
Pareto win against the committed radius-stress baseline.

#### Scenario: Representative depth ignores thin foreground outliers

- **Given** a coarse depth block contains several far surface samples
- **And** one thin foreground outlier
- **When** the reference representative-depth selector runs
- **Then** it chooses the average of samples near the farthest surface
- **And** it does not choose the foreground outlier

#### Scenario: Public API remains unchanged

- **Given** the experiment is active
- **When** the package public surface is inspected
- **Then** `index.ts` does not export a depth prefilter helper
- **And** `VBAONodeOptions` contains no depth hierarchy, depth MIP, or prefilter
  option

#### Scenario: Evidence gate controls promotion

- **Given** a depth prefilter candidate exists
- **When** it lacks baseline-vs-prefilter screenshots, failure labels, and
  median/p95 timing rows
- **Then** the candidate remains internal and cannot become a production path

#### Scenario: Benchmark rows label baseline versus prefilter

- **Given** `AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX` enables the internal
  prefilter matrix
- **When** the harness records radius-stress evidence rows
- **Then** each row includes a `vbaoDepthPrefilterPreset` label
- **And** the only accepted initial labels are `baseline` and `prefilter`
- **And** the label does not imply any public `VBAONodeOptions` knob
