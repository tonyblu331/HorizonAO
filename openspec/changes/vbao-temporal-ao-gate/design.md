# Design: VBAO Temporal AO Gate

## 1. Product Model

Temporal support is modeled as a temporal-free product path plus a host
integration mode:

```ts
type TemporalMode = "off" | "host";
```

The public API does not expose temporal controls. Mode selection remains
internal to demo/evidence code until host-side evidence proves a product need.

Mode semantics:

| Mode | Semantics |
| --- | --- |
| `off` | Stable non-temporal product path. This remains the default and evidence baseline. |
| `host` | Animate/decorrelate VBAO sampling and rely on the renderer's existing TAA/TRAA to integrate frames. No AO history is allocated. |

## 2. Pass Order

VBAO-owned temporal accumulation is removed from the product graph. Host temporal
integration, when enabled in the demo, wraps the final AO/beauty output through
the host renderer's temporal AA path and its velocity/depth contract.

Full-resolution path:

```txt
RawVBAO
  -> FullResPolish optional
  -> final AO
  -> host TRAA optional outside VBAO
```

Low-resolution path:

```txt
RawVBAO
  -> HalfResCleanup optional
  -> JBU4 Resolve
  -> FullResPolish optional
  -> final AO
  -> host TRAA optional outside VBAO
```

Do not accumulate unresolved half-resolution raw AO in this change. Any future
AO-owned temporal path needs its own proposal and must not duplicate renderer
G-buffer history internally.

## 3. Host Temporal Mode

Host mode is the cheapest temporal-friendly layer:

- vary the phase/noise index over frames;
- preserve deterministic non-temporal mode when `temporal = off`;
- avoid AO history allocation;
- let the host renderer's TAA/TRAA integrate the animated AO signal.

Acceptance requires evidence that animation reduces stable sample structure under
host TAA without making non-TAA output unstable.

## 4. Future AO-Owned Temporal Inputs

A future AO-owned temporal path is not part of this gate. If reopened, it must
require host-provided motion vectors and must read host-provided guide history
instead of allocating private previous-depth/normal render targets.

Required future inputs:

- current AO;
- current depth;
- current normal;
- velocity/motion vector texture;
- previous AO history;
- previous depth/normal history supplied by the host or an explicitly shared G-buffer contract;
- output resolution;
- history validity/reset flag.

Optional later inputs:

- object/material ID;
- AO confidence.

Camera-matrix-only reprojection is not an acceptable dynamic-scene contract for
AO-owned temporal reuse. Without velocity, the mode must remain unavailable.

## 5. Validation And Clamp

Future AO-owned history would be valid only when:

- previous UV is inside the viewport;
- projected previous depth agrees within a threshold;
- current and previous normals agree above a conservative dot threshold;
- velocity and guide history agree with the current pixel;
- no camera cut or resize reset is active.

Valid history may need neighborhood clipping/clamping before blending, but clamp
shape is a performance/quality tradeoff that belongs in a future velocity-backed
proposal.

Initial blend guidance:

```txt
baseHistoryWeight = 0.75 to 0.85
```

Do not start near `0.95`; that biases the design toward ghosting before the
validation gates have earned trust.

## 6. Evidence Gate

Host temporal evidence must compare:

- `off` at current product settings;
- `off` with higher raw samples or stronger spatial polish at comparable cost;
- `host` with animated sampling under a host TAA/TRAA scene;
- no AO-owned internal temporal rows.

Rows must include:

- AO-only screenshots;
- beauty screenshots;
- GPU timings by pass;
- failure labels: `noise`, `mud`, `halo`, `edge-bleed`, `ghosting`,
  `thin-gap`, `scale-mismatch`, and `disocclusion`.

## 7. Public API Gate

A public `temporal` option is allowed only after host-side evidence shows a
product need. Until then, host mode can live behind demo/evidence plumbing.

If public API becomes justified for host integration, the shape should remain
narrow:

```ts
temporal?: "off" | "host";
```

AO-owned temporal history requires a separate velocity-backed proposal and
evidence gate before any public API is reopened.
