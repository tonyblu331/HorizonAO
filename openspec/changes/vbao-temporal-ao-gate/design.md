# Design: VBAO Temporal AO Gate

## 1. Product Model

Temporal support is modeled as an internal product mode:

```ts
type TemporalMode = "off" | "host" | "internal";
```

The public API does not need to expose this immediately. The first
implementation can keep mode selection internal to demo/evidence code until the
benefit is proven.

Mode semantics:

| Mode | Semantics |
| --- | --- |
| `off` | Stable non-temporal product path. This remains the default and evidence baseline. |
| `host` | Animate/decorrelate VBAO sampling and rely on the renderer's existing TAA/TRAA to integrate frames. No AO history is allocated. |
| `internal` | VBAO owns AO history, reprojection, validation, clamp, blend, and reset logic. |

## 2. Pass Order

Temporal accumulation happens after the product is at full output resolution.

Full-resolution path:

```txt
RawVBAO
  -> TemporalAccumulation optional
  -> FullResPolish optional
  -> final AO
```

Low-resolution path:

```txt
RawVBAO
  -> HalfResCleanup optional
  -> JBU4 Resolve
  -> TemporalAccumulation optional
  -> FullResPolish optional
  -> final AO
```

Do not accumulate unresolved half-resolution raw AO in this change. A low-res
history path would need its own proposal because validation, reprojection, and
edge behavior differ.

## 3. Host Temporal Mode

Host mode is the cheapest temporal-friendly layer:

- vary the phase/noise index over frames;
- preserve deterministic non-temporal mode when `temporal = off`;
- avoid AO history allocation;
- let the host renderer's TAA/TRAA integrate the animated AO signal.

Acceptance requires evidence that animation reduces stable sample structure under
host TAA without making non-TAA output unstable.

## 4. Internal Temporal Inputs

Internal temporal accumulation needs:

- current AO;
- current depth;
- current normal;
- previous AO history;
- current inverse view-projection;
- previous view-projection;
- output resolution;
- history validity/reset flag.

Optional later inputs:

- motion vectors;
- previous depth;
- previous normal;
- object/material ID;
- AO confidence.

The minimum implementation can reproject current pixels into the previous frame
from current depth and camera matrices. Motion vectors can improve the path
later, but they are not required for the first gate.

## 5. Validation And Clamp

History is valid only when:

- previous UV is inside the viewport;
- projected previous depth agrees within a threshold;
- current and previous normals agree above a conservative dot threshold;
- no camera cut or resize reset is active.

Valid history must be clamped to the current 3x3 AO neighborhood before blending.
This prevents stale history from inventing occlusion that is not supported by the
current frame.

Initial blend guidance:

```txt
baseHistoryWeight = 0.75 to 0.85
```

Do not start near `0.95`; that biases the design toward ghosting before the
validation gates have earned trust.

## 6. Evidence Gate

Temporal evidence must compare:

- `off` at current product settings;
- `off` with higher raw samples or stronger spatial polish at comparable cost;
- `host` with animated sampling under a host TAA/TRAA scene;
- `internal` with lower raw samples/resolution plus history.

Rows must include:

- AO-only screenshots;
- beauty screenshots;
- GPU timings by pass;
- failure labels: `noise`, `mud`, `halo`, `edge-bleed`, `ghosting`,
  `thin-gap`, `scale-mismatch`, and `disocclusion`.

## 7. Public API Gate

A public `temporal` option is allowed only after evidence shows a product need.
Until then, temporal mode can live behind demo/evidence plumbing or an internal
constructor path.

If public API becomes justified, the shape should remain narrow:

```ts
temporal?: "off" | "host" | "internal";
```

No public reprojection thresholds, clamp radii, or history weights should ship
without separate evidence that users need those controls.
