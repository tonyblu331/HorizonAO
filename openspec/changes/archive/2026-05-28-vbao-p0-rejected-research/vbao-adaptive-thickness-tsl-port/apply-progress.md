# Apply Progress: VBAO Adaptive Thickness TSL Port

## Status

12/12 tasks complete.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `openspec/changes/vbao-adaptive-thickness-tsl-port/specs/vbao-node/spec.md` | Spec | N/A (new) | N/A (artifact) | N/A (artifact) | N/A | N/A |
| 1.2 | `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` | Unit/source contract | 63/63 reference tests passing | Failing source contract: no adaptive import/back face | 2/2 passing | Import/no-public-knob + back-face replacement | Raw import avoids Node ambient types |
| 1.3 | `packages/horizon-ao/src/__tests__/vbaoAdaptiveThickness.test.ts` | Unit | 63/63 reference tests passing | Missing `vbaoAdaptiveThickness` module | 3/3 passing | Default cap + zero cap path | Constants isolated in non-public module |
| 2.1 | `packages/horizon-ao/src/vbaoAdaptiveThickness.ts` | Unit | 3/3 adaptive contract tests passing | Covered by 1.3 | 3/3 passing | Cap below min proves clamp behavior | None needed |
| 2.2 | `packages/horizon-ao/src/VBAONode.ts` | Source contract + e2e smoke | 68/68 targeted tests passing before e2e | Covered by source-contract back-face test | 68/68 targeted tests passing | Museum smoke rendered with benchmark snapshots | None needed |
| 2.3 | `packages/horizon-ao/src/VBAONode.ts` | Source contract + e2e smoke | 68/68 targeted tests passing | Covered by spec scenario | 3/3 Museum Playwright tests passing | Background breaks adaptive scan in implementation | None needed |
| 2.4 | `packages/horizon-ao/src/VBAONode.ts` | Source contract | 68/68 targeted tests passing | Covered by source-contract back-face test | 2/2 source tests passing | Uses `sampleViewDir` with `adaptiveThickness` | None needed |
| 3.1 | `openspec/changes/vbao-adaptive-thickness-tsl-port/apply-progress.md` | Artifact | N/A | N/A | N/A | N/A | N/A |
| 3.2 | `packages/horizon-ao/src/__tests__/*.test.ts` | Unit | N/A | N/A | 68/68 targeted tests passing | Includes scalar reference + adaptive contract + source contract | None needed |
| 3.3 | `packages/horizon-ao/tsconfig.json` | Typecheck | N/A | Initial failure: source test used Node ambient imports | `tsc` and `tsgo` passing | Vite raw import path added | Added `rawModules.d.ts` |
| 3.4 | N/A | Process | N/A | N/A | Build not run | N/A | N/A |

## Notes

- Opened from the completed scalar adaptive-thickness reference change.
- This change is correctness-first. Benchmark claims remain deferred to `vbao-sampling-backtest` and `vbao-denoise-evidence-gate`.

## Verification

- `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoReference.test.ts packages/horizon-ao/src/__tests__/vbaoAdaptiveThickness.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` — 68/68 passing.
- `node node_modules/eslint/bin/eslint.js packages/horizon-ao/src/VBAONode.ts packages/horizon-ao/src/vbaoAdaptiveThickness.ts packages/horizon-ao/src/__tests__/vbaoAdaptiveThickness.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` — passing.
- `node node_modules/typescript/bin/tsc --noEmit -p packages/horizon-ao/tsconfig.json` — passing.
- `node node_modules/@typescript/native-preview/bin/tsgo.js --noEmit -p packages/horizon-ao/tsconfig.json` — passing.
- External Vite + Playwright: `node node_modules/@playwright/test/cli.js test -g "museum" --reporter=list` from `apps/demo` — 3/3 passing.
- Production build was not run for this change.

## Implementation Notes

- `VBAONode` now imports non-public adaptive constants from `vbaoAdaptiveThickness.ts`.
- The TSL kernel scans the current slice side to find the contiguous same-surface run containing `j`.
- Background/out-of-viewport candidates break continuity and do not enlarge thickness.
- Back-face construction remains sample-local: `samplePos - sampleViewDir * adaptiveThickness`.
- `this.thickness` is now the adaptive maximum cap in the shader, not the raw constant thickness used for every sample.
