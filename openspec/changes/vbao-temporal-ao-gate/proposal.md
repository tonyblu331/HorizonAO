# Proposal: VBAO Temporal AO Gate

## Intent

Define a disciplined path for optional temporal AO without weakening the current
raw-first VBAO evidence gates.

Temporal AO can improve image quality and performance only when it is used as a
sample-reuse layer: cheaper raw samples are accumulated across validated frames.
Adding history on top of the current product cost is not a performance win, and
using history to hide raw kernel or reconstruction problems would violate the
current quality-hardening roadmap.

## Verified Starting Point

The current accepted spec says `VBAONode` is not a temporal accumulator and that
internal reconstruction/polish stages must not require history textures,
reprojection, or TAA.

That boundary is correct for the current product. This change proposes a future
opt-in extension only after the raw/reference/evidence gates are stable.

## Scope

### In Scope

- Add a temporal AO product model with three modes: `off`, `host`, and
  `internal`.
- Keep `off` as the default and the evidence baseline.
- Define `host` mode as animated/decorrelated VBAO sampling for renderers that
  already own TAA/TRAA history.
- Define `internal` mode as an optional AO-owned history path with reprojection,
  depth/normal validation, neighborhood clamp, history blend, and reset logic.
- Place temporal accumulation after full-resolution resolve.
- Require screenshots, failure labels, and GPU timing rows before enabling any
  temporal mode by default.

### Out of Scope

- No default temporal AO.
- No TAA-only product requirement.
- No public temporal option until evidence proves the product need.
- No temporal accumulation of unresolved half-resolution raw AO.
- No use of temporal history to justify weaker raw/reference gates.
- No production build command unless explicitly requested.

## Affected Areas

| Area | Impact |
| --- | --- |
| `openspec/specs/vbao-node/spec.md` | Product boundary must allow future opt-in temporal modes while keeping default temporal-free behavior |
| `packages/horizon-ao/src/VBAONode.ts` | Future private graph ownership for mode selection and pass allocation |
| `packages/horizon-ao/src/vbaoNoise.ts` | Future host-mode phase animation/decorrelation |
| `apps/demo` | Future evidence capture for temporal screenshots, failure labels, and GPU timings |
| `EVIDENCE.md` | Future comparison rows for raw, host temporal, internal temporal, and non-temporal baselines |

## Success Criteria

- The current temporal-free product remains the default baseline.
- Host temporal support can be evaluated without allocating AO history.
- Internal temporal support is behind an evidence gate and validates history with
  depth and normal discontinuities.
- Temporal quality claims compare against spending the same cost on higher raw
  samples, stronger spatial polish, or full-resolution output.
- Performance claims only pass when lower raw sample/resolution settings plus
  temporal accumulation beat the non-temporal alternative at the same quality bar.
