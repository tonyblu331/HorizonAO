# HorizonAO

Focused TSL/WebGPU ambient occlusion node proposal for Three.js.

HorizonAO is a focused TSL/WebGPU AO node that keeps the `GTAONode` integration model, improves the sampling and denoise path, stays AA-agnostic, and proves every extra pass with screenshots and timings before it becomes part of the core.

![HorizonAO](https://dummyimage.com/1200x520/0a0f11/f5f1e8&text=HorizonAO)

## Proposal

Three.js already has a useful AO integration shape in `GTAONode`. HorizonAO starts from that contract instead of inventing a parallel rendering pipeline. The goal is a sharper Horizon Based Ambient Occlusion node for TSL/WebGPU that can be judged as an incremental core-quality proposal.

The constraints are deliberate:

- keep the `GTAONode` style of integration
- improve sampling before adding knobs
- improve denoise before adding more passes
- stay anti-aliasing agnostic
- require screenshots and timings for every extra pass
- keep the public API small until the visual/performance evidence is real

## Demo Scenes

The demo app exists to prove the node proposal under recognizable geometry and lighting conditions:

- **Primitive Grid**: instanced boxes on an XZ grid for baseline depth and contact testing.
- **Sponza**: architectural glTF scene for scale, texture, and lighting stress.
- **Suzanne**: neutral clay material for reading shadows and future AO clearly.
- **Stanford Bunny**: classic geometry benchmark via a browser-friendly GLB mirror.

Each scene has its own camera target and third-person orbit controls so screenshots are repeatable enough to compare sampling, denoise, and timing changes. Concepts first, code second. Otherwise you just made a spinning postcard.

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

## Evidence Loop

Every proposed core change should answer three questions:

- What visual artifact does this fix?
- What does it cost in timing?
- Which screenshot proves the tradeoff?

If a pass cannot justify itself with screenshots and timings, it does not belong in the core. Ponete las pilas: rendering code without evidence is just vibes with uniforms.

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
