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
- `@horizonao/core` package in `packages/horizon-ao`
- `tsdown` for library packaging
- Vitest and Playwright for tests
- TypeScript stable plus `@typescript/native-preview` / `tsgo`

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

## Documentation Notes

- README is front-facing product/project documentation, not a changelog.
- Put internal implementation decisions in `openspec/` or focused docs.
- Keep asset credits and license notes visible when adding new models.
