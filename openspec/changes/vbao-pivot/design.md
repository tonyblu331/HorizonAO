# Design: VBAONode (Visibility Bitmask AO)

This document fully specifies the math and the public shape of `VBAONode` so that the scalar reference (`vbaoReference.ts`) and the TSL kernel (`VBAONode.ts`) are guaranteed to agree on every intermediate value. Disagreement on any constant below will manifest as silent parity-test failure later.

Citation: Therrien, O., Levesque, Y., Gilet, G. *Screen Space Indirect Lighting with Visibility Bitmask*. arXiv:2301.11376, 2023.

---

## 1. Integration shape (mirrors `GTAONode`)

`GTAONode` exposes:

```ts
const ao = new GTAONode(depthNode, normalNode, camera)
// or
const ao = ao(depthNode, normalNode, camera)
```

`VBAONode` exposes the same shape:

```ts
const ao = new VBAONode(depthNode, normalNode, camera, options?)
// or
const ao = vbao(depthNode, normalNode, camera, options?)
```

Differences from `GTAONode`:

- `normalNode` is a **required positional argument**, not optional. Passing `null`/`undefined` throws `TypeError('VBAONode: normalNode is required')`.
- Drops `distanceFallOff`, `distanceExponent`, `useTemporalFiltering` uniforms (VBAO eliminates the need for the first two; v1 is AA-agnostic so no temporal coupling).
- Adds `slices` uniform (HBAO/VBAO concept; `GTAONode` folds slice count into `samples`).
- `sectors` is **NOT** a configurable option; it is fixed at compile time to `32`. Exposed as `readonly sectors = 32 as const` for documentary purposes only.

The factory `vbao(...)` lives in the same file as the class (matches Three.js's `GTAONode.js` convention).

---

## 2. Slice basis frame (per pixel)

Without this section pinned down to the operator, scalar and TSL will silently disagree on `γ` and the parity test will fail invisibly.

Inputs in view space:

```txt
P  = reconstructed view-space position from depthNode
V  = normalize(-P)               // view direction from surface toward camera
N  = normalize(normalNode)       // view-space normal (REQUIRED, no fallback)
```

Build a stable 2-D basis perpendicular to `V`:

```txt
T0 = normalize(anyPerpendicular(V))
T1 = normalize(cross(V, T0))

where anyPerpendicular(V) :=
  abs(V.x) < 0.9 ? cross(V, vec3(1, 0, 0)) : cross(V, vec3(0, 1, 0))
```

`0.9` is the conventional threshold for safe cross-product orthogonality without normalising twice.

For each slice `i ∈ [0, slices)`:

```txt
φ_i = 2π · (i + rotation) / slices

S_i = normalize(cos(φ_i) · T0 + sin(φ_i) · T1)
B_i = normalize(cross(V, S_i))
```

`rotation` is a per-pixel scalar in `[0, 1)` produced from a magic-square noise (carried over from the prior implementation; deterministic, AA-agnostic).

The slice plane is `span(S_i, V)`.

Projected normal angle in the slice plane:

```txt
γ_i = atan2(dot(N, V), dot(N, S_i))
γ_i_norm = clamp(γ_i, -π/2, π/2)
```

`γ_i_norm` is used by the cosine-weighted reduction.

---

## 3. Sector indexing

Sectors are uniformly distributed in `θ ∈ [-π/2, π/2]`:

```txt
SECTOR_COUNT = 32                          // compile-time
θ_min        = -π/2
θ_max        =  π/2
Δθ           = π / SECTOR_COUNT            // = π/32

sectorIndex(θ) := clamp(floor((θ - θ_min) / Δθ), 0, SECTOR_COUNT - 1)
```

Sector centres (used by the cosine-weighted reduction):

```txt
θ_k = (k + 0.5) · Δθ + θ_min               // = (k + 0.5) · π/32 − π/2
                                            // for k ∈ [0, 32)
```

The 32 `cos(θ_k)` values are NOT precomputed as a constant table, because `γ_i_norm` enters the weight: `w_k = max(0, cos(θ_k − γ_i_norm))`. We instead precompute the 32 `θ_k` values as a compile-time constant in `vbaoConstants.ts` and evaluate `cos(θ_k − γ)` per pixel. Cost: 32 cos + 32 max per slice — trivial vs. the depth taps.

---

## 4. Sector mask construction — MIRRORED SLICE MARCHING (mandatory)

Every slice direction `S_i` is marched on BOTH sides (`side ∈ {-1, +1}`). The sample direction projection uses `S_side = side · S_i` so that `atan2` stays inside the intended `[-π/2, π/2]` domain.

```txt
for side in [-1, +1]:
  S_side = side * S_i

  for j in [0, samples):
    // sample march outward in screen-space along projection of S_side
    samplePosition_j = reconstructed view-space position from sampled depth

    D_front = normalize(samplePosition_j - P)
    D_back  = normalize((samplePosition_j - thickness · V) - P)

    θ_front = atan2(dot(D_front, V), dot(D_front, S_side))
    θ_back  = atan2(dot(D_back , V), dot(D_back , S_side))

    θ0 = min(θ_front, θ_back)
    θ1 = max(θ_front, θ_back)

    k0 = floor((θ0 - θ_min) / Δθ)          // inclusive start
    k1 = ceil ((θ1 - θ_min) / Δθ)          // exclusive end

    M_i = M_i | maskRange(k0, k1)
```

`thickness` is the user uniform; it is a real model parameter, not the GTAO falloff heuristic. `thickness ∈ [0, ∞)`, default `0.25` view-space units.

---

## 5. `maskRange(k0, k1Exclusive)` — count-clamped

`(1u << 32)` is undefined behaviour in WGSL and GLSL. So is `(0xFFFFFFFFu >> (32 − count))` at `count == 0`. The reference and the kernel MUST use the count-clamped form below verbatim — no inline cleverness:

```txt
count = clamp(k1 - k0, 0, SECTOR_COUNT)

if count == 0:                  sampleMask = 0u
else if count >= SECTOR_COUNT:  sampleMask = 0xFFFFFFFFu
else:                           sampleMask = ((1u << count) - 1u) << k0
```

This explicitly handles the three regimes (empty range, full range, partial range) and avoids any shift by `SECTOR_COUNT`.

---

## 6. Reductions

### 6.1 Cosine-weighted (PRODUCTION — ships in the TSL kernel)

```txt
For each slice i:
  numerator   = 0
  denominator = 0
  for k in [0, SECTOR_COUNT):
    w_k = max(0, cos(θ_k − γ_i_norm))
    denominator += w_k
    if bit(M_i, k) == 0:        // sector is OPEN
      numerator += w_k

  A_i = numerator / max(denominator, 1e-6)

A     = (1 / slices) · Σ_i A_i
A_out = pow(A, scale)
```

`scale` is the user uniform (matches `GTAONode.scale`). Output stored as scalar accessibility in the R channel of a `RedFormat` render target.

### 6.2 Popcount-only (REFERENCE ABLATION — `vbaoReference.ts` only)

```txt
A_i_popcount = 1 − f32(countOneBits(M_i)) / 32
```

Lives only in `vbaoReference.ts` and the test suite as the cheap baseline for ablation; the kernel does not ship it.

---

## 7. Compositing

Downstream code multiplies scene colour by `A_out` (accessibility — `1` = fully open, `0` = fully dark):

```txt
finalColor = sceneColor * A_out
```

`A_out` is stored, NOT occlusion `O = 1 − A_out`. Choice is consistent with `GTAONode`'s output semantics.

---

## 8. Public uniforms

| Uniform | Type | Default | Range | Notes |
|---|---|---|---|---|
| `radius` | `float` | `1.25` | `[0.05, 8]` | View-space units. |
| `thickness` | `float` | `0.25` | `[0, 2]` | Bitmask interval thickness — real model parameter. |
| `scale` | `float` | `1.0` | `[0, 4]` | `pow(A, scale)`. Matches `GTAONode.scale`. |
| `slices` | `int` | `3` | `[1, 8]` | Slice directions per pixel. Quality tier overrides. |
| `samples` | `int` | `8` | `[2, 32]` | March samples per side per slice. Quality tier overrides. |
| `resolution` | `vec2` | `Vector2()` | runtime | Effect resolution. |
| `resolutionScale` | `number` (JS field) | `0.5` | `(0, 1]` | Render target size multiplier. Quality tier overrides. |

Compile-time constant: `SECTOR_COUNT = 32`. Documentary: `readonly sectors = 32 as const`.

---

## 9. Quality tiers (locked)

One sector count across all tiers to ship a single shader variant:

| Tier | `resolutionScale` | `slices` | `samples` | `sectors` |
|---|---:|---:|---:|---:|
| `fast` | `0.5` | `2` | `6` | `32` |
| `balanced` | `0.5` | `3` | `8` | `32` |
| `quality` | `1.0` | `4` | `10` | `32` |

Exposed via `vbaoConstants.ts` as a record:

```ts
export const VBAO_QUALITY_TIERS = {
  fast:     { resolutionScale: 0.5, slices: 2, samples: 6,  sectors: 32 },
  balanced: { resolutionScale: 0.5, slices: 3, samples: 8,  sectors: 32 },
  quality:  { resolutionScale: 1.0, slices: 4, samples: 10, sectors: 32 },
} as const
```

---

## 10. WebGPU vs WebGL2

VBAO is **WebGPU-first**. WGSL `countOneBits()` is one cycle. The Three.js TSL `BitcountNode` emits the native WGSL builtin on the WebGPU backend; on the WebGL2 backend it emulates with a four-step parallel popcount (~12 ALU ops per call). VBAO is **functional** on WebGL2 but not the primary performance target.

Bitwise ops (`bitOr`, `bitAnd`, `shiftLeft`, `shiftRight`) are method-chained on `uint`/`int` TSL nodes via Three's `OperatorNode`. They emit native operators on both backends.

Documented in the capability spec; no API-level branching on backend.

---

## 11. Out of scope

The following are explicitly NOT part of v1 and live in their own future proposals:

- **Bent normals.** Recoverable from `~M_i` (centroid of open sectors). Deferred.
- **SSILVB indirect diffuse.** Reuses the mask for one-bounce GI. Deferred to its own node.
- **Denoise pass.** Raw VBAO first; PR-06 only on evidence.
- **Depth MIPs.** Not in v1; PR-06 only on evidence.
- **TAA-jitter-aware sampling.** Magic-square rotation stays deterministic.
- **Multiple sector counts / shader variants.** One variant only.
- **Silent depth-derived normal fallback.** Forbidden by ADR-010.
- **Runtime-selectable reduction.** Cosine-weighted only.
