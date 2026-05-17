# HorizonAO

High quality, compact Horizon Based Ambient Occlusion research for WebGPU-first Three.js scenes.

HorizonAO is a small rendering lab for building and validating a modern ambient occlusion pipeline in the browser. The project starts with a WebGPU-first demo scene suite, a typed core package, and test coverage around the public behavior before the AO shader work grows teeth.

![HorizonAO](https://dummyimage.com/1200x520/0a0f11/f5f1e8&text=HorizonAO)

## Why

Ambient occlusion sells contact, scale, and depth. Bad AO does the opposite: it smears corners, darkens everything equally, and hides poor lighting behind mush.

HorizonAO is shaped around a stricter goal:

- crisp contact shadows without over-darkening the scene
- compact settings suitable for real-time demos
- WebGPU-first renderer setup with WebGL fallback through Three.js
- testable scene routes for visual and E2E validation
- a library API that stays small until the renderer design is proven

## Demo Scenes

The demo app includes routes for:

- **Primitive Grid**: instanced boxes on an XZ grid for baseline depth and contact testing.
- **Sponza**: architectural glTF scene for scale, texture, and lighting stress.
- **Suzanne**: neutral clay material for reading shadows and future AO clearly.
- **Stanford Bunny**: classic geometry benchmark via a browser-friendly GLB mirror.

Each scene has its own camera target and third-person orbit controls so the first frame is actually useful. Concepts first, code second. Otherwise you just made a spinning postcard.

## Stack

- Three.js `0.184`
- React Three Fiber `9`
- Drei `10`
- React `19`
- Vite `8`
- TanStack Router
- pnpm workspaces
- tsdown for the core package
- Vitest and Playwright
- TypeScript stable plus `@typescript/native-preview` for TS7 checks

TypeScript 7 is not a stable `typescript@7` package yet. This repo keeps stable TypeScript for ecosystem tooling and runs TS7 preview checks through `tsgo`.

## Repository Layout

```text
apps/demo             Vite + React scene demo
packages/horizon-ao   Core HorizonAO settings package
openspec              SDD proposal, specs, design, and tasks
```

## Getting Started

```sh
pnpm install
pnpm dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Quality Checks

```sh
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm typecheck:tsgo
pnpm lint
```

This project intentionally avoids requiring a production build for local demo work.

## Asset Credits

- **Sponza**: Khronos glTF Sample Assets, based on Crytek Sponza.
- **Suzanne**: Khronos glTF Sample Assets, CC0.
- **Stanford Bunny**: original Stanford Computer Graphics Laboratory model; runtime GLB mirror from `pmndrs/assets`, CC0.

Runtime asset URLs live in `apps/demo/src/assets/modelSources.ts` so they can be mirrored later without changing scene code.

## License

MIT. See [LICENSE.md](./LICENSE.md).
