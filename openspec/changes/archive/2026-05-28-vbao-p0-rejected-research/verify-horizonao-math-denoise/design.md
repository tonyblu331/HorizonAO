# Design: HorizonAO Math Audit, Kernel Correction, And Spatial Denoise

## Technical Approach

Keep HorizonAO TSL-first and raw-kernel focused. Extract scalar math policy into a pure TypeScript module for deterministic tests. Update the TSL raw kernel with magic-square sample rotation and radius jitter. Add a compact `HorizonAoDenoiseNode` that owns a separate `RedFormat` render target and wraps Three's TSL `DenoiseNode` for spatial depth/normal-aware filtering.

## Architecture Decisions

| Decision           | Choice                                               | Alternatives                            | Rationale                                                                              |
| ------------------ | ---------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| Math audit surface | Pure helper module                                   | Shader-only inspection                  | Unit tests can prove scalar policy without needing GPU execution.                      |
| Rotation source    | Magic-square texture like Three `GTAONode`           | Random per frame, blue-noise dependency | Deterministic, local, and aligned with Three's addon.                                  |
| Denoise            | Separate HorizonAO pass wrapping Three `DenoiseNode` | Custom blur shader                      | Keeps this PR focused and follows current Three TSL practice.                          |
| Temporal           | Deferred                                             | Enable by default                       | Temporal needs history confidence, rejection, reset rules, and TRAA interaction proof. |
| XR/stereo          | Deferred research                                    | Implement Wu 2025 now                   | Stereo-aware adaptive SSAO is out of v1 AO baseline scope.                             |

## Data Flow

```text
scene depth + normal + camera
  -> HorizonAoNode raw AO target
  -> HorizonAoDenoiseNode scalar denoise target
  -> createAoDebugOutput
       raw-ao: raw target
       denoised-ao: denoise target
       none: scene color * denoised AO
  -> final AA, if any
```

## File Changes

| File                                            | Action | Description                                           |
| ----------------------------------------------- | ------ | ----------------------------------------------------- |
| `packages/horizon-ao/src/horizonAoMath.ts`      | Create | Scalar math policy and magic-square index generation. |
| `packages/horizon-ao/src/horizonAoNode.ts`      | Modify | Kernel rotation and `HorizonAoDenoiseNode`.           |
| `packages/horizon-ao/src/index.ts`              | Modify | Export math and denoise contracts.                    |
| `packages/horizon-ao/src/parityHarness.ts`      | Modify | Mark `denoised-ao` rendered.                          |
| `apps/demo/src/scenes/HorizonAoRawBaseline.tsx` | Modify | Wire raw AO through denoise pass.                     |
| `apps/demo/src/scenes/aoDebugOutput.ts`         | Modify | Route denoised debug/composite output.                |
| `apps/demo/e2e/scene-routes.spec.ts`            | Modify | Cover `denoised-ao`.                                  |

## Interfaces

```ts
horizonAODenoise(aoNode, depthNode, normalNode, camera, {
  radius,
  lumaPhi,
  depthPhi,
  normalPhi,
})
```

## Testing Strategy

| Layer | What                                                   | Approach                                      |
| ----- | ------------------------------------------------------ | --------------------------------------------- |
| Unit  | clamps, samples, falloff, no-occluder resolve, exports | Vitest                                        |
| Type  | TSL exports and demo wiring                            | `tsc`, `tsgo`                                 |
| E2E   | route smoke, raw AO, denoised AO, debug metadata       | Playwright                                    |
| Build | package build                                          | `pnpm -r build`, explicitly requested by user |

## Migration / Rollout

No migration required. Public `horizonAO(...)` remains stable. Denoise is additive.
