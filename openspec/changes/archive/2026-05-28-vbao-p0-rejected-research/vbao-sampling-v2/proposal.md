# Proposal: VBAO Sampling v2

## Summary

Replace the single per-pixel radial scale with deterministic per-slice/per-step
stratified jitter. The goal is to stop high-sample VBAO from reinforcing the
same screen-space lattice.

## Motivation

Evidence showed high-sample rows still had `noise,mud,edge-bleed`. The old
kernel compressed every sample on a ray by one `radialScale`, so additional
samples could preserve structured bands instead of decorrelating them.

## Goals

- Keep sampling deterministic and history-free.
- Keep schedule switching benchmark-only, not public API.
- Add tests that fail if step gaps are constant for a fixed pixel.
- Update the TSL kernel to use per-step jitter.

## Non-Goals

- No temporal filtering.
- No production schedule promotion until screenshot evidence clears the gate.
- No public `samplingSchedule` option.
