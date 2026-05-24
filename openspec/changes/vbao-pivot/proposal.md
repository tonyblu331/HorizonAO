# Proposal: VBAO Pivot — Visibility-Bitmask AO Replaces Signed-Horizon Kernel

## Summary

PR-00 establishes **VBAONode** as the only active AO implementation in this repository.

The repository and package identity remain unchanged under R1 (source-only rename). The source-level public node becomes `VBAONode`. The old signed-horizon implementation is removed from active `src/` and archived only as historical openspec context.

`VBAONode` is **AO-only**. It requires `depthNode`, `normalNode`, and `camera`. It uses a compile-time 32-sector visibility bitmask per slice, stores accessibility `A`, and composites as `color × A^scale`.

**No denoise, temporal, depth MIP, bent normal, indirect diffuse, or fallback kernel ships in PR-00.** This proposal covers paper + source skeleton + archive only. The TSL kernel and tests land in PR-01 and PR-02.

## Motivation

The prior `HorizonAoNode` signed-horizon kernel is a GTAO-class algorithm (Jimenez et al., SIGGRAPH 2016) that Three.js's existing `GTAONode` already implements. Polishing a 2016-class algorithm does not justify a new core node.

The 2023 **Visibility-Bitmask** method (Therrien, Levesque, Gilet — *Screen Space Indirect Lighting with Visibility Bitmask*, arXiv:2301.11376) is the post-GTAO step that:

- replaces dual-scalar horizons `(h+, h-)` with an N-bit visibility mask over uniformly distributed sectors of the slice hemisphere,
- handles thickness as a bit range rather than an empirical heuristic,
- eliminates the `distanceFallOff` / center-bias-exponent / step-decay weights GTAO needs,
- preserves light passing behind constant-thickness occluders (the case where GTAO over-occludes).

Production ports (ARK.KRA VBAO for Unreal) ship at ~0.6 ms/1080p versus UE5 GTAO at ~3 ms with strictly better thin-geometry output. No TSL/WebGPU implementation exists yet. This proposal lands one.

## Capabilities

### New Capabilities

- `vbao-node` — Visibility-Bitmask Ambient Occlusion node for TSL/WebGPU. Scalar accessibility output, GTAONode-shaped depth/normal/camera integration, no temporal coupling.

### Removed Capabilities

- `horizonao-raw-kernel` — signed-horizon TSL kernel. Spec moved to `openspec/archive/`. No deprecation period (pre-1.0, no downstream users).
- `horizonao-math-denoise` — bilateral spatial denoise pass. Removed without replacement in v1; reconsidered in PR-06 only if EVIDENCE.md shows raw VBAO requires it.

## Scope

### In scope (PR-00 only)

- Write change-level docs (this file, `design.md`, `tasks.md`, `state.yaml`).
- Write capability spec at `openspec/specs/vbao-node/spec.md`.
- Write `ADR-007` through `ADR-011` capturing the algorithm pivot, AO-only scope, no-legacy decision, required-normal contract, and raw-first/no-denoise rule.
- Create `VBAONode` source skeleton in `packages/horizon-ao/src/VBAONode.ts` with class + factory `vbao(...)` in the same file (Three.js convention). Constructor throws `TypeError` on null `normalNode`. `setup()` returns the `float(1.0)` placeholder until PR-02.
- Create `vbaoConstants.ts` (sector direction table, cosine weight table, quality tier values, clamp ranges).
- Create `vbaoReference.ts` stub (signatures only — bodies in PR-01).
- Create `apps/demo/src/evidence/evidenceCameras.ts` with named camera IDs (stubbed positions — actual values nailed in PR-04).
- Move signed-horizon source files (`horizonAoNode.ts`, `horizonAoMath.ts`, related tests) to `packages/horizon-ao/archive/`.
- Move legacy openspec docs (`horizonao-final-spec.md`, `horizonao-math-revision-2025.md`, `horizonao-current-shape-roadmap.md`) to `openspec/archive/`.
- Remove `parityHarness` from public package exports.
- Rewrite `README.md` and `AGENTS.md` with the R1 historical-repo-name paragraph.

### Out of scope (PR-00)

- TSL kernel implementation — PR-02.
- Scalar reference body — PR-01.
- Four correctness tests + TSL↔scalar parity readback — PR-01 / PR-03.
- Demo scene rewiring — PR-04.
- EVIDENCE.md screenshots and timings — PR-05.
- Denoise pass — PR-06 only if evidence demands it.

### Out of scope (v1 entirely)

- GI / indirect diffuse / SSILVB — separate proposal.
- Bent normals — separate proposal.
- Ray-traced AO, neural denoise, ReSTIR — not in this repo.
- Temporal filtering (TRAA coupling) — kept out by ADR.
- Depth MIPs — kept out unless PR-06 evidence demands.
- Silent depth-derived normal fallback — ADR-010 forbids.
- Multiple sector counts / runtime-selectable reductions — kept compile-time.
- Full repo / npm scope rename — R2, deferred to a separate infra PR.

## Constraints (locked decisions from peer review)

1. **Reduction:** cosine-weighted is the production formula:
   `A_i = Σ_k open(k) · max(0, cos(θ_k − γ_i)) / Σ_k max(0, cos(θ_k − γ_i))`.
   Popcount-only `A_i = 1 − countOneBits(M_i)/32` ships in `vbaoReference.ts` as an ablation baseline only.
2. **Rename:** R1 source-only. Git repo, npm scope, remote URL unchanged.
3. **Normal input:** required positional. Constructor throws `TypeError('VBAONode: normalNode is required')` on null.
4. **Source layout:** flat. `src/{VBAONode.ts, vbaoReference.ts, vbaoConstants.ts, vbaoDebug.ts, index.ts}` + `tests/`. Class + factory in one file.
5. **Quality tiers:** locked values, one sector count (32) across all tiers.

| Tier | resolutionScale | slices | samples | sectors |
|---|---|---|---|---|
| Fast | 0.5 | 2 | 6 | 32 |
| Balanced | 0.5 | 3 | 8 | 32 |
| Quality | 1.0 | 4 | 10 | 32 |

6. **`sectors` option:** NOT user-adjustable in v1. Exposed only as `readonly sectors = 32 as const` for documentary purposes.
7. **Mirrored slice marching:** every slice direction `S_i` is marched on both sides; atan2 uses `S_side = side · S_i`. Pinned in `design.md`.
8. **`maskRange(k0, k1Exclusive)`:** count-clamped to avoid `1u << 32` UB. Pinned in `design.md`.

## Rollback plan

If PR-00 introduces typecheck or test failures that cannot be resolved within the session, revert to the pre-PR-00 commit (the last commit on `main` before the change began). All PR-00 work is paper plus skeleton — there is no kernel logic to preserve, so a full revert is safe.

The signed-horizon kernel is preserved in `packages/horizon-ao/archive/` and `openspec/archive/` exactly as it shipped, so resurrection is one `git mv` away if the VBAO direction collapses in a future PR.

## Sources

- Therrien, O., Levesque, Y., Gilet, G. *Screen Space Indirect Lighting with Visibility Bitmask*. arXiv:2301.11376, 2023.
- cdrinmatane. *SSAO using Visibility Bitmasks — Research Blog*. https://cdrinmatane.github.io/posts/ssaovb-code/
- Jimenez, J. et al. *Practical Real-Time Strategies for Accurate Indirect Occlusion*. SIGGRAPH 2016 (Advances in Real-Time Rendering in Games).
- Intel GameTechDev. *XeGTAO*. https://github.com/GameTechDev/XeGTAO
- AMD GPUOpen. *FidelityFX CACAO 1.4*. https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- Three.js. *GTAONode*. https://threejs.org/docs/pages/GTAONode.html
