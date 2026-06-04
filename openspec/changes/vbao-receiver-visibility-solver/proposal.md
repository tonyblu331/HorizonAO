# Change: VBAO Receiver Visibility Solver

## Summary

Reframe `VBAONode` as a receiver visibility solver instead of a screen-space AO
post effect. The public output remains scalar AO, but the internal architecture
is shaped around receiver state: estimate visibility, validate geometry,
reconstruct compatible signal, and only then consider accumulation or directional
outputs.

This is not a prototype label and not a marketing claim. It is the next product
architecture direction for HorizonAO.

## Motivation

The pasted review is right about the strategic shape: the 32-sector visibility
mask is not disposable shader scratch. It is the compressed visibility state for
one receiver and slice. Treating it that way changes the engineering questions:

- why a sample is trusted;
- what information survives reconstruction;
- when a neighbor or previous frame is compatible;
- which metadata can replace more samples or wider polish;
- where compute or depth preparation actually earns its cost.

The current repo already has many correct pieces: visibility bitmasks,
cosine-measure sectorization, projected-normal slice weighting, required normal
input, internal reconstruction, evidence labels, and private temporal gates.
The missing step is to make those pieces one architecture instead of a sequence
of postprocess passes plus separate research candidates.

## What This Replaces

This replaces the legacy mental model:

```text
raw AO texture
-> optional cleanup
-> upsample
-> polish/denoise
-> maybe temporal later
```

with the receiver-solver model:

```text
receiver inputs
-> estimate compact visibility
-> validate receiver/sample compatibility
-> derive scalar AO and confidence/support
-> reconstruct only compatible signal
-> accumulate only validated receiver state
-> integrate scalar or directional outputs
```

The runtime graph may still contain render passes named raw, cleanup, resolve,
polish, and temporal. The change is that those passes are now implementation
stages of receiver-state handling, not the architecture itself.

## Goals

- Define the internal receiver-state contract for current scalar AO and future
  metadata.
- Collapse the artist-facing product model around `radius`, `strength`,
  `contact`, `softness`, and `quality`.
- Shape confidence/support as the first major receiver-state extension.
- Route compute, depth hierarchy, temporal, and directional visibility into the
  receiver model instead of treating them as separate feature tracks.
- Identify the refactors needed to make the current source reflect the model.
- Keep public `VBAONodeOptions` compact while internal evidence determines what
  state earns bandwidth.

## Non-Goals

- No public temporal option from this change.
- No public denoise, confidence, mask, bent-normal, sector-count, or atlas knob.
- No `R32Uint` mask cache in production until a later gate proves it replaces
  enough sampling, diagnostics, or directional work.
- No claim that VBAO is path-tracing-close or production-ready.
- No production build.

## Product Direction

HorizonAO should become a GPU-resident receiver visibility product in stages:

1. Scalar receiver AO remains the shipping output.
2. `contact` becomes the artist-facing finite-occluder prior while internal
   thickness remains an override.
3. Confidence/support becomes internal metadata if it reduces artifacts or pass
   cost.
4. Depth/edge metadata and compute candidates support the receiver state only
   where evidence proves a named win.
5. Temporal becomes receiver-state reuse, not generic TAA.
6. Directional visibility comes from open-sector moments or buckets, not from a
   separate effect.

The important posture is not "reject temporal/cache/bent AO." The posture is:
adopt them only in the shape that preserves receiver truth and can explain what
it replaces.
