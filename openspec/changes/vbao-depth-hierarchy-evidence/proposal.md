# Proposal: VBAO Depth Hierarchy Evidence Gate

## Summary

Add a reference-only depth hierarchy gate for VBAO large-radius evidence. The
change defines when direct full-resolution depth samples are expected to be
unstable, without adding a public `VBAONodeOptions` knob or enabling production
depth MIPs.

## Motivation

The sampling and denoise evidence rejected both schedule promotion and
production denoise promotion. High-sample raw VBAO still shows structured
`noise`, `mud`, and `edge-bleed`, while generic blur trades those failures for
more mud and thin-gap closure. The next responsible question is whether larger
projected sample footprints are overreacting to single full-resolution depth
texels.

## Goals

- Define a deterministic reference model for choosing a depth hierarchy level
  from a projected sample footprint.
- Keep the model frame-independent and history-free.
- Add source/docs contracts that depth hierarchy remains evidence-only.
- Prepare radius stress evidence rows before any production TSL path lands.

## Non-Goals

- No public depth hierarchy, depth MIP, or prefilter option.
- No production render target or WebGPU compute pass.
- No denoise promotion.
- No temporal accumulation or history rejection.

## Decision Rule

Depth hierarchy work may continue only if radius stress captures show
`scale-mismatch` or distant large-radius instability and the reference model
predicts a coarser depth level for those samples.
