# Tasks: VBAO Adaptive Thickness TSL Port

## Phase 1: Contract And Tests

- [x] 1.1 Add a spec delta for adaptive-thickness shader behavior.
- [x] 1.2 Add RED tests proving the public option surface does not grow.
- [x] 1.3 Add RED tests pinning adaptive constants and reference parity assumptions.

## Phase 2: Shader Port

- [x] 2.1 Add internal adaptive-thickness constants to `VBAONode.ts`.
- [x] 2.2 Replace constant back-face thickness with per-sample adaptive thickness.
- [x] 2.3 Keep background and viewport rejection before adaptive scanning.
- [x] 2.4 Preserve sample-local view direction for the back-face offset.

## Phase 3: Progress And Verification

- [x] 3.1 Update apply-progress with TDD cycle evidence.
- [x] 3.2 Run targeted Vitest reference tests.
- [x] 3.3 Run package TypeScript checks.
- [x] 3.4 Do not run build in this change.
