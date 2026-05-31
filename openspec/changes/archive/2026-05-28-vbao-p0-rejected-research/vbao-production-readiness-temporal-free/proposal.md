# Proposal: VBAO Production-Readiness Audit + Temporal-Free Roadmap

## Summary

Turn the audit findings into enforceable internal gates before attempting any
quality promotion. The first implementation adds a paper/GLSL CPU reference,
guards prototype depth-MIP usage with edge metadata, and defines a
temporal-free filter report contract.

## Motivation

Recent evidence shows current VBAO is paper-inspired but not production-faithful
yet. It has real bitmask machinery, but quality still fails on `noise`, `mud`,
`edge-bleed`, `scale-mismatch`, and `false-curvature`. A better blur is not the
fix; the next gate needs correctness and metadata discipline first.

## Goals

- Compare the current cosine-weighted variant against a paper/GLSL popcount
  reference instead of treating one as automatically correct.
- Prevent the prototype depth prefilter from being mistaken for a production
  XeGTAO/CACAO-style depth hierarchy.
- Define a temporal-free, edge-aware reference filter result that can reject bad
  neighbors before any GPU filter is promoted.
- Keep all additions internal; no public `VBAONodeOptions` expansion.

## Non-Goals

- No production build.
- No public API change.
- No claim that visual quality is accepted.
- No temporal accumulation or history-buffer dependency as the primary fix.
- No promotion of the current depth prefilter.

## Source Anchors

- [SSILVB / VBAO paper](https://arxiv.org/abs/2301.11376)
- [Community GLSL implementation](https://cybereality.com/screen-space-indirect-lighting-with-visibility-bitmask-improvement-to-gtao-ssao-real-time-ambient-occlusion-algorithm-glsl-shader-implementation/)
- [Intel XeGTAO](https://github.com/GameTechDev/XeGTAO)
- [AMD FidelityFX CACAO docs](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/)
- [NVIDIA NRD](https://github.com/NVIDIA-RTX/NRD)
- [Filter-adapted spatiotemporal sampling](https://arxiv.org/abs/2310.15364)
