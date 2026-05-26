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
| `vbaoSamplingSchedule` | `magic-square`, `r2`, `hilbert`, `blue-noise`, or `n/a` |
| `vbaoRadiusStressPreset` | `baseline`, `large-radius`, or `n/a` |
| `resolution` | `1920x1080`, `1280x720` |
| `failureLabels` | `none`, `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`, `scale-mismatch`, `false-curvature` |

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
| `vbaoRadiusStressPreset` | Radius stress label for depth hierarchy evidence, or `n/a` |
| `vbaoExpectedDepthHierarchyLevel` | Reference-only expected depth hierarchy level for the radius stress row |
| `thickness` | Thickness used |
| `slices` | Slice count |
| `samples` | Samples per slice |
| `resolutionScale` | AO render scale, for example `0.5` or `1.0` |
| `sectors` | `32` for VBAO v1 |
| `failureLabels` | Comma-separated labels from the required list |
| `screenshotPath` | Path under `artifacts/`, or `pending` |

## Capture Rows

Status: automated headless WebGPU captures exist for the Museum baseline.
Manual on-device captures remain useful for final review, but the benchmark
collector now records `rendererBackend: "webgpu"` and refuses fallback sessions
when `AO_BENCHMARK_REQUIRE_WEBGPU=1` is set.

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

## Benchmark Policy

First-pass benchmark scope is WebGPU apples-to-apples only: Three `GTAONode`,
`n8ao-webgpu`, and `VBAONode` running inside the Museum route. Native XeGTAO
and AMD CACAO are design references, not direct FPS competitors in this repo
until they are actually ported to the same browser/WebGPU harness.

VBAO only "wins" when it is a Pareto improvement: equal or faster at comparable
visual quality, or visibly better at comparable cost. Do not claim a benchmark
win from FPS alone when the capture has worse `noise`, `mud`, `halo`,
`thin-gap`, `edge-bleed`, or `scale-mismatch`.

The Museum route publishes machine-readable rolling stats on
`window.__aoBenchmark.latest`:

| Field | Description |
| --- | --- |
| `scene` | `museum` or `city` |
| `rendererBackend` | `webgpu` or `webgl` |
| `renderMode` | `single` or `compose` |
| `mode` | `off`, `gtao`, `vbao`, `n8ao`, `ssao`, or `compose` |
| `composeModes` | Algorithms rendered side-by-side when `renderMode=compose` |
| `viewMode` | `beauty` or `ao` |
| `denoiseEnabled` | Whether the denoise toggle was enabled |
| `denoiseNote` | Explains rows where a third-party node has internal denoise semantics |
| `fullResolutionVbao` | Whether the demo-only full-res VBAO toggle was enabled |
| `vbaoSamplingSchedule` | Current VBAO sampling label; `magic-square`, `r2`, `hilbert`, `blue-noise`, or `n/a` |
| `vbaoSamplePreset` | `baseline`, `high-sample`, or `n/a` for non-VBAO rows |
| `vbaoDenoiseFilter` | `generic`, `custom-bilateral`, or `n/a` |
| `vbaoRadiusStressPreset` | `baseline`, `large-radius`, or `n/a` for non-VBAO rows |
| `vbaoDepthPrefilterPreset` | `baseline`, `prefilter`, or `n/a` for depth-prefilter experiment rows |
| `vbaoMetadataDebugView` | `none`, `edge-depth`, `edge-normal`, `confidence`, or `n/a`; internal debug only |
| `vbaoRadius` | Active VBAO radius for stress rows, or `0` for non-VBAO rows |
| `vbaoExpectedDepthHierarchyLevel` | Reference-only depth hierarchy level predicted by the radius stress preset |
| `vbaoSamples` | Active VBAO samples per slice, or `0` for non-VBAO rows |
| `vbaoSlices` | Active VBAO slice count, or `0` for non-VBAO rows |
| `fps` | `1000 / avgFrameMs` for the latest reporting window |
| `avgFrameMs` | Average frame time for the latest reporting window |
| `medianFrameMs` | Median frame time for the latest reporting window |
| `p95FrameMs` | 95th percentile frame time for the latest reporting window |
| `reportIndex` | Monotonic stats-window index proving a snapshot came from a new frame window |
| `sampleCount` | Number of frames in the latest reporting window |
| `viewport` | CSS viewport width and height |
| `devicePixelRatio` | Browser device pixel ratio |

`window.__aoBenchmark.snapshot()` also returns an `environment` object:

| Field | Description |
| --- | --- |
| `rendererBackend` | Actual renderer backend: `webgpu` or `webgl` |
| `aoAvailable` | Whether AO comparison controls are usable in this session |
| `navigatorGpu` | Whether `navigator.gpu` exists in the browser |
| `requiredBackend` | Always `webgpu` for apples-to-apples benchmark rows |
| `userAgent` | Browser user agent for audit/debugging |

## Benchmark Rows

Status: pending manual WebGPU benchmark captures. Use the visible FPS panel for
live sanity checks, but record data from `window.__aoBenchmark.snapshot()` so
rows are not copied by eye.

Automated capture command:

```sh
pnpm --dir apps/demo benchmark:ao
```

The script writes `artifacts/benchmarks/ao-benchmark-latest.json`. By default it
uses Playwright's `chromium` channel, which opts into the full new-headless
Chromium path rather than the legacy headless shell. Useful environment overrides:

| Env var | Purpose |
| --- | --- |
| `AO_BENCHMARK_BROWSER_CHANNEL=chrome\|msedge\|chromium\|bundled` | Pick a branded/full browser channel when installed |
| `AO_BENCHMARK_HEADED=1` | Run a headed browser for driver/GPU debugging |
| `AO_BENCHMARK_BROWSER_ARGS="..."` | Append extra Chrome flags for a specific machine |
| `AO_BENCHMARK_SCREENSHOTS=1` | Capture screenshots into `artifacts/benchmarks/screenshots` |
| `AO_BENCHMARK_DENOISE_MATRIX=1` | Capture raw/denoised rows for both Beauty and AO-only views |
| `AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1` | Add raw baseline/high-sample VBAO rows for single and compose comparisons |
| `AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1` | Add raw VBAO schedule rows for `magic-square`, `r2`, `hilbert`, and `blue-noise`; disables the high-sample expansion for that run |
| `AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1` | Add raw baseline/large-radius VBAO rows for the depth hierarchy gate; disables high-sample expansion for that run |
| `AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1` | Capture internal VBAO metadata debug views: `edge-depth`, `edge-normal`, and `confidence` |
| `AO_BENCHMARK_REQUIRE_WEBGPU=1` | Exit non-zero if the session falls back to WebGL |
| `AO_BENCHMARK_EXTERNAL_SERVER=1` | Reuse an already-running demo server |

Local automation note on 2026-05-26: the default Playwright headless shell path
reported `webgl` and disabled AO comparison controls. Switching the collector to
Playwright's `chromium` channel produced `rendererBackend: "webgpu"` with
HeadlessChrome 148. The benchmark collector records fallback sessions as
`status: "blocked"` with `environment` diagnostics instead of inventing rows.

Denoise-gate note on 2026-05-26: `AO_BENCHMARK_DENOISE_MATRIX=1` now expands
the automated run to raw/denoised rows in both Beauty and AO-only views. The
first successful matrix run wrote 32 WebGPU rows to
`artifacts/benchmarks/ao-benchmark-latest.json`; screenshots were intentionally
off for that harness-only verification.

Split-composer note on 2026-05-26: split screenshots are now guarded by an E2E
canvas pixel smoke. The test samples each selected segment and fails black or
missing panels; the bug was a full-canvas clear during scissored segment
rendering.

N8AO note: in this harness the `n8ao-webgpu` node exposes its own internally
filtered output. The demo raw/denoised toggle applies to GTAO/VBAO, but N8AO
rows are annotated with `denoiseNote` because `n8ao` raw/denoised rows are not
true raw-vs-filtered N8AO pairs.

High-sample note on 2026-05-26: `AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1` writes a
separate sample comparison artifact at
`artifacts/benchmarks/ao-vbao-sample-matrix-latest.json` when used with
`AO_BENCHMARK_OUT`. The first run compared raw baseline VBAO (`8` samples,
`3` slices) against raw high-sample VBAO (`16` samples, `3` slices). Screenshot
review did not support "more samples fixes it": high-sample still shows the
magic-square pattern and increases broad darkening in AO-only views. Timings in
that run are useful only as rough medians/p95s because some rows have small
sample windows and startup spikes.

The rows below are one local automated WebGPU timing capture with screenshot
review labels. They are not a quality/perf victory claim: VBAO is fast in this
scene, but the screenshots still show named failures that must be fixed before
claiming a Pareto win.

| scene | cameraId | resolution | renderMode | mode | composeModes | viewMode | denoise | fullResolutionVbao | vbaoSamplingSchedule | renderer | fps | avgFrameMs | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | beauty | raw | false | n/a | webgpu | 325 | 3.08 | 1.6 | 3.5 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | beauty | raw | true | magic-square | webgpu | 634.2 | 1.58 | 1.5 | 2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | beauty | raw | false | n/a | webgpu | 546.2 | 1.83 | 1.9 | 2.3 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | beauty | raw | true | magic-square | webgpu | 411 | 2.43 | 2 | 3.5 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | beauty | denoised | false | n/a | webgpu | 575.4 | 1.74 | 1.7 | 2.3 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | beauty | denoised | true | magic-square | webgpu | 691.2 | 1.45 | 1.4 | 1.6 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | beauty | denoised | false | n/a | webgpu | 646.1 | 1.55 | 1.4 | 2.1 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | beauty | denoised | true | magic-square | webgpu | 372.7 | 2.68 | 2.9 | 3.9 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | ao | raw | false | n/a | webgpu | 847 | 1.18 | 1.1 | 1.7 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | ao | raw | true | magic-square | webgpu | 882.4 | 1.13 | 1.1 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | ao | raw | false | n/a | webgpu | 607.4 | 1.65 | 1.7 | 2.2 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | ao | raw | true | magic-square | webgpu | 419.6 | 2.38 | 2.1 | 3.2 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | gtao | n/a | ao | denoised | false | n/a | webgpu | 749.4 | 1.33 | 1.2 | 2 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__gtao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | single | vbao | n/a | ao | denoised | true | magic-square | webgpu | 838 | 1.19 | 1.1 | 1.7 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__denoised__magic-square.png |
| museum | museumBaseline | 1920x1080 | single | n8ao | n/a | ao | denoised | false | n/a | webgpu | 610.1 | 1.64 | 1.7 | 2.5 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__n8ao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1920x1080 | compose | compose | gtao,vbao,n8ao | ao | denoised | true | magic-square | webgpu | 411 | 2.43 | 2.5 | 3.3 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | beauty | raw | false | n/a | webgpu | 286 | 3.5 | 1.8 | 5.4 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | beauty | raw | true | magic-square | webgpu | 519 | 1.93 | 1.6 | 3.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | beauty | raw | false | n/a | webgpu | 513.2 | 1.95 | 1.9 | 2.4 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__beauty__raw__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | beauty | raw | true | magic-square | webgpu | 333.3 | 3 | 3 | 4.6 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | beauty | denoised | false | n/a | webgpu | 294.4 | 3.4 | 3 | 4.3 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | beauty | denoised | true | magic-square | webgpu | 601.2 | 1.66 | 1.6 | 2.5 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | beauty | denoised | false | n/a | webgpu | 501.7 | 1.99 | 1.7 | 3 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__beauty__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | beauty | denoised | true | magic-square | webgpu | 357.1 | 2.8 | 2.8 | 4.4 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | ao | raw | false | n/a | webgpu | 176.4 | 5.67 | 1.8 | 4 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | ao | raw | true | magic-square | webgpu | 560.7 | 1.78 | 1.2 | 3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | ao | raw | false | n/a | webgpu | 590.6 | 1.69 | 1.3 | 2.6 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__ao__raw__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | ao | raw | true | magic-square | webgpu | 346.8 | 2.88 | 2.6 | 4.8 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| museum | museumBaseline | 1280x720 | single | gtao | n/a | ao | denoised | false | n/a | webgpu | 306.6 | 3.26 | 2.6 | 4.7 | scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__gtao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | single | vbao | n/a | ao | denoised | true | magic-square | webgpu | 570.9 | 1.75 | 1.6 | 2.5 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__denoised__magic-square.png |
| museum | museumBaseline | 1280x720 | single | n8ao | n/a | ao | denoised | false | n/a | webgpu | 565.7 | 1.77 | 1.6 | 3.8 | halo | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__n8ao__single__ao__denoised__n-a.png |
| museum | museumBaseline | 1280x720 | compose | compose | gtao,vbao,n8ao | ao | denoised | true | magic-square | webgpu | 378.3 | 2.64 | 2.7 | 4.8 | mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__denoised__magic-square.png |

## Raw VBAO Sample Comparison

Artifact: `artifacts/benchmarks/ao-vbao-sample-matrix-latest.json`.

| resolution | renderMode | viewMode | preset | samples | slices | fps | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | single | beauty | baseline | 8 | 3 | 785.3 | 1.2 | 1.8 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | single | beauty | high-sample | 16 | 3 | 961.5 | 1.0 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1920x1080 | single | ao | baseline | 8 | 3 | 875.7 | 1.1 | 2.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | single | ao | high-sample | 16 | 3 | 1341.5 | 0.7 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1280x720 | single | beauty | baseline | 8 | 3 | 603.8 | 1.6 | 2.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | single | beauty | high-sample | 16 | 3 | 633.5 | 1.6 | 1.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1280x720 | single | ao | baseline | 8 | 3 | 1045.3 | 0.9 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | single | ao | high-sample | 16 | 3 | 1061.2 | 0.9 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__high-sample.png |

Interpretation: high-sample raw VBAO does not clear the named quality failures.
It increases work on paper and, in AO screenshots, makes contact regions broader
and darker instead of resolving the structured sample pattern. Treat the timing
numbers as preliminary; they do not justify skipping the sampling backtest.

Sampling-schedule note on 2026-05-26: the current evidence points at coherent
screen-space sampling, not merely too few samples. `VBAONode` now supports a
benchmark-only schedule switch and packs deterministic radial scale into the
sampling noise texture alpha. The first schedule matrix run is recorded below:
it does not justify a production schedule switch. R2 and blue-noise reduce the
old diagonal regularity in some AO-only captures, but they still show
`noise,mud,edge-bleed`; Hilbert-style sampling shows a severe checker/grid
pattern in this harness.

## Raw VBAO Schedule Comparison

Artifact: `artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41739 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-schedule-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

The first attempt on the default port timed out waiting for `.benchmark-panel`,
which was consistent with a stale-port or unavailable route session. Re-running
on port `41739` produced `status: "ok"`, `rendererBackend: "webgpu"`, and 56
labelled rows. All rows in the artifact have explicit `failureLabels`.

| resolution | viewMode | schedule | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | magic-square | 1.1 | 1.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | r2 | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__r2.png |
| 1920x1080 | beauty | hilbert | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__hilbert.png |
| 1920x1080 | beauty | blue-noise | 1.2 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__blue-noise.png |
| 1920x1080 | ao | magic-square | 0.8 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | r2 | 0.7 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__r2.png |
| 1920x1080 | ao | hilbert | 0.8 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__hilbert.png |
| 1920x1080 | ao | blue-noise | 0.8 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__blue-noise.png |
| 1280x720 | beauty | magic-square | 1.5 | 2.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | r2 | 1.4 | 1.7 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__r2.png |
| 1280x720 | beauty | hilbert | 1.3 | 1.6 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__hilbert.png |
| 1280x720 | beauty | blue-noise | 1.3 | 1.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__blue-noise.png |
| 1280x720 | ao | magic-square | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | r2 | 1.0 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__r2.png |
| 1280x720 | ao | hilbert | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__hilbert.png |
| 1280x720 | ao | blue-noise | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__blue-noise.png |

Decision: reject a production schedule switch for now. `magic-square` remains
the default because no candidate clears the named quality failures. The next
work should isolate denoise and/or depth hierarchy pressure instead of treating
sampling schedule alone as solved.


## VBAO Sampling v2 Evidence Gate

Artifacts:

- Sample matrix: `artifacts/benchmarks/ao-vbao-sampling-v2-sample-matrix-latest.json`.
- Schedule matrix: `artifacts/benchmarks/ao-vbao-sampling-v2-schedule-matrix-latest.json`.
- Contact sheets:
  - `artifacts/analysis/vbao_sampling_v2_sample_matrix_contact_sheet.png`
  - `artifacts/analysis/vbao_sampling_v2_schedule_matrix_1920_contact_sheet.png`
  - `artifacts/analysis/vbao_sampling_v2_schedule_matrix_1280_contact_sheet.png`

Commands:

```sh
AO_BENCHMARK_PORT=41766 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-sampling-v2-sample AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-sampling-v2-sample-matrix-latest.json node scripts/collect-ao-benchmark.mjs
AO_BENCHMARK_PORT=41767 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_SCHEDULE_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-sampling-v2-schedule AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-sampling-v2-schedule-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

Result: both runs returned `status: "ok"`, `rendererBackend: "webgpu"`, and
captured screenshots. This gate is after the internal per-slice/per-step jitter
change in `VBAONode`; it is not the older alpha-only radial-scale schedule gate.

Sample matrix focus rows:

| resolution | viewMode | preset | schedule | samples | slices | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | baseline | magic-square | 8 | 3 | 1 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | high-sample | magic-square | 16 | 3 | 0.9 | 1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1920x1080 | ao | baseline | magic-square | 8 | 3 | 0.8 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | high-sample | magic-square | 16 | 3 | 0.6 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1280x720 | beauty | baseline | magic-square | 8 | 3 | 1.2 | 2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | high-sample | magic-square | 16 | 3 | 1.2 | 1.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1280x720 | ao | baseline | magic-square | 8 | 3 | 0.7 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | high-sample | magic-square | 16 | 3 | 0.8 | 1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-sample/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__high-sample.png |

Schedule matrix focus rows:

| resolution | viewMode | schedule | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | magic-square | 1.6 | 2.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | r2 | 1.1 | 1.6 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__r2.png |
| 1920x1080 | beauty | hilbert | 0.9 | 1.5 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__hilbert.png |
| 1920x1080 | beauty | blue-noise | 1 | 1.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__blue-noise.png |
| 1920x1080 | ao | magic-square | 0.7 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | r2 | 0.6 | 0.8 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__r2.png |
| 1920x1080 | ao | hilbert | 0.7 | 0.8 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__hilbert.png |
| 1920x1080 | ao | blue-noise | 0.7 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__blue-noise.png |
| 1280x720 | beauty | magic-square | 1.3 | 2.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | r2 | 1.4 | 2.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__r2.png |
| 1280x720 | beauty | hilbert | 1.5 | 2.4 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__hilbert.png |
| 1280x720 | beauty | blue-noise | 1.1 | 1.7 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__blue-noise.png |
| 1280x720 | ao | magic-square | 0.9 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | r2 | 0.9 | 1.3 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__r2.png |
| 1280x720 | ao | hilbert | 0.8 | 1.2 | noise,mud,edge-bleed,false-curvature | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__hilbert.png |
| 1280x720 | ao | blue-noise | 0.8 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots-sampling-v2-schedule/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__blue-noise.png |

Interpretation: sampling v2 is a valid internal step, but it is not a quality
promotion. The per-step jitter removes the old single `radialScale` coupling in
source/contracts, yet the Museum screenshots still show structured sample
patterns, broad muddy darkening, and edge leakage. High-sample rows reduce some
row p95 values and add contact darkness, but they still fail the visual gate.
The Hilbert row is especially instructive: in this harness it creates a visible
checker/grid field, so copying the XeGTAO word "Hilbert" without matching its
full pass structure would be cargo cult, not production discipline.

Decision: keep sampling v2 as internal/demo evidence only and do not promote a
public schedule or quality-tier change. The next work must add edge/confidence
metadata and the ground-truth oracle before another denoise/sampling candidate is
allowed to claim improvement. Faster timing does not beat `noise`, `mud`,
`edge-bleed`, or `false-curvature`.

## VBAO Edge/Confidence + Oracle Reference Gate

Artifacts:

- Metadata reference: `packages/horizon-ao/src/vbaoEdgeConfidence.ts`.
- Oracle reference: `packages/horizon-ao/src/vbaoGroundTruth.ts`.
- Reference filter: `packages/horizon-ao/src/vbaoSpatialDenoise.ts`.
- OpenSpec progress:
  - `openspec/changes/vbao-edge-confidence-metadata/apply-progress.md`
  - `openspec/changes/vbao-groundtruth-quality-oracle/apply-progress.md`

Command:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoEdgeConfidence.test.ts packages/horizon-ao/src/__tests__/vbaoSpatialDenoise.test.ts packages/horizon-ao/src/__tests__/vbaoGroundTruth.test.ts
```

Result: 3 files / 16 tests passed.

Reference formulas now covered by tests:

```text
edgeDepth = abs(dot(Pq - Pp, Np))
edgeNormal = 1 - max(dot(Np, Nq), 0)
confidence = validSampleRatio · exp(-depthRange / σrange) · normalAgreement · maskCoverage

w = kernelWeight
  · confidence
  · exp(-edgeDepth / σd)
  · pow(max(dot(Np, Nq), 0), σn)
```

Oracle-backed candidate gate:

```text
rawScore = 1 - abs(rawAccessibility - expectedAccessibility)
candidateScore = 1 - abs(candidateAccessibility - expectedAccessibility)
accept only when candidateScore does not regress and no failure labels appear
```

Decision: this is an internal reference gate, not a visual promotion. It does
not change `VBAONodeOptions`, `@horizonao/core` exports, or any public quality
tier. Its value is that future denoise/depth/sampling candidates now have a
hard contract: suspicious neighborhoods get low confidence, and a smoother
candidate is rejected if the oracle says it is less correct or it introduces
`mud`, `edge-bleed`, or `false-curvature`.

## VBAO Oracle Fixture Matrix

Artifact: `artifacts/benchmarks/ao-vbao-oracle-fixture-matrix-latest.json`.

Implementation: `packages/horizon-ao/src/vbaoOracleFixtures.ts`.

Validation command:

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoOracleFixtures.test.ts
```

Result: 1 file / 4 tests passed. The JSON artifact was generated from the same
internal fixture evaluator with `sampleCount = 4096`.

| fixture | accessibility | expected range | accepted | failureLabels |
| --- | ---: | --- | --- | --- |
| flat-open | 1.0000 | `[1, 1]` | true | none |
| full-hemisphere-blocked | 0.0000 | `[0, 0]` | true | none |
| two-wall-corner | 0.2500 | `[0.22, 0.28]` | true | none |
| thin-occluder | 0.9817 | `[0.9, 0.99]` | true | none |
| stair-step-negative | 0.6250 | `[0.35, 0.65]` | false | `false-curvature` |
| museum-scale | 0.4651 | `[0.45, 0.7]` | true | none |

Decision: the oracle fixture matrix is now the first objective gate for future
quality claims. It is deliberately small but it covers the failure modes that
kept showing up in screenshots: ordinary open/blocked extremes, corner
occlusion, thin occluder preservation, a `false-curvature` negative control, and
a museum-like mixed-scale row. It remains internal-only and is not exported from
`@horizonao/core`.

## VBAO Metadata Debug View Matrix

Artifact: `artifacts/benchmarks/ao-vbao-metadata-debug-matrix-latest.json`.

Screenshots: `artifacts/benchmarks/screenshots-vbao-metadata-debug/`.

Contact sheet: `artifacts/analysis/vbao_metadata_debug_contact_sheet.png`.

Command:

```sh
AO_BENCHMARK_PORT=41769 AO_BENCHMARK_VBAO_METADATA_DEBUG_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_SCREENSHOT_DIR=artifacts/benchmarks/screenshots-vbao-metadata-debug AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-metadata-debug-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

Result: `status: "ok"`, `rendererBackend: "webgpu"`, 6 single-view VBAO rows.
These are debug-visibility rows, not AO quality rows; they exist so a future
metadata-aware filter can be reviewed instead of guessed.

| resolution | debugView | medianFrameMs | p95FrameMs | reviewer note | screenshotPath |
| --- | --- | ---: | ---: | --- | --- |
| 1920x1080 | edge-depth | 2.5 | 44.0 | Usable discontinuity/tangent-plane proxy, but broad bright fields mean this must not be treated as a final confidence metric. The p95 is a first-row/startup outlier, not a performance claim. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__edge-depth.png |
| 1920x1080 | edge-normal | 0.7 | 1.2 | Good silhouette and normal-discontinuity visibility. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__edge-normal.png |
| 1920x1080 | confidence | 0.8 | 1.4 | Useful internal confidence mask: medium-gray stable surfaces with darker edges/silhouettes. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__confidence.png |
| 1280x720 | edge-depth | 1.0 | 3.8 | Same limitation as 1920: enough to debug edge weighting, not enough to promote a filter. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__edge-depth.png |
| 1280x720 | edge-normal | 0.7 | 1.0 | Good normal-edge debug signal. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__edge-normal.png |
| 1280x720 | confidence | 0.9 | 1.7 | Good enough to guide the next metadata-aware denoise candidate. | artifacts/benchmarks/screenshots-vbao-metadata-debug/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__confidence.png |

Decision: accept the GPU metadata debug harness as internal tooling only. This
does not promote denoise, depth hierarchy, or any public `VBAONodeOptions`
surface. The valuable part is visibility: edge-normal and confidence now expose
the metadata needed for a bitmask-aware filter review. The edge-depth view also
shows why we need discipline: if it is used blindly it can become another
`false-curvature` source.

## VBAO Denoise Gate Comparison

Artifact: `artifacts/benchmarks/ao-vbao-denoise-gate-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41755 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_SAMPLE_MATRIX=1 AO_BENCHMARK_VBAO_DENOISE_FILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-denoise-gate-latest.json node scripts/collect-ao-benchmark.mjs
```

Result: `status: "ok"`, `rendererBackend: "webgpu"`, 48 labelled rows.
The run compares raw baseline, raw high-sample, generic demo denoise, and the
demo-only custom bilateral candidate. The custom candidate is internal to the
Museum benchmark harness; it is not part of `VBAONodeOptions` and is not exported
from `@horizonao/core`.

| resolution | viewMode | denoise | preset | filter | samples | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | raw | baseline | n/a | 8 | 2.0 | 3.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | raw | high-sample | n/a | 16 | 1.1 | 3.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1920x1080 | beauty | denoised | baseline | generic | 8 | 1.3 | 2.6 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square__generic.png |
| 1920x1080 | beauty | denoised | baseline | custom-bilateral | 8 | 1.1 | 2.0 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__denoised__magic-square__custom-bilateral.png |
| 1920x1080 | ao | raw | baseline | n/a | 8 | 0.9 | 1.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | raw | high-sample | n/a | 16 | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1920x1080 | ao | denoised | baseline | generic | 8 | 1.2 | 2.5 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__denoised__magic-square__generic.png |
| 1920x1080 | ao | denoised | baseline | custom-bilateral | 8 | 0.8 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__denoised__magic-square__custom-bilateral.png |
| 1280x720 | beauty | raw | baseline | n/a | 8 | 1.5 | 2.4 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | raw | high-sample | n/a | 16 | 1.4 | 2.0 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__high-sample.png |
| 1280x720 | beauty | denoised | baseline | generic | 8 | 1.5 | 2.0 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__denoised__magic-square__generic.png |
| 1280x720 | beauty | denoised | baseline | custom-bilateral | 8 | 1.3 | 1.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__denoised__magic-square__custom-bilateral.png |
| 1280x720 | ao | raw | baseline | n/a | 8 | 1.0 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | raw | high-sample | n/a | 16 | 1.0 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__high-sample.png |
| 1280x720 | ao | denoised | baseline | generic | 8 | 1.1 | 1.3 | mud,edge-bleed,thin-gap | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__denoised__magic-square__generic.png |
| 1280x720 | ao | denoised | baseline | custom-bilateral | 8 | 1.0 | 1.1 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__denoised__magic-square__custom-bilateral.png |

Decision: reject production denoise promotion for this phase. Generic denoise
reduces visible patterning by adding `mud`, `edge-bleed`, and `thin-gap`
failure. The custom bilateral candidate preserves edges better and has acceptable
median/p95 timings, but it does not materially remove the structured VBAO noise.
The next algorithmic pressure is not "more blur"; it is either depth hierarchy
for large-radius sampling or bitmask/confidence metadata for a filter that knows
which sectors were uncertain.

## VBAO Depth Hierarchy / Radius Stress Matrix

Artifact: `artifacts/benchmarks/ao-vbao-radius-stress-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41763 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-radius-stress-latest.json node scripts/collect-ao-benchmark.mjs
```

The run produced 40 WebGPU rows. The table below records raw VBAO baseline vs
large-radius focus rows; denoised rows remain generic-denoise evidence and do
not promote depth hierarchy.

| resolution | renderMode | viewMode | radiusPreset | radius | expectedDepthLevel | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | single | beauty | baseline | 0.35 | 0 | 1.7 | 2.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | single | beauty | large-radius | 0.7 | 1 | 1.5 | 1.8 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1920x1080 | compose | beauty | baseline | 0.35 | 0 | 3.0 | 4.4 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| 1920x1080 | compose | beauty | large-radius | 0.7 | 1 | 3.4 | 4.6 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square__large-radius.png |
| 1920x1080 | single | ao | baseline | 0.35 | 0 | 1.4 | 5.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | single | ao | large-radius | 0.7 | 1 | 1.1 | 1.8 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1920x1080 | compose | ao | baseline | 0.35 | 0 | 2.6 | 3.1 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| 1920x1080 | compose | ao | large-radius | 0.7 | 1 | 2.3 | 3.5 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square__large-radius.png |
| 1280x720 | single | beauty | baseline | 0.35 | 0 | 2.4 | 3.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | single | beauty | large-radius | 0.7 | 1 | 1.9 | 3.7 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1280x720 | compose | beauty | baseline | 0.35 | 0 | 3.5 | 6.3 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square.png |
| 1280x720 | compose | beauty | large-radius | 0.7 | 1 | 4.1 | 8.6 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__beauty__raw__magic-square__large-radius.png |
| 1280x720 | single | ao | baseline | 0.35 | 0 | 1.1 | 2.5 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | single | ao | large-radius | 0.7 | 1 | 1.2 | 3.2 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1280x720 | compose | ao | baseline | 0.35 | 0 | 3.5 | 8.6 | noise,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square.png |
| 1280x720 | compose | ao | large-radius | 0.7 | 1 | 2.5 | 7.2 | noise,mud,halo,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__compose__compose__gtao-vbao-n8ao__ao__raw__magic-square__large-radius.png |

Decision: continue depth hierarchy investigation, but do not promote a
production depth-MIP path yet. Large-radius rows produce `scale-mismatch` and
broader muddy accessibility while the reference selector predicts level `1`.
The next implementation gate is an internal depth prefilter experiment compared
against these exact rows; it must improve the large-radius captures without
increasing p95 beyond the current envelope.

## VBAO Depth Prefilter Experiment

Artifact: `artifacts/benchmarks/ao-vbao-depth-prefilter-matrix-latest.json`.

Command:

```sh
AO_BENCHMARK_PORT=41764 AO_BENCHMARK_DENOISE_MATRIX=1 AO_BENCHMARK_VBAO_RADIUS_STRESS_MATRIX=1 AO_BENCHMARK_VBAO_DEPTH_PREFILTER_MATRIX=1 AO_BENCHMARK_SCREENSHOTS=1 AO_BENCHMARK_REQUIRE_WEBGPU=1 AO_BENCHMARK_OUT=artifacts/benchmarks/ao-vbao-depth-prefilter-matrix-latest.json node scripts/collect-ao-benchmark.mjs
```

The run produced 56 WebGPU rows. The table below records the single-view raw
VBAO baseline-vs-prefilter rows; compose and denoised rows are kept in the JSON
artifact but do not change the decision.

| resolution | viewMode | radiusPreset | depthPrefilter | radius | expectedDepthLevel | medianFrameMs | p95FrameMs | failureLabels | screenshotPath |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | beauty | baseline | baseline | 0.35 | 0 | 1.1 | 1.6 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square.png |
| 1920x1080 | beauty | baseline | prefilter | 0.35 | 0 | 1.2 | 1.7 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__prefilter.png |
| 1920x1080 | beauty | large-radius | baseline | 0.7 | 1 | 1.0 | 1.4 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1920x1080 | beauty | large-radius | prefilter | 0.7 | 1 | 0.9 | 1.4 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__beauty__raw__magic-square__large-radius__prefilter.png |
| 1920x1080 | ao | baseline | baseline | 0.35 | 0 | 0.6 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square.png |
| 1920x1080 | ao | baseline | prefilter | 0.35 | 0 | 0.6 | 0.9 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__prefilter.png |
| 1920x1080 | ao | large-radius | baseline | 0.7 | 1 | 0.6 | 0.6 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1920x1080 | ao | large-radius | prefilter | 0.7 | 1 | 0.6 | 0.8 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1920x1080__single__vbao__single__ao__raw__magic-square__large-radius__prefilter.png |
| 1280x720 | beauty | baseline | baseline | 0.35 | 0 | 0.9 | 1.2 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square.png |
| 1280x720 | beauty | baseline | prefilter | 0.35 | 0 | 0.9 | 1.5 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__prefilter.png |
| 1280x720 | beauty | large-radius | baseline | 0.7 | 1 | 0.8 | 1.5 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__large-radius.png |
| 1280x720 | beauty | large-radius | prefilter | 0.7 | 1 | 0.8 | 1.1 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__beauty__raw__magic-square__large-radius__prefilter.png |
| 1280x720 | ao | baseline | baseline | 0.35 | 0 | 0.8 | 0.9 | noise,mud,edge-bleed | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square.png |
| 1280x720 | ao | baseline | prefilter | 0.35 | 0 | 0.7 | 1.1 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__prefilter.png |
| 1280x720 | ao | large-radius | baseline | 0.7 | 1 | 0.7 | 0.9 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__large-radius.png |
| 1280x720 | ao | large-radius | prefilter | 0.7 | 1 | 0.9 | 1.1 | noise,mud,edge-bleed,scale-mismatch | artifacts/benchmarks/screenshots/museum__museumBaseline__1280x720__single__vbao__single__ao__raw__magic-square__large-radius__prefilter.png |

Decision: reject the 2x2 farthest-supported depth prefilter candidate. The
candidate stays inside the demo harness only and SHALL NOT become public API.
It keeps the same `noise,mud,edge-bleed,scale-mismatch` labels as baseline and
adds a reviewer-visible staircase / false-curvature artifact: the AO no longer
reads as contact or visibility; it reads like the depth field itself was
quantized into broad steps. Faster median/p95 rows are irrelevant because the
visual signal is worse.

Root cause hypothesis after code and reference review:

- The current schedule switch changes one per-pixel rotation/radial-scale
  texture. It does not implement a per-slice/per-step low-discrepancy sequence,
  so high samples tend to reinforce the same screen-space lattice instead of
  decorrelating it.
- `stepFrac = (j + 1) / samples * radialScale` compresses every step in a pixel
  by the same factor. That helps break aliases locally but also changes effective
  radius per pixel, which can read as broad curvature on smooth planes.
- The demo prefilter is a one-level local 2x2 depth substitution, not a
  XeGTAO/CACAO-style depth MIP hierarchy selected by sample footprint. It
  chooses farthest supported depth around discontinuities and therefore invents
  false large-scale depth bands.
- Generic spatial denoise cannot fix this without edge/confidence metadata; it
  turns the structured error into `mud`, `edge-bleed`, and `thin-gap`.

Reference matrix:

| reference | relevant implementation detail | repo status | candid rating |
| --- | --- | --- | --- |
| [SSILVB / VBAO paper](https://arxiv.org/abs/2301.11376) and [CDRIN notes](https://cdrinmatane.github.io/posts/ssaovb-code/) | 32-sector bitmask replaces two horizon angles; constant thickness controls back-face sectors; low noise is part of the published promise. | Core reference/TSL follows the bitmask idea, cosine-weighted AO, and required normals, but current visual evidence does not meet the low-noise promise. | 5/10 against the paper: mathematically aligned, visually not there yet. |
| [Three `GTAONode`](https://threejs.org/docs/pages/GTAONode.html) | Built-in WebGPU/TSL baseline with radius/thickness/falloff knobs, optional temporal filtering, and manual denoise need when temporal filtering is off. | Local GTAO is a fair Three baseline, not a direct XeGTAO/CACAO competitor. It is smoother in this museum capture but still has scale mismatch. | 6/10 as a local baseline. |
| [Intel XeGTAO](https://github.com/GameTechDev/XeGTAO) | Three compute passes: depth prefilter/MIP chain, main pass emitting AO plus edge data, then spatial denoise; tuned against ray-traced ground truth; Hilbert-driven R2 sampling. | Missing true MIPs, edge data, ground-truth tuning, and Hilbert/R2 per-step sequence. | 3/10 against XeGTAO production discipline. |
| [AMD FidelityFX CACAO](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/) | De-interleaved depth/normal prepare stage, depth MIP chain at medium+ quality, adaptive high quality, edge-aware blur with edge channels. | Missing de-interleaving, adaptive quality, edge channel, and CACAO-style blur. | 3/10 against CACAO production discipline. |
| [Community GLSL / Shadertoy-style SSILVB toys](https://cybereality.com/screen-space-indirect-lighting-with-visibility-bitmask-improvement-to-gtao-ssao-real-time-ambient-occlusion-algorithm-glsl-shader-implementation/) | Often rely on jitter, half-res execution, blur, and sometimes temporal history; they are useful for intuition but not production proof. | Our raw captures are intentionally unblurred evidence. The toy smoothness is not a free correctness claim. | 4/10 visually until we add real sampling/metadata/filter gates. |

Next gate: stop treating a local depth prefilter as the fix. The next candidate
should either (a) implement a real footprint-selected depth hierarchy with edge
metadata, or (b) implement a bitmask-aware sampling/denoise path that emits
enough confidence/edge data to filter without mud. Both require screenshots,
timings, and a ground-truth or analytic reference comparison before promotion.

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
| `false-curvature` | AO forms broad bands, stair-steps, or surface-like gradients that read as geometry/curvature instead of visibility |

## Later Gates

- Adaptive thickness (`IM-01`) needs rows showing `mud` or `thin-gap`.
- Sampling changes (`IM-03`) need rows showing `noise`.
- Denoise (`IM-05`) needs rows showing raw noise plus timing that justifies the
  extra pass against higher raw sample counts.
- Depth hierarchy (`IM-06`) needs rows showing `scale-mismatch` or distant
  large-radius instability.
