# EVIDENCE — VBAONode

Per the project's evidence-loop discipline (README §"Evidence Loop"): every
rendering pass shipped in core must be backed by:

1. **Screenshots** — same scene, same camera, same resolution, captured at a
   pinned camera position from `apps/demo/src/evidence/evidenceCameras.ts`.
2. **GPU timings** — per-pass milliseconds measured via `renderer.info.render`
   or `trackTimestamp` on two representative machines.
3. **A/B comparison** — VBAONode output alongside the GTAONode baseline where
   the geometry is non-trivial.

No pass is considered "earned" until this file has a committed row for it.

---

## Methodology

### Camera pins

All captures use the named camera IDs from `evidenceCameras.ts`.  The exact
`position`, `target`, and `fov` for each ID are defined there; do not
approximate.

### Resolutions

Every capture is taken at **two resolutions**:

| Alias | Dimensions |
|-------|-----------|
| 1080p | 1920 × 1080 |
| 720p  | 1280 × 720  |

### VBAONode settings at capture time

Settings are logged per row.  Default quality preset at time of capture:

| Parameter        | Value  |
|-----------------|--------|
| `radius`        | 1.25   |
| `thickness`     | 0.25   |
| `scale`         | 1.0    |
| `slices`        | 3      |
| `samples`       | 8      |
| `sectors`       | 32     |
| `resolutionScale` | 0.5  |

### Screenshot naming convention

```
artifacts/<cameraId>__<resolution>__<renderer>__vbao.png
artifacts/<cameraId>__<resolution>__<renderer>__gtao.png   (A/B reference)
```

All artifact files live in `artifacts/` (gitignored by default; add
`!artifacts/*.png` to `.gitignore` when filing the upstream PR).

### GPU timing measurement

With `WebGPURenderer({ trackTimestamp: true })`, read timing after one warm
frame:

```ts
await renderer.resolveTimestampAsync()
const ms = renderer.info.render.timestamp / 1_000_000   // ns → ms
```

Report the median of 10 frames at steady state.

---

## Row schema

| Column | Description |
|--------|-------------|
| `scene` | Scene name (e.g. `grid`, `sponza`) |
| `cameraId` | Key from `evidenceCameras.ts` |
| `resolution` | `1080p` or `720p` |
| `device` | GPU model (e.g. `RTX 4070`) |
| `browser` | Browser + version |
| `renderer` | `webgpu` or `webgl-fallback` |
| `tier` | `balanced` (default) or `fast` / `quality` |
| `radius` | AO radius used |
| `thickness` | Thickness used |
| `slices` | Slice count |
| `samples` | Samples per slice |
| `sectors` | Always 32 in v1 |
| `gpuTime_ms` | Median GPU time for VBAONode pass (10 frames) |
| `screenshotPath` | Path under `artifacts/` |

---

## Captures

> **Status: pending** — screenshots below are placeholders.
> Fill in by running `pnpm dev` and navigating to `/vbao` at each pinned
> camera position, then updating this table.

### Grid scene — VBAONode

| scene | cameraId | resolution | device | browser | renderer | tier | radius | thickness | slices | samples | sectors | gpuTime_ms | screenshotPath |
|-------|----------|-----------|--------|---------|----------|------|--------|-----------|--------|---------|---------|-----------|----------------|
| grid | gridBaseline | 1080p | — | — | — | balanced | 1.25 | 0.25 | 3 | 8 | 32 | — | — |
| grid | gridBaseline | 720p  | — | — | — | balanced | 1.25 | 0.25 | 3 | 8 | 32 | — | — |

### Grid scene — GTAONode baseline (A/B)

| scene | cameraId | resolution | device | browser | renderer | gpuTime_ms | screenshotPath |
|-------|----------|-----------|--------|---------|----------|-----------|----------------|
| grid | gridBaseline | 1080p | — | — | — | — | — |
| grid | gridBaseline | 720p  | — | — | — | — | — |

### Sponza — thin rail (VBAONode vs GTAONode)

| scene | cameraId | resolution | device | renderer | gpuTime_ms | screenshotPath |
|-------|----------|-----------|--------|----------|-----------|----------------|
| sponza | sponzaThinRail | 1080p | — | — | — | — |
| sponza | sponzaThinRail | 720p  | — | — | — | — |

### Sponza — arches

| scene | cameraId | resolution | device | renderer | gpuTime_ms | screenshotPath |
|-------|----------|-----------|--------|----------|-----------|----------------|
| sponza | sponzaArches | 1080p | — | — | — | — |
| sponza | sponzaArches | 720p  | — | — | — | — |

### Sponza — curtains

| scene | cameraId | resolution | device | renderer | gpuTime_ms | screenshotPath |
|-------|----------|-----------|--------|----------|-----------|----------------|
| sponza | sponzaCurtains | 1080p | — | — | — | — |
| sponza | sponzaCurtains | 720p  | — | — | — | — |

### Stanford Bunny

| scene | cameraId | resolution | device | renderer | gpuTime_ms | screenshotPath |
|-------|----------|-----------|--------|----------|-----------|----------------|
| bunny | bunnyEars | 1080p | — | — | — | — |
| bunny | bunnyEars | 720p  | — | — | — | — |

### Suzanne

| scene | cameraId | resolution | device | renderer | gpuTime_ms | screenshotPath |
|-------|----------|-----------|--------|----------|-----------|----------------|
| suzanne | suzanneClay | 1080p | — | — | — | — |
| suzanne | suzanneClay | 720p  | — | — | — | — |

---

## Thin-geometry claim

> **Status: pending**
>
> The headline claim is: VBAONode handles thin geometry (bunny ears, Sponza
> rails) better than GTAONode because per-sector visibility lets a thin
> occluder block only the sectors it actually spans, rather than the full
> half-hemisphere arc that GTAO clamps to.
>
> **Required evidence to mark this claim as supported:**
> - Side-by-side screenshots at `bunnyEars` and `sponzaThinRail` showing
>   that VBAONode produces less halo / less over-occlusion on thin features
>   than GTAONode at the same radius and thickness settings.
> - If the screenshots show no visible difference, the claim is unverified
>   and must be removed from the README until the render path is debugged.

---

## Denoise policy

Raw VBAO ships in v1 with **no denoise pass**.  A denoiser is only added
when EVIDENCE.md contains a row showing specific noise that warrants it.
See ADR-011.

---

## How to fill this in

All VBAO capture routes are live — no additional scene wiring is needed.

| Scene | Route for VBAO capture | Route for GTAONode A/B |
|-------|------------------------|------------------------|
| Grid  | `/vbao`               | `/` (GridScene)        |
| Sponza | `/vbao-sponza`       | `/sponza`              |
| Bunny  | `/vbao-bunny`        | `/bunny`               |
| Suzanne | `/vbao-suzanne`     | `/suzanne`             |

**Steps:**

1. `pnpm dev` — start the Vite dev server.
2. Open each VBAO capture route in Chrome (WebGPU, hardware GPU required).
3. Navigate to each pinned camera using the coordinates in
   `apps/demo/src/evidence/evidenceCameras.ts`.
4. Screenshot at 1080p and 720p (browser DevTools → `…` → More tools →
   Sensors → Device dimensions, or OS window resize to exact dimensions).
5. Save to `artifacts/` with the naming convention above.
6. Read GPU timing from the browser console:
   ```js
   // paste in DevTools console after one warm frame:
   await renderer.resolveTimestampAsync()
   console.log(renderer.info.render.timestamp / 1_000_000, 'ms')
   ```
   (Note: `renderer` must be exposed on `window` — or read from the
   Performance tab `WebGPU timestamp` entries if the console approach
   is blocked by bundler scoping.)
7. Fill in each `—` placeholder in the table above and commit.
