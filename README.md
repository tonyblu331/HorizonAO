# VBAONode

Visibility Bitmask Ambient Occlusion for Three.js TSL/WebGPU.

> **Note on the repository name:** The git repository is named `horizon-ao` for historical reasons — it began as a signed-horizon GTAO-class node. The active implementation is now `VBAONode`, a 2023-algorithm replacement based on Therrien, Levesque & Gilet (*Screen Space Indirect Lighting with Visibility Bitmask*, arXiv:2301.11376). A repository rename is deferred to a future infra PR; it does not affect the npm package or the source.

`VBAONode` replaces the dual-scalar horizon approach of `GTAONode` with a 32-bit per-slice visibility mask. The representation is designed to preserve thin geometry better than a single horizon envelope, but release-quality thin/contact behavior is still gated by reference observations and captured evidence. There is no falloff heuristic — the bitmask model eliminates it by construction. The integration shape is compatible with `GTAONode`.

![VBAO demo placeholder](https://dummyimage.com/1200x520/0a0f11/f5f1e8&text=VBAONode)

## Algorithm

Each pixel marches `slices` slice directions. Per slice:

1. March `samples` steps outward on both sides of the slice axis.
2. Each sample contributes a bit range `[k₀, k₁)` to a 32-sector visibility mask.
3. Accessibility is computed with a cosine-weighted reduction: `A_i = Σ_k open(k)·max(0, cos(θ_k − γ_i)) / Σ_k max(0, cos(θ_k − γ_i))`.
4. Final: `A = mean(A_i)`, stored as `pow(A, scale)` in the R channel.

Reference: [arXiv:2301.11376](https://arxiv.org/abs/2301.11376).

## Current Readiness

The current release-readiness verdict is **incomplete**, not production-ready.

The release gap closure SDD captured `/lab` and `/museum` render evidence at
`1920x1080` and `1280x720`, added promotion-gate reporting, and verified
generated shader loop shape. It did not promote VBAO as release-ready because
rendered proxy rows still block on missing reference observations, threshold
rows remain incomplete, and current VBAO product rows retain `noise` /
`edge-bleed` labels.

See:

- `EVIDENCE.md`
- `openspec/changes/vbao-release-gap-closure/release-readiness-report.md`
- `openspec/adr/ADR-015-release-gap-closure-verdict.md`

## Proposal

Three.js has `GTAONode`, a radiometrically correct 2016-class HBAO implementation. `VBAONode` is the 2023 step-change: same `GTAONode` integration shape, but visibility-bitmask math instead of dual-scalar horizons. The goals:

- No falloff heuristic — the mask model handles it.
- Correct thin-geometry behavior — thickness is a sector range, not a depth cutoff.
- WebGPU-first — `countOneBits()` is one cycle in WGSL; WebGL2 is functional but slower.
- Evidence loop — every pass requires screenshots + GPU timings before it ships.
- AO scalar only in v1 — no GI, no bent normals, no denoise without evidence.

## Demo Scenes

- **Primitive Grid**: instanced boxes for baseline depth and contact shadow testing.
- **Sponza**: architectural glTF for thin-geometry and large-scale AO.
- **Suzanne**: neutral clay material, shadow and AO readability.
- **Stanford Bunny**: thin-ear geometry — the canonical thin-occluder benchmark.

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

## Repository Layout

```text
apps/demo                Vite + React scene demo
packages/horizon-ao      Core VBAONode package (npm: @horizonao/core)
openspec                 SDD specs, ADRs, and change proposals
openspec/archive         Archived signed-horizon docs (historical)
archive                  Archived signed-horizon source (historical)
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

Every proposed pass must answer:

- What visual artifact does this fix?
- What does it cost in GPU time?
- Which screenshot proves the tradeoff?

No pass ships without committed screenshots and timings in `EVIDENCE.md`. See `openspec/adr/ADR-011-raw-first-no-denoise.md`.

## Quality Checks

```sh
pnpm test
pnpm test:e2e
pnpm typecheck
pnpm typecheck:tsgo
pnpm lint
```

## Asset Credits

- **Sponza**: Khronos glTF Sample Assets, based on Crytek Sponza.
- **Suzanne**: Khronos glTF Sample Assets, CC0.
- **Stanford Bunny**: original Stanford Computer Graphics Laboratory model; runtime GLB from `pmndrs/assets`, CC0.

Runtime asset URLs live in `apps/demo/src/assets/modelSources.ts`.

## License

MIT. See [LICENSE.md](./LICENSE.md).
