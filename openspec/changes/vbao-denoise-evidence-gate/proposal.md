# Change: VBAO Denoise Evidence Gate

## Summary

Gate any spatial denoise pass behind measured raw-noise evidence. The first pass compares raw higher-sample VBAO against raw+spatial denoise and rejects filters that create edge bleed, halos, mud, or thin-gap closure.

## Goals

- Name artifacts explicitly: `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`, `scale-mismatch`.
- Start with spatial depth/normal denoise only.
- Add bitmask confidence metadata only if generic spatial filtering fails.
- Keep temporal accumulation out.

## Non-Goals

- No temporal denoise.
- No public denoise knob until evidence proves it belongs.
- No quality claims without screenshots and median/p95 timings.
