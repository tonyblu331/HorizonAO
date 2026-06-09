# Tasks: AO Comparison Harness Canonicalization

## Phase 1: Verify

- [x] 1.1 Search local Three.js exports for `SSAONode` / TSL `ssao()`.
- [x] 1.2 Confirm `GTAONode` is the available TSL AO node.
- [x] 1.3 Confirm `SSAOPass` / `SSAOShader` are classic WebGL addons.

## Phase 2: Cleanup

- [x] 2.1 Keep SSAO as an explicit WebGPU/TSL baseline in `MuseumScene.tsx`.
- [x] 2.2 Keep SSAO as `createSsaoScalar` in `aoPipelines.ts`.
- [x] 2.3 Keep SSAO in active comparison UI controls while rejecting WebGL
      `SSAOPass` imports.
- [x] 2.4 Reset comparison radius/thickness to product-scale defaults.

## Phase 3: Regression Gates

- [x] 3.1 Update benchmark default mode list.
- [x] 3.2 Update source tests for the new mode list.
- [x] 3.3 Add or verify a source guard against custom SSAO reintroduction.

## Phase 4: Capture

- [x] 4.1 Run focused tests and typecheck.
- [x] 4.2 Capture clean 2x2 beauty screenshot.
- [x] 4.3 Capture clean 2x2 AO-only screenshot.
- [x] 4.4 Inspect screenshots before calling them evidence.
