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
