# Apply Progress: Velocity-Backed Temporal AO

## Implemented

- Added private `VBAOVelocityTemporalNode`.
- Wired demo/evidence mode `velocity-internal`.
- Used Three `PassNode.getPreviousTextureNode(...)` for host-owned previous
  depth and normal guides.
- Used Three TRAA velocity convention:

```txt
offsetUv = velocity.xy * vec2(0.5, -0.5)
historyUv = uv - offsetUv
```

- Added velocity-backed verifier input via `VBAO_TEMPORAL_VELOCITY_JSON`.
- Added metaprompt for future implementation discipline.
- Captured WebGPU smoke evidence with temporal pass timing.

## Still Open

- Full off/host/host-TRAA/velocity/same-cost matrix.
- Motion/disocclusion scene evidence.
- Rejection reason diagnostics for history validity.
- VRAM/target inventory in the formal evidence summary.
- Public API review. No public temporal API is justified yet.

## Current Verdict

`verify:vbao-temporal` still returns `reject-promotion`.

That is correct. The new implementation proves the private velocity-backed pass
can render and emit timing, not that temporal should promote.
