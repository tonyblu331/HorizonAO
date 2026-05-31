# Proposal: VBAO Depth Prefilter Experiment

## Summary

Prototype an internal depth-prefilter experiment for VBAO large-radius rows. The
experiment exists because `EVIDENCE.md` now contains WebGPU radius-stress
captures where direct depth sampling shows `scale-mismatch`.

## Motivation

The previous gates rejected production sampling and production denoise changes.
Large-radius VBAO rows (`radius=0.7`) remain noisy and muddy, and screenshot
review labels them with `scale-mismatch`. The reference depth hierarchy selector
predicts level `1`, so the next falsifiable hypothesis is that direct full-res
depth samples overreact to single texels at larger projected footprints.

## Goals

- Add a reference-only representative-depth rule for coarse depth samples.
- Keep the rule deterministic and history-free.
- Compare any future prefilter experiment against the existing radius-stress
  screenshots and median/p95 envelope.
- Keep all controls internal to the benchmark harness until evidence proves a
  Pareto win.

## Non-Goals

- No public `VBAONodeOptions` depth hierarchy, MIP, prefilter, temporal, or
  denoise knobs.
- No production depth-MIP path in this first slice.
- No claim that VBAO beats XeGTAO/CACAO; this change only tests a local failure.

## Primary References Checked

- XeGTAO's public README describes a `PrefilterDepths` pass that converts depth
  to view space and builds a depth MIP chain before the main pass:
  https://github.com/GameTechDev/XeGTAO
- The same README describes a depth-MIP filter biased around the most distant
  sample with thresholded averaging to reduce thin-occluder overreaction.
- three.js TSL documents depth texture sampling with an optional level node and
  render target output paths:
  https://threejs.org/docs/TSL.html
- three.js `RenderTarget` docs confirm depth textures can be used for later
  processing:
  https://threejs.org/docs/pages/RenderTarget.html

## Decision Rule

Reject the experiment unless baseline-vs-prefilter rows show less
`scale-mismatch` without more `mud`, `thin-gap`, `edge-bleed`, or worse p95 than
the current radius-stress envelope.
