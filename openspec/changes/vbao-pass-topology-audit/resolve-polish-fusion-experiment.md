# Resolve/Polish Fusion Experiment

Phase 4 tested a private evidence-only fused resolve-polish candidate after the
high-softness preflight proved low-resolution polish was active.

## Setup

- Scene: `museum`
- Resolutions: 1920x1080 and 1280x720
- View: `ao`
- Output: product half-resolution VBAO
- Softness: `0.75`
- Separate-pass artifact: `artifacts/benchmarks/vbao-resolve-polish-preflight.json`
- Fused-pass artifact: `artifacts/benchmarks/vbao-resolve-polish-fused.json`
- Pass timing samples: 3

## Result

| Row | Separate resolve+polish | Fused resolve-polish | Total delta | Label change |
| --- | ---: | ---: | ---: | --- |
| 1920x1080 AO | 0.288 ms | 3.468 ms | +3.191 ms | none |
| 1280x720 AO | 0.125 ms | 0.381 ms | +0.248 ms | none |

Positive total delta means fused is slower. Lower is better.

The fused pass preserved the same failure labels
(`noise`, `false-curvature`, `scale-mismatch`) and produced nearly identical
quality proxies, but it made the shader much larger and repeated JBU4 inside
each polish tap.

## Decision

Do not fuse `VBAOResolveNode` and `VBAOFullResPolishNode`.

The extra shader work overwhelms the saved render-target round trip. Keep the
separate resolve boundary: it is faster, easier to inspect, and keeps the JBU
contract local.
