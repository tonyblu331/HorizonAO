# Delta for vbao-node

## ADDED Requirements

### Requirement: Reference Evidence Gate Blocks Quality Claims

`VBAONode` SHALL NOT be described as closer to path tracing, production-ready,
or visually superior to baseline AO candidates until committed reference and
render evidence pass the gate.

#### Scenario: Missing candidate rows do not pass

- **Given** the reference evidence gate compares VBAO, GTAO, SSAO, and N8AO
- **When** any required candidate row is absent
- **Then** the gate SHALL mark the comparison as `incomplete` or `fail`
- **And** it SHALL NOT treat the missing row as a pass

#### Scenario: Canonical/product drift remains visible

- **Given** product VBAO intentionally diverges from canonical VBAO behavior
- **When** evidence rows are generated
- **Then** canonical/product drift rows SHALL remain visible in `EVIDENCE.md`
- **And** the product divergence SHALL pass only when ray-cast/render evidence
  and failure labels show that the product result is better

### Requirement: Captured Evidence Uses Pinned Cameras And Required Resolutions

Render evidence SHALL be captured with explicit pinned cameras and required
resolutions before product quality claims are promoted.

#### Scenario: Lab and Museum captures are required

- **Given** the evidence gate is run
- **When** `/lab` or `/museum` evidence is recorded
- **Then** captures SHALL use pinned cameras from
  `apps/demo/src/evidence/evidenceCameras.ts`
- **And** required rows SHALL cover `1920x1080` and `1280x720`
- **And** missing captures SHALL be documented as blockers, not omitted

#### Scenario: Timing rows identify measurement state

- **Given** benchmark rows are written
- **When** pass-level timing is unavailable for raw, cleanup, resolve, polish, or
  total product output
- **Then** the row SHALL use an explicit state such as `unmeasured`, `skipped`,
  or `blocked`
- **And** it SHALL NOT report fake zero-cost timings

### Requirement: Noise Source Changes Require A Comparison Gate

The default VBAO phase/noise atlas SHALL NOT change until an internal comparison
matrix proves a Pareto win.

#### Scenario: Default atlas remains unchanged during experiments

- **Given** current hash atlas, IGN, static STBN, and FAST-like candidates are
  compared
- **When** the comparison runs
- **Then** candidates SHALL remain internal evidence experiments
- **And** `VBAONodeOptions` SHALL NOT expose a public noise-source selector

#### Scenario: Candidate promotion requires no worsened labels

- **Given** a noise-source candidate improves one target label
- **When** it worsens noise, mud, halo, edge bleed, thin-gap preservation,
  scale mismatch, false curvature, or timing
- **Then** the candidate SHALL NOT become the default
- **And** the rejection reason SHALL remain documented

### Requirement: Lint Policy Is Explicit Before Lint Becomes A Gate

`pnpm lint` SHALL only be reported as a passing gate after known repository
policy blockers are resolved or explicitly scoped.

#### Scenario: Node script globals are configured

- **Given** `.mjs` scripts are linted
- **When** Node globals are used
- **Then** `eslint.config.js` SHALL configure those globals or the scripts SHALL
  avoid relying on ambient globals

#### Scenario: TSL typing gaps are scoped

- **Given** Three TSL runtime behavior is wider than its public TypeScript
  declarations
- **When** a narrow lint override is used instead of full typing cleanup
- **Then** the override SHALL be scoped to the affected TSL source files
- **And** the tradeoff SHALL be documented in this change
