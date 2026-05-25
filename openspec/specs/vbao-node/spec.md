# VBAONode Capability Specification

## Purpose

The `VBAONode` capability produces scalar ambient-occlusion accessibility from depth, normal, and camera inputs using a Visibility-Bitmask kernel (Therrien et al., arXiv:2301.11376) implemented in Three.js TSL for WebGPU-first execution. It is not a renderer fallback, temporal accumulator, bent-normal system, indirect-diffuse system, or general visibility framework.

## Requirements

### Requirement: Visibility-Bitmask Kernel Contract

The kernel SHALL compute per-slice accessibility from a 32-sector visibility bitmask, using the cosine-weighted reduction as the production formula.

#### Scenario: Cosine-weighted reduction is the production formula

- **GIVEN** the kernel runs on real inputs in the demo
- **WHEN** any pixel's accessibility value is sampled
- **THEN** the value SHALL be derived from `A_i = Σ_k open(k) · max(0, cos(θ_k − γ_i_norm)) / Σ_k max(0, cos(θ_k − γ_i_norm))` averaged across slices and raised to `scale`
- **AND** the popcount-only reduction `1 − countOneBits(M_i)/32` SHALL NOT appear in the kernel output path

#### Scenario: Popcount-only reduction stays a reference ablation

- **GIVEN** the scalar reference `vbaoReference.ts`
- **WHEN** the reference module exposes its public surface
- **THEN** it SHALL export both `popcountReduction(mask)` and `cosineWeightedReduction(mask, gammaNorm)` for parity tests
- **AND** the TSL kernel SHALL only use `cosineWeightedReduction` semantics

#### Scenario: Mirrored slice marching is non-negotiable

- **GIVEN** any slice direction `S_i`
- **WHEN** samples are accumulated into the per-slice mask
- **THEN** the march SHALL iterate `side ∈ {-1, +1}` and project `atan2` against `S_side = side · S_i`
- **AND** both reference and TSL kernel SHALL produce the same bit-exact mask given identical inputs

#### Scenario: Sample-local thickness is perspective-correct

- **GIVEN** a shaded pixel position `P` and a depth-sampled position `Q`
- **WHEN** the blocker back face is reconstructed for the mask interval
- **THEN** the back face SHALL be `Q - thickness * normalize(-Q)`
- **AND** it SHALL NOT use the shaded pixel view vector `normalize(-P)` for that sample-local offset

#### Scenario: Background samples do not occlude

- **GIVEN** a marched sample UV inside the viewport
- **WHEN** its sampled depth is at the far plane/background (`depth >= 1`)
- **THEN** that sample SHALL NOT contribute any sector bits to the per-slice mask
- **AND** it SHALL NOT be reconstructed as a far-plane blocker

#### Scenario: Count-clamped maskRange avoids UB

- **GIVEN** a sector range `[k0, k1Exclusive)` with `count = clamp(k1 - k0, 0, 32)`
- **WHEN** the sample mask is constructed
- **THEN** the implementation SHALL branch on `count == 0`, `count >= 32`, and the general case explicitly
- **AND** it SHALL NOT evaluate `1u << 32`, `(1u << count) - 1u` when `count == 32`, or `0xFFFFFFFFu >> (32 - count)` when `count == 0`

### Requirement: Required Normal Input

`VBAONode` SHALL require a non-null `normalNode` and SHALL NOT provide a silent depth-derived normal fallback in v1.

#### Scenario: Constructor rejects null normal

- **GIVEN** a constructor call `new VBAONode(depthNode, null, camera)` or `new VBAONode(depthNode, undefined, camera)`
- **WHEN** the constructor executes
- **THEN** it SHALL throw `TypeError` with the message `VBAONode: normalNode is required`

#### Scenario: Factory rejects null normal

- **GIVEN** a factory call `vbao(depthNode, null, camera)`
- **WHEN** the factory executes
- **THEN** it SHALL throw the same `TypeError`

#### Scenario: No silent fallback documented

- **GIVEN** the public spec, README, or JSDoc on `VBAONode`
- **WHEN** documentation describes the constructor or factory
- **THEN** no language SHALL imply that depth-derived normals are a supported fallback in v1

### Requirement: GTAONode-Shaped Public API

`VBAONode` SHALL match `GTAONode`'s integration shape (depth/normal/camera + factory + `getTextureNode()` + `setSize()`) while diverging on uniforms where the bitmask kernel makes GTAO knobs obsolete.

#### Scenario: Constructor and factory live in one file

- **GIVEN** the source layout in `packages/horizon-ao/src/`
- **WHEN** consumers import `VBAONode` or `vbao`
- **THEN** both SHALL be exported from `VBAONode.ts` (no separate `vbao.ts`)

#### Scenario: Public uniform surface is closed

- **GIVEN** a constructed `VBAONode` instance
- **WHEN** consumers inspect the public uniform surface
- **THEN** the exposed uniforms SHALL be exactly: `radius`, `thickness`, `scale`, `slices`, `samples`, `resolution`
- **AND** `resolutionScale` SHALL be a writable JS field, not a uniform
- **AND** `sectors` SHALL appear as `readonly sectors = 32` and SHALL NOT be writable

#### Scenario: Dropped GTAO uniforms are absent

- **GIVEN** a constructed `VBAONode` instance
- **WHEN** consumers attempt to read `distanceFallOff`, `distanceExponent`, or `useTemporalFiltering`
- **THEN** these properties SHALL NOT exist on the instance

### Requirement: Sector Count Is Compile-Time

`SECTOR_COUNT` SHALL be fixed at `32` in v1 to ship a single shader variant.

#### Scenario: Options do not accept `sectors`

- **GIVEN** a `VBAONodeOptions` argument passed to constructor or factory
- **WHEN** TypeScript checks the options type
- **THEN** `sectors` SHALL NOT be a key in `VBAONodeOptions`

#### Scenario: Preset applies locked tier values

- **GIVEN** a `VBAONodeOptions` argument with `preset: "fast" | "balanced" | "quality"`
- **WHEN** the options are clamped
- **THEN** the preset SHALL apply the locked `resolutionScale`, `slices`, and `samples` tier values
- **AND** explicit numeric option overrides SHALL take precedence over preset values

#### Scenario: Constant lives in `vbaoConstants.ts`

- **GIVEN** the constants module
- **WHEN** consumers read `SECTOR_COUNT`
- **THEN** it SHALL be exported as `export const SECTOR_COUNT = 32 as const`

### Requirement: Scalar Accessibility Output Semantics

The R channel of the AO texture SHALL store accessibility `A ∈ [0, 1]` where `1` is fully open and `0` is fully dark; downstream code SHALL composite as `color * A`.

#### Scenario: Accessibility, not occlusion

- **GIVEN** a rendered AO frame
- **WHEN** the output texture is sampled at any pixel
- **THEN** the R channel value SHALL be accessibility (post-`pow(A, scale)`), NOT `1 - A`

#### Scenario: Green channel reserved for future denoise

- **GIVEN** the render target format
- **WHEN** the format is described in spec or code comments
- **THEN** the green channel SHALL be reserved for edge metadata used by a future denoise PR
- **AND** v1 SHALL NOT write to the green channel

### Requirement: Quality Tier Values Are Locked

`VBAO_QUALITY_TIERS` SHALL expose three named presets with locked numeric values to minimise shader variants and stabilise EVIDENCE comparisons.

#### Scenario: Tier values match the design lock

- **GIVEN** `vbaoConstants.ts`
- **WHEN** consumers read `VBAO_QUALITY_TIERS`
- **THEN** the values SHALL be:
  - `fast: { resolutionScale: 0.5, slices: 2, samples: 6, sectors: 32 }`
  - `balanced: { resolutionScale: 0.5, slices: 3, samples: 8, sectors: 32 }`
  - `quality: { resolutionScale: 1.0, slices: 4, samples: 10, sectors: 32 }`

#### Scenario: Tier object is immutable

- **GIVEN** the exported `VBAO_QUALITY_TIERS`
- **WHEN** any consumer attempts to mutate a tier value at runtime
- **THEN** TypeScript SHALL reject the mutation via `as const`
- **AND** runtime SHALL throw (the object is frozen)

### Requirement: WebGPU-First Backend Posture

`VBAONode` SHALL ship as WebGPU-first while remaining functional on WebGL2 via Three's TSL fallbacks.

#### Scenario: Native bitcount on WebGPU

- **GIVEN** Three's `WebGPURenderer` with the WebGPU backend
- **WHEN** the kernel emits `countOneBits()` via TSL
- **THEN** the produced WGSL SHALL use the native `countOneBits` builtin

#### Scenario: Emulated bitcount on WebGL2

- **GIVEN** Three's `WebGPURenderer` falling back to WebGL2
- **WHEN** the kernel emits `countOneBits()` via TSL
- **THEN** the GLSL SHALL contain the four-step parallel-popcount emulation from `BitcountNode`

#### Scenario: Documentation declares the asymmetry

- **GIVEN** the README or capability spec
- **WHEN** consumers read about backend support
- **THEN** a sentence SHALL state: "VBAONode is WebGPU-first; WebGL2 is functional but slower and not the primary performance target."

### Requirement: Scope Guard

PR-00 through v1 SHALL NOT introduce temporal filtering, bent normals, indirect diffuse, depth MIPs, denoise, bitmask AO with non-32 sectors, silent depth-derived normal fallback, or ray-tracing.

#### Scenario: Public API exposes no deferred-scope knob

- **GIVEN** the implementation diff for PR-00 through v1
- **WHEN** the public API surface and uniforms are reviewed
- **THEN** no new feature knob for any deferred-scope item SHALL appear

#### Scenario: Denoise gate requires evidence

- **GIVEN** a future PR proposing a denoise pass
- **WHEN** the proposal is reviewed
- **THEN** it SHALL include an `EVIDENCE.md` showing screenshots and GPU timings demonstrating raw VBAO is visibly insufficient
- **AND** it SHALL include a formula for the denoise filter in this spec or its successor before code lands

### Requirement: `parityHarness` Is Not Public

The `parityHarness` test infrastructure SHALL NOT be exported from the package's public surface.

#### Scenario: Public surface contains only VBAO exports

- **GIVEN** `packages/horizon-ao/src/index.ts`
- **WHEN** consumers import from the package
- **THEN** the only exports SHALL be: `VBAONode`, `vbao`, `VBAO_QUALITY_TIERS`, `VBAONodeOptions` (type), `VBAOQualityPreset` (type)
- **AND** `parityHarness` SHALL not appear in any public re-export
