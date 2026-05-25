# EVIDENCE - VBAONode

Every rendering claim for `VBAONode` needs reproducible screenshots and timing.
This file is the gate for later adaptive thickness, sampling, denoise, or depth
hierarchy work. No "looks muddy" shortcut: evidence first, then math.

## Required Capture Matrix

Capture each required row in both view modes:

| Field | Required values |
| --- | --- |
| `algorithm` | `gtao`, `vbao`, `n8ao` |
| `viewMode` | `beauty`, `ao` |
| `denoise` | `raw`, `denoised` |
| `resolution` | `1920x1080`, `1280x720` |
| `failureLabels` | `none`, `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`, `scale-mismatch` |

The Museum route is the baseline comparison harness. It exposes raw/denoised
output and a demo-only `Full-res VBAO` control. That control sets VBAO
`resolutionScale = 1.0` for evidence without changing `VBAONodeOptions` or the
locked public quality tiers.

## Row Schema

| Column | Description |
| --- | --- |
| `scene` | Scene name, for example `museum`, `city`, `sponza`, `bunny` |
| `cameraId` | Key from `apps/demo/src/evidence/evidenceCameras.ts` |
| `resolution` | Exact capture dimensions: `1920x1080` or `1280x720` |
| `algorithm` | `gtao`, `vbao`, or `n8ao` |
| `viewMode` | `beauty` or `ao` |
| `denoise` | `raw` or `denoised` |
| `device` | GPU/device name |
| `browser` | Browser and version |
| `renderer` | `webgpu` or `webgl-fallback` |
| `timingMethod` | `webgpu-timestamp`, `frame-median`, `performance-panel`, or `pending` |
| `medianTime_ms` | Median of 10 steady-state frames/passes, or `pending` |
| `radius` | AO radius used |
| `thickness` | Thickness used |
| `slices` | Slice count |
| `samples` | Samples per slice |
| `resolutionScale` | AO render scale, for example `0.5` or `1.0` |
| `sectors` | `32` for VBAO v1 |
| `failureLabels` | Comma-separated labels from the required list |
| `screenshotPath` | Path under `artifacts/`, or `pending` |

## Capture Rows

Status: pending manual WebGPU captures. Headless Playwright smoke tests are not
WebGPU evidence because they may run through fallback paths.

Pending blocker: rows stay unfilled until a WebGPU-capable browser session is
run on an identified device at the required viewport sizes.

| scene | cameraId | resolution | algorithm | viewMode | denoise | device | browser | renderer | timingMethod | medianTime_ms | radius | thickness | slices | samples | resolutionScale | sectors | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| museum | museumBaseline | 1920x1080 | gtao | beauty | raw | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1920x1080 | gtao | beauty | denoised | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1920x1080 | gtao | ao | raw | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1920x1080 | gtao | ao | denoised | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1920x1080 | vbao | beauty | raw | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1920x1080 | vbao | beauty | denoised | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1920x1080 | vbao | ao | raw | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1920x1080 | vbao | ao | denoised | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1920x1080 | n8ao | beauty | raw | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |
| museum | museumBaseline | 1920x1080 | n8ao | beauty | denoised | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |
| museum | museumBaseline | 1920x1080 | n8ao | ao | raw | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |
| museum | museumBaseline | 1920x1080 | n8ao | ao | denoised | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | gtao | beauty | raw | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | gtao | beauty | denoised | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | gtao | ao | raw | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | gtao | ao | denoised | pending | pending | webgpu | pending | pending | 0.25 | 1.0 | n/a | 16 | 0.5 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | vbao | beauty | raw | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1280x720 | vbao | beauty | denoised | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1280x720 | vbao | ao | raw | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1280x720 | vbao | ao | denoised | pending | pending | webgpu | pending | pending | 0.35 | 0.28 | 3 | 8 | 1.0 | 32 | pending | pending |
| museum | museumBaseline | 1280x720 | n8ao | beauty | raw | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | n8ao | beauty | denoised | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | n8ao | ao | raw | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |
| museum | museumBaseline | 1280x720 | n8ao | ao | denoised | pending | pending | webgpu | pending | pending | 32 screen px | 1.0 falloff | n/a | Medium | 1.0 | n/a | pending | pending |

## Manual WebGPU Capture Steps

1. Run `pnpm dev`.
2. Open `/museum` in a WebGPU-capable Chrome/Edge session.
3. Confirm the page reports `data-renderer-backend="webgpu"`.
4. Select `4 split` for broad comparisons or `Single` plus one algorithm for
   isolated captures.
5. Toggle `Beauty` / `AO only` and `Denoise` for every required row.
6. Enable `Full-res VBAO` for VBAO evidence rows.
7. Resize the viewport to `1920x1080`, capture all rows, then repeat at
   `1280x720`.
8. Save screenshots under `artifacts/`:

```txt
artifacts/<scene>__<cameraId>__<resolution>__<algorithm>__<viewMode>__<denoise>.png
```

## GPU Timing

Prefer WebGPU timestamps when available:

```ts
await renderer.resolveTimestampAsync()
const ms = renderer.info.render.timestamp / 1_000_000
```

If direct timestamp access is unavailable from the app scope, use the panel's
steady-state frame median or browser Performance panel and set `timingMethod`
accordingly. Record the median of 10 steady-state frames/passes.

## Failure Label Guide

| Label | Use when |
| --- | --- |
| `none` | No visible failure in the capture |
| `noise` | Grain, speckle, unstable dithering, or structured sample pattern |
| `mud` | Broad over-darkening that loses geometric readability |
| `halo` | Bright/dark outline around silhouettes or contact edges |
| `thin-gap` | Thin geometry closes gaps that should remain visibly open |
| `edge-bleed` | Denoise or sampling leaks AO across depth/normal edges |
| `scale-mismatch` | Radius/thickness looks wrong for the scene scale |

## Later Gates

- Adaptive thickness (`IM-01`) needs rows showing `mud` or `thin-gap`.
- Sampling changes (`IM-03`) need rows showing `noise`.
- Denoise (`IM-05`) needs rows showing raw noise plus timing that justifies the
  extra pass against higher raw sample counts.
- Depth hierarchy (`IM-06`) needs rows showing `scale-mismatch` or distant
  large-radius instability.
