# Proposal: Bootstrap HorizonAO

## Intent

Create a credible WebGPU-first foundation for HorizonAO without pretending the ambient occlusion renderer exists before its math, sampling strategy, and integration tests are specified.

## Scope

### In Scope

- Initialize a Git-ready pnpm monorepo named HorizonAO.
- Add Vite + React 19 demo app with TanStack Router.
- Add async WebGPU-first R3F Canvas setup using Three `WebGPURenderer`.
- Add scene routes for Sponza, Suzanne, Stanford Bunny, and an instanced primitive grid.
- Add a library package built by `tsdown`.
- Add Vitest and Playwright E2E test scaffolding.

### Out of Scope

- Shipping the final HBAO shader/pass.
- Bundling large model binaries into git.
- Production CDN asset mirroring.

## Capabilities

### New Capabilities

- `repo-foundation`: monorepo, licensing, package scripts, TypeScript strategy.
- `webgpu-demo`: routed WebGPU-first demo scenes and asset manifest.
- `horizon-ao-library`: package API surface for AO settings and future renderer integration.
- `test-strategy`: unit and E2E coverage expectations.

### Modified Capabilities

- None.

## Approach

Use small vertical slices: package metadata, library settings API, demo routing/canvas, scene assets, then tests. WebGPU initialization follows the R3F v9 async `gl` callback pattern and Three's required `await renderer.init()`.

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| WebGPU feature parity gaps | Medium | Keep materials conservative; avoid shader-heavy Drei helpers for now. |
| TS7 tooling incompatibility | High | Run TS7 via `tsgo` alongside stable TS6. |
| Remote asset instability | Medium | Centralize URLs and document mirroring path. |

## Rollback Plan

Remove `apps/demo`, `packages/horizon-ao`, and workspace config; no external services or generated binaries are required.

## Success Criteria

- [ ] Repo has installable pnpm workspace metadata.
- [ ] Demo can run through Vite without a build step.
- [ ] Each route mounts a scene with a canvas.
- [ ] Library package has a tested public settings API.
