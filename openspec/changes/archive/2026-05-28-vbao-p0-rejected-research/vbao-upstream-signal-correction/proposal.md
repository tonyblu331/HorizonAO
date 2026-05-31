# Proposal: VBAO Upstream Signal Correction

## Why

Recent gates rejected SSILVB/reference formula promotion and the GTVBAO++ per-tap filter. The common failure is not filter placement; raw VBAO still carries structured `noise`, `false-curvature`, and `scale-mismatch` before spatial filtering.

## What

Start an upstream signal correction track that expands artifact-specific oracle fixtures before any new filter work. The next gates focus on sampling distribution and radius/thickness scale correctness.

## Non-goals

- No public `VBAONodeOptions` expansion.
- No new spatial-filter tuning in this change.
- No production build.
