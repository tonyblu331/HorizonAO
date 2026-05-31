# Tasks: VBAO Parity Fixture Expansion

## Phase 0: SDD Setup

- [x] Confirm `sdd-init/horizonao` exists and strict TDD is active.
- [x] Write architecture/semantic ultra-plan with Mermaid diagrams.

## Phase 1: RED Contracts

- [x] Add fixture ID contract for `flat-plane`, `two-wall-corner`, and
      `thin-occluder`.
- [x] Add scalar row contract proving every fixture produces finite expected
      rows.
- [x] Add route/source contract requiring `window.__vbaoParity.fixtures`.
- [x] Add public API closure contract.

## Phase 2: Scalar Adapters

- [x] Extract the current flat-plane scalar path behind a fixture matrix
      adapter.
- [x] Add analytic two-wall corner surface sampling.
      - Current first pass uses deterministic frontal-rect L-depth proxy
        surfaces; true perpendicular-wall normal coverage remains a follow-up
        hardening task.
- [x] Add analytic thin-occluder surface sampling.
- [x] Preserve shader details: WebGPU Y flip, quantized noise, adaptive
      thickness, mirrored slice marching, row quantization.

## Phase 3: WebGPU Scene Adapters

- [x] Render flat plane through the new fixture matrix without regressing the
      passing E2E.
- [x] Add two-wall corner geometry to `/vbao-parity`.
      - Current first pass mirrors the scalar frontal-rect L-depth proxy.
- [x] Add thin-occluder geometry to `/vbao-parity`.
- [x] Run each fixture in sequence and expose per-fixture reports.

## Phase 4: Evidence Gate

- [x] Run targeted Vitest.
- [x] Run full package Vitest.
- [x] Run package and demo `tsc --noEmit`.
- [x] Run `E2E_WEBGPU_PARITY=1` for the expanded fixture matrix.
- [x] Update `EVIDENCE.md` with pass/fail rows and candid status.
- [x] No production build.

## Phase 5: Next Decision / Hardening

- [x] Add a second `two-wall-corner` hardening fixture with true perpendicular
      wall normals, not only frontal depth-band proxies.
- [x] Add a thin-occluder silhouette-rasterization guard so anchors cannot sit
      on coverage-ambiguous edge pixels.
- [x] Add formula comparison labels for paper/popcount vs cosine/GPU agreement.
- [x] If any hardened fixture fails, debug shader/reference parity before filter
      work.
      - Initial `two-wall-corner-true-normal` wall anchors exposed `both-drift`
        rows. Normal readback diagnostics proved the MRT normals matched the
        scalar normals, so the unstable anchor choices were moved to
        guard-accepted interior wall pixels.
      - The hardened WebGPU E2E now passes all fixture reports.
- [ ] If all hardened fixtures pass, start metadata-aware GPU filter comparison.
