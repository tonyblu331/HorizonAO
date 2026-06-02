# SDD Plan: Velocity-Backed VBAO Temporal AO

## Assumptions

- Current `vbao-temporal-ao-gate` rejection stands.
- Camera-only internal temporal stays forbidden.
- The first valid future implementation consumes velocity and host-provided
  previous guide history.
- `VBAONode` default output remains temporal-free.

## No Stubs Policy

Every implementation slice must either add complete, testable behavior or add
evidence that blocks the next slice. Do not add placeholder nodes, unused types,
public options, or TODO pass slots.

## Earliest Blocking Gate

The missing gate is not shader code. It is the integration contract and the
ability to measure it:

```txt
Can the demo/host provide current velocity plus previous depth/normal guide
history without VBAO copying private guide targets?
```

If no, stop at host temporal sampling and spatial hardening. Do not write a
temporal node hoping the guide contract appears later.

## Phase 0: Decision Record And Rejection Baseline

### RED

- Add or keep source-contract tests proving no runtime
  `VBAOTemporalAccumulationNode` and no public `temporal` option.
- Add a documentation check that this change names the old camera-only path as
  rejected, not pending.

### GREEN

- Record the rejection as the baseline for this new change.
- Add the ADR closeout before any new temporal implementation work.

### VERIFY

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/demo verify:vbao-temporal
git diff --check
```

## Phase 1: Host Velocity Contract

### RED

- Add source-contract coverage requiring velocity-backed temporal proposals to
  mention velocity, previous depth, previous normal, reset, and same-cost gate.
- Add a fixture or smoke route that proves the velocity convention maps current
  UV to previous UV. Direction mistakes here produce convincing garbage.

### GREEN

- Add demo-only plumbing that can expose velocity and previous guide nodes from
  the host scene pass.
- Do not allocate private previous depth/normal targets inside VBAO.
- Record target lifetime and format inventory for current depth, current normal,
  velocity, previous depth, and previous normal.

### VERIFY

```sh
pnpm --filter @horizonao/demo typecheck
node --check apps/demo/scripts/collect-ao-benchmark.mjs
pnpm --filter @horizonao/demo test -- --run apps/demo/src/evidence/evidenceCameras.test.ts
```

### Exit Criteria

- Velocity convention documented.
- Previous guide ownership documented.
- Benchmark can report temporal input availability.
- No VBAO-owned guide copy exists.

## Phase 2: Complete Private AO History Pass

### RED

- Add tests/source contracts for:
  - `VBAOVelocityTemporalNode`;
  - separate AO history target;
  - no guide-history ownership;
  - no public export.

### GREEN

- Implement a private node that fully renders a temporal output.
- Allocate only AO history as an `R16F` render target.
- Recreate AO history on size/device changes.
- Keep the first version visually identical to current AO when history is
  disabled or invalid.
- Do not add a stub node that exists only to be wired later.

### VERIFY

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
```

## Phase 3: Reprojection And Validation

### RED

- Add tests/source contracts for viewport rejection, velocity use, depth
  continuity, normal continuity, reset fallback, and finite velocity rejection.

### GREEN

- Compute `prevUv` from velocity.
- Validate previous guide samples.
- Use current AO when history is invalid.
- Keep thresholds private constants.
- Emit diagnostics for rejection reason counts if the WebGPU path can expose
  them without adding another full-screen product pass. Otherwise keep labels in
  the benchmark classifier.

### VERIFY

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
```

## Phase 4: Clamp And Blend

### RED

- Add source-contract coverage for local AO neighborhood clamp before blend.
- Add failure labels for `ghosting`, `disocclusion`, and `history-smear`.

### GREEN

- Start with 3x3 min/max clamp and `baseWeight = 0.8`.
- Do not add public knobs.
- Do not tune weight until validation diagnostics explain rejection.
- Do not add adaptive weight until fixed-weight evidence identifies a specific
  failure that adaptive weighting can address.
- Do not split validation/clamp helpers unless the node becomes unreadable or
  real duplication appears.

### VERIFY

```sh
pnpm --filter @horizonao/core test
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
```

## Phase 5: Benchmark And Diagnostics

### RED

- Make verifier reject if temporal rows lack screenshots, pass timings,
  same-cost spatial alternatives, or blocking failure labels.

### GREEN

- Capture rows for:
  - `off` product;
  - `host`;
  - `host + TRAA`;
  - velocity-backed private internal;
  - same-cost spatial alternative.
- Include AO-only and beauty views.
- Include at least one motion/disocclusion scene before any candidate verdict.
- Include pass timing and VRAM/target inventory.

### VERIFY

```sh
pnpm --filter @horizonao/demo benchmark:ao
pnpm --filter @horizonao/demo verify:vbao-temporal
```

## Phase 6: Promotion Decision

### Candidate

Promote only if velocity-backed temporal has a material pattern/noise win, lower
or justified total product cost, and no blocking labels.

Candidate also requires a motion-scene pass. Static museum screenshots are
necessary but not sufficient.

### Reject

Reject if it only matches spatial output, adds pass cost, or introduces
ghosting, disocclusion, stripe, edge bleed, thin-gap loss, mud, halo, or scale
mismatch.

### Public API

Only after candidate evidence:

```ts
temporal?: "off" | "host"
```

AO-owned velocity temporal needs a separate public API review after private
candidate status.

## Principal Risks

- Velocity convention mismatch creates stable-looking but wrong history.
- TSL `velocity` availability may not cover all demo/object paths.
- Host guide history may cost more than the temporal win.
- Temporal may hide current-frame raw defects and make screenshots look better
  while motion gets worse.
- Extra render targets may move WebGPU memory pressure before frame time shows
  the problem.

## Explicit Non-Goals

- Solving moving/skinned object identity with material IDs in v1.
- Confidence history.
- Resolve/polish fusion.
- Depth hierarchy or pre-linearized depth.
- Public temporal API.
- README quality claims.
- Extra helper modules for imagined reuse.
