# AGENTS.md

## Project Rules

- Use conventional commits.
- Never add `Co-Authored-By` or AI attribution to commits.
- Do not run production build commands unless the user explicitly asks.
- Prefer `rg` for file and text search.
- Keep changes scoped to the requested behavior.
- Verify technical claims against code, package metadata, or official docs before stating them.

## Stack

- pnpm monorepo
- Vite + React demo app in `apps/demo`
- R3F, Drei, and Three.js WebGPU renderer setup
- TanStack Router for route-driven scenes
- `@horizonao/core` package in `packages/horizon-ao` — exports `VBAONode` and `vbao()`
- `tsdown` for library packaging
- Vitest and Playwright for tests
- TypeScript stable plus `@typescript/native-preview` / `tsgo`

## Repository Name

The git repository is named `horizon-ao` for historical reasons. The active node is `VBAONode`
(Visibility Bitmask AO, arXiv:2301.11376). The npm package name `@horizonao/core` is unchanged.
A full repository rename is deferred to a future infra PR.

## Algorithm

`VBAONode` uses a 32-sector visibility bitmask per slice. No falloff heuristic.
Cosine-weighted reduction is the production formula. `normalNode` is required — no
depth-derived normal fallback. See `openspec/specs/vbao-node/spec.md` and
`openspec/adr/ADR-007-vbao-pivot.md`.

## Common Commands

```sh
pnpm install
pnpm dev
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm typecheck:tsgo
pnpm lint
```

## Rendering Notes

- The demo uses `THREE.WebGPURenderer` through an async R3F `Canvas.gl` callback.
- Always call and await `renderer.init()` before returning the renderer to R3F.
- Keep scene camera targets explicit. Setting a camera position without `lookAt` is not a composition.
- Avoid Drei helpers that assume WebGL-only render targets unless WebGPU compatibility has been verified.
- Do not call React state setters from `useFrame`.

## Testing Notes

- Library behavior belongs in Vitest tests.
- Canvas and route smoke coverage belongs in Playwright.
- E2E tests start Vite dev server; they do not require a production build.
- PR-01 correctness tests (flat plane, full hemisphere, two-wall corner, thin occluder) live in
  `packages/horizon-ao/reference/__tests__/vbaoReference.test.ts`. These are the gate for any kernel work.

## Evidence Notes

- Every pass that ships must have screenshots and GPU timings committed to `EVIDENCE.md`.
- Use the pinned cameras in `apps/demo/src/evidence/evidenceCameras.ts` for all captures.
- Resolutions: 1920×1080 (primary) and 1280×720 (secondary).
- See `openspec/adr/ADR-011-raw-first-no-denoise.md` for the evidence gate policy.

## Documentation Notes

- README is front-facing product/project documentation, not a changelog.
- Put internal implementation decisions in `openspec/` or focused ADRs.
- Keep asset credits and license notes visible when adding new models.
