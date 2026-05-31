# Verification Report: verify-horizonao-math-denoise

Mode: Strict TDD for pure/unit-testable policy. Shader and browser behavior verified by typecheck, lint, E2E, and build.

## Completeness

| Metric           | Value |
| ---------------- | ----: |
| Tasks total      |    20 |
| Tasks complete   |    20 |
| Tasks incomplete |     0 |

## Build And Tests Execution

| Check           | Result | Evidence                                                         |
| --------------- | ------ | ---------------------------------------------------------------- |
| Core unit tests | Passed | `pnpm --filter @horizonao/core test` -> 4 files, 20 tests passed |
| Core typecheck  | Passed | `pnpm --filter @horizonao/core typecheck`                        |
| Core tsgo       | Passed | `pnpm --filter @horizonao/core typecheck:tsgo`                   |
| Demo typecheck  | Passed | `pnpm --filter @horizonao/demo typecheck`                        |
| Demo tsgo       | Passed | `pnpm --filter @horizonao/demo typecheck:tsgo`                   |
| Lint            | Passed | `pnpm lint`                                                      |
| E2E             | Passed | `pnpm --filter @horizonao/demo test:e2e` -> 21 passed            |
| Build           | Passed | `pnpm -r build` -> `@horizonao/core` built with tsdown           |

Coverage: not available. No coverage threshold configured.

## TDD Cycle Evidence

| Task    | Test File                                                                                        | Layer | RED                                             | GREEN                                                     | TRIANGULATE                                        |
| ------- | ------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| 1.1-1.3 | `packages/horizon-ao/src/horizonAoMath.test.ts`                                                  | Unit  | Missing helper module failed                    | 7 tests passed after helper implementation                | clamps, samples, falloff, center bias, no-occluder |
| 2.1-2.3 | `packages/horizon-ao/src/horizonAoMath.test.ts`                                                  | Unit  | missing `generateMagicSquareIndices` failed     | magic-square test passed                                  | even size coerces to unique odd square             |
| 3.1-3.4 | `packages/horizon-ao/src/horizonAoNode.test.ts`, `packages/horizon-ao/src/parityHarness.test.ts` | Unit  | denoise exports/rendered status failed          | tests passed after denoise node and rendered debug status | defaults plus factory/class exports                |
| 4.1-4.2 | `apps/demo/e2e/scene-routes.spec.ts`                                                             | E2E   | `denoised-ao` added to expected rendered matrix | 21 browser tests passed                                   | raw, denoised, depth, normal debug views           |

## Spec Compliance Matrix

| Requirement                              | Scenario                                | Test                                | Result                |
| ---------------------------------------- | --------------------------------------- | ----------------------------------- | --------------------- |
| Math Policy Is Testable                  | Clamp policy is stable                  | `horizonAoMath.test.ts`             | Compliant             |
| Math Policy Is Testable                  | No occluder remains accessible          | `horizonAoMath.test.ts`             | Compliant             |
| Raw Kernel Uses Per-Pixel Rotation       | Magic-square rotation is deterministic  | `horizonAoMath.test.ts`             | Compliant             |
| Spatial Denoise Is Separate And Optional | Denoised AO renders                     | `scene-routes.spec.ts` debug matrix | Compliant             |
| Harness Evidence Stays Honest            | Debug status is explicit                | `parityHarness.test.ts`             | Compliant             |
| Harness Evidence Stays Honest            | WebGL fallback is not WebGPU validation | E2E metadata and console warnings   | Compliant with caveat |

Compliance summary: 6/6 scenarios covered by passing tests.

## Correctness Notes

- The raw shader now uses deterministic magic-square sample rotation and radius jitter comparable in spirit to Three `GTAONode`.
- `HorizonAoDenoiseNode` is a separate scalar `RedFormat` pass after raw AO.
- `denoised-ao` is now rendered. `edge-confidence`, `history-rejection`, and `resolution-scale` remain metadata-only.
- Local E2E logs still report: `THREE.WebGPURenderer: WebGPU is not available, running under WebGL2 backend.` This is smoke coverage, not WebGPU validation.
- No performance claim was produced. Timestamp query metadata remains captured or unsupported only.

## Issues Found

Critical: None.

Warnings:

- `packages/horizon-ao/src/horizonAoNode.ts` still uses isolated `@ts-nocheck` because Three TSL shader composition typings remain narrower than runtime behavior.
- Screenshot artifacts now capture the canvas directly because Chromium page-level screenshots can hang under the renderer fallback path.
- Heavy scene backend metadata can remain unknown before the probe reports a concrete backend, so the app defaults to `unknown` rather than misleading `pending`.

Suggestions:

- Next PR should collect raw/denoised failure-case screenshots and inspect edge bleeding before adding more features.
- True WebGPU validation remains a separate gate.

## Verdict

PASS WITH WARNINGS.

The change satisfies the SDD spec and verification commands. It improves kernel determinism and adds spatial denoise, but it does not prove WebGPU validation or visual quality superiority.
