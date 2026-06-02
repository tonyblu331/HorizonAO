# Metaprompt: Velocity Temporal AO Implementation

You are implementing velocity-backed temporal AO for HorizonAO.

Do not add temporal as a public `VBAONodeOptions` field. Do not reintroduce
camera-only temporal. Do not allocate private previous depth/normal guide copies
inside `@horizonao/core`.

Use this shape:

```txt
VBAONode
  current-frame raw/reconstruction only

VBAOVelocityTemporalNode
  private AO history target and validation only

demo PassNode host
  current depth/normal/velocity
  previous depth/normal via getPreviousTextureNode(...)
```

Velocity convention follows Three `TRAANode`:

```txt
offsetUv = velocity.xy * vec2(0.5, -0.5)
historyUv = uv - offsetUv
```

Implementation bar:

- One new runtime node maximum.
- No stub node; it must render complete output or not merge.
- No public temporal API.
- No helper modules until real duplication appears.
- Invalid history returns current AO.
- History is rejected by viewport, reset, depth continuity, normal continuity,
  and velocity magnitude.
- Previous AO is clamped to the current 3x3 AO neighborhood before blending.
- Evidence must compare temporal off, host, host TRAA, velocity internal, and
  same-cost spatial rows before promotion.

If the host cannot provide clean previous guides, stop. Do not work around it by
copying private guide history in VBAO.
