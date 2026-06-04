# SDD Plan: AO Comparison Harness Canonicalization

## Current State

The demo comparison harness had drifted from an evidence tool into a mixed
debug surface:

- `SSAO` was an inline custom TSL shader, not a canonical Three.js TSL node.
- The active Three.js package exposes `GTAONode` in `three/addons/tsl/display`
  and classic `SSAOPass` / `SSAOShader` in WebGL postprocessing addons.
- No `SSAONode` or `ssao()` TSL export exists in `three@0.184.0`.
- Radius, thickness, contrast, gamma, and AO-only display boost were tuned as
  screenshot stress knobs instead of a stable parity contract.
- The 2x2 composer can be useful, but only if each pane is backed by a real
  implementation in the same renderer path.

That is not acceptable evidence. A labeled pane must either be a real
implementation or be absent.

## Decision

Restore a WebGPU-native SSAO baseline implemented in TSL. The clean comparison
capture is a 2x2 grid: `SSAO`, `GTAO`, `VBAO`, and `N8AO`.

`SSAO` remains valid as historical research terminology and as classic Three.js
WebGL postprocessing (`SSAOPass`), but the active comparison harness must not
use the WebGL `SSAOPass`. The active `ssao` mode is a renderer-compatible TSL
baseline that runs through the same WebGPU path as the other comparison panes.

## Plan

### Phase 1: Source Verification

Verify Three.js package exports before making implementation claims.

Acceptance:

- Local `node_modules` search shows no `SSAONode` / TSL `ssao()` export.
- Local `node_modules` search shows `GTAONode` TSL and classic
  `SSAOPass` / `SSAOShader` WebGL addons.
- The SDD records the renderer-path distinction.

### Phase 2: Runtime Cleanup

Keep SSAO as explicit TSL/WebGPU baseline code in active demo paths.

Acceptance:

- `MuseumScene.tsx` has an `ssaoRawScalar` TSL path.
- `aoPipelines.ts` has a `createSsaoScalar` helper and render branch.
- UI controls offer an SSAO mode without importing `SSAOPass`.

### Phase 3: Parity Parameters

Separate product AO parameters from display transfer functions.

Acceptance:

- Radius/thickness use product-scale defaults unless a named stress preset is
  explicitly selected.
- VBAO contrast is not exaggerated just to make screenshots readable.
- AO-only display boost/gamma are treated as visualization transforms, not
  algorithm settings.

### Phase 4: Evidence Capture

Capture clean screenshots against one camera composition.

Acceptance:

- The comparison grid includes `SSAO`, `GTAO`, `VBAO`, and `N8AO`.
- The same camera and scene view are used for all panes.
- UI controls are hidden in screenshots.
- Labels identify the three real WebGPU/TSL AO implementations.
- Capture both beauty and AO-only views.

### Phase 5: Regression Gate

Update tests and benchmark defaults so future captures do not request removed
SSAO mode.

Acceptance:

- Benchmark defaults are `off,gtao,ssao,vbao,n8ao`.
- Source tests expect the updated mode list and reject WebGL `SSAOPass` in the
  WebGPU harness.
- `git diff --check` passes.
- Focused tests covering source expectations pass.

## Guardrails

- Do not import WebGL `SSAOPass` inside the WebGPU/TSL 2x2 harness.
- Keep the `ssao` mode labeled as a TSL/WebGPU baseline, not the classic
  `SSAOPass`.
- Do not calibrate algorithm parameters using AO-only display gamma/boost.
- Do not move the camera between panes in a comparison screenshot.
- Do not run production build commands for this change.

## Verification

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts
pnpm --filter @horizonao/demo typecheck
git diff --check
```
