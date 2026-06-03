# Design: Velocity-Backed VBAO Temporal AO

## Principal Decision

Do not implement temporal AO as a mode flag inside `VBAONode`.

The staff-level design constraint is ownership, not shader cleverness:
`VBAONode` owns current-frame AO. Temporal reuse is a separate integration layer
that must prove it is worth existing. If that proof never arrives, the product
still ships as a clean temporal-free AO node.

The target graph is:

```txt
RawVBAO
  -> optional low-res cleanup
  -> optional JBU resolve
  -> optional velocity-backed temporal accumulation
  -> optional full-res polish
  -> final AO
```

This prevents the common failure mode: temporal starts as one flag, then leaks
conditionals into raw sampling, resolve, polish, benchmark reporting, and public
options. That would be a structural regression even if the first screenshots
look smoother.

## Non-Negotiables

- Temporal-free output remains the product baseline.
- Camera-only reprojection remains rejected.
- Velocity-backed temporal is private until it beats same-cost spatial rows.
- No public knobs for thresholds, blend weight, clamp radius, or reset policy.
- No private previous depth/normal guide copies inside `@horizonao/core`.
- No implementation may make `VBAONode.ts` the temporal orchestration file.
- Every extra target and pass must appear in evidence timing and VRAM inventory.

## Diet Rules

- One new runtime node maximum for internal temporal:
  `VBAOVelocityTemporalNode`.
- No validation helper file until real duplication exists.
- No public temporal type file until a public API review starts.
- No benchmark-only temporal API in `@horizonao/core`.
- No optional bag full of nullable temporal inputs.
- No adaptive blend, confidence history, object ID, depth hierarchy, or
  resolve/polish fusion in v1.

## Public Model

Initial public API stays unchanged:

```ts
vbao(depthNode, normalNode, camera, options)
```

A future public host-only option is allowed only after evidence:

```ts
temporal?: "off" | "host"
```

AO-owned temporal is not public in this change. If it later promotes privately,
it must use an explicit integration object instead of loose optional fields:

```ts
interface VbaoTemporalIntegration {
  readonly mode: "velocity";
  readonly velocityNode: Node;
  readonly previousDepthNode: Node;
  readonly previousNormalNode: Node;
  readonly resetNode?: Node;
}
```

`previousAoNode` is intentionally absent from this integration contract. VBAO may
own a separate AO history target. The host owns guide history.

## Ownership Boundary

`@horizonao/core` may own a separate AO history target after the feasibility gate. It
must not own duplicated previous depth/normal guide history.

Host renderer owns:

- velocity or motion vectors;
- previous depth guide;
- previous normal guide;
- camera-cut and resize reset signal;
- object/material history if available later.
- proof that its velocity convention maps current UV to previous UV.

The demo host uses Three `PassNode.getPreviousTextureNode(...)` for previous
depth and previous normal. That keeps previous guide history in the host pass
instead of adding private guide-copy render targets to VBAO.

VBAO owns:

- current raw AO pass;
- current reconstruction passes;
- separate AO history target when velocity-backed internal temporal is enabled;
- temporal validation and clamp;
- failure diagnostics and timing labels.

Benchmark/verifier owns:

- promotion truth;
- same-cost comparison;
- failure label vocabulary;
- hard candidate mode.

## WGPU Constraints

- Avoid read-write storage texture aliasing.
- Read previous AO from a separate history texture, render current output to a
  distinct target, then copy output into history after the pass.
- Prefer `R16F` AO history first. Do not start with `RG16F` confidence.
- Keep previous guide inputs sampled as textures, not copied private pass
  targets.
- Do not sample from a texture that is also the active render target.
- Recreate history targets on size changes in the private smoke path.
- Reset history on first frame and resize now.
- Treat device/format changes, camera cuts, invalid previous guides, and host
  resets as promotion-blocking evidence gaps until wired and captured.
- Count every extra pass in product timing.
- Keep log-depth conversion cost visible; pre-linearized guide depth is a later
  measured optimization, not a hidden requirement.
- Keep dynamic branches out of raw hot loops. Product presets should still
  resolve fixed loop shapes at construction.

## Temporal Pass Contract

Required:

- `currentAo`: resolved full-resolution AO.
- `currentDepth`: current full-resolution depth.
- `currentNormal`: current full-resolution view normal.
- `velocity`: current pixel to previous-pixel motion.
- `previousAoHistory`: previous AO history texture owned by the temporal node.
- `previousDepthGuide`: host-provided previous depth.
- `previousNormalGuide`: host-provided previous normal.
- `reset`: host reset/camera-cut/resize flag.

Optional later:

- `confidence`: AO confidence or bitmask support metadata.
- `objectId`: object/material identity for stronger rejection.

These are explicitly later. Adding them before the base velocity path wins would
be YAGNI dressed up as architecture.

## Pass Algorithm

```txt
for each full-resolution pixel:
  current = sample current AO
  prevUv = hostVelocityToPreviousUv(uv, velocity)

  valid =
    prevUv inside viewport
    and reset is false
    and previous depth agrees with current reprojected depth
    and previous normal agrees with current normal
    and velocity is finite

  history = sample previous AO at prevUv
  localMinMax = current 3x3 AO neighborhood
  clampedHistory = clamp(history, localMinMax)

  weight = valid ? baseWeight : 0
  out = mix(current, clampedHistory, weight)
```

Start with `baseWeight = 0.8`. Do not expose it.

Before any tuning, diagnostics must answer whether rejected history was caused
by velocity, viewport, depth, normal, reset, or clamp. Otherwise tuning is just
moving numbers until a still image looks acceptable. That is not engineering.

## Feasibility Gate Before Code

Do not start `VBAOVelocityTemporalNode` until the demo proves all of this:

- current velocity is available in the WebGPU/TSL pipeline;
- previous depth and previous normal guides are available without VBAO copying
  them;
- velocity convention is documented with a current-to-previous UV fixture;
- guide history and AO history lifetimes are explicit across resize and DPR
  changes;
- pass timing can distinguish host guide cost from VBAO temporal cost.

If any item fails, the correct outcome is to keep host temporal sampling only.

For Three r184, the velocity convention is inherited from `TRAANode`:

```txt
offsetUv = velocity.xy * vec2(0.5, -0.5)
historyUv = uv - offsetUv
```

## Code Decomposition

Add focused code only when its behavior is needed:

- `VBAOVelocityTemporalNode.ts`: owns AO history and temporal pass.

Do not add `vbaoTemporalValidation.ts`, `vbaoTemporalTypes.ts`, or a generic
temporal framework up front. If one node can hold the private contract cleanly,
one node is enough.

## Staff Review Bar

An implementation is rejected if it:

- adds scattered temporal branches to existing nodes;
- crosses a 1k-line threshold in `VBAONode.ts`;
- depends on `any` casts to blur the host contract;
- hides target allocation in demo or benchmark helpers;
- introduces temporal output without motion-scene evidence;
- changes spatial AO behavior to make temporal look better.
