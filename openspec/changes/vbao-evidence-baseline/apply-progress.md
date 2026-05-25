# Apply Progress: VBAO Evidence Baseline

## Status

11/12 tasks complete. Task 4.2 is still not fully green. The original blocker
was local port reuse on `127.0.0.1:5173`; the config now uses isolated port
`41737`, and the targeted assertion passes. The remaining failure is Playwright
webServer teardown timing out on Windows after the test passes.

## Completed Tasks

- [x] 1.1 Evidence row contract coverage added in `apps/demo/src/evidence/evidenceCameras.test.ts`.
- [x] 1.2 `EVIDENCE.md` updated with algorithm, view mode, denoise, timing, and failure label fields.
- [x] 1.3 Stale evidence schema replaced; pinned camera guidance kept via `evidenceCameras.ts`.
- [x] 2.1 Playwright expectation added for Museum evidence controls.
- [x] 2.2 Museum route now has demo-local full-res VBAO evidence mode.
- [x] 2.3 Raw and denoised beauty/AO views remain separate.
- [x] 2.4 No public `VBAONodeOptions` or `VBAO_QUALITY_TIERS` changes.
- [x] 3.1 Route/control smoke coverage added in `apps/demo/e2e/ao-compare.spec.ts`.
- [x] 3.2 Manual WebGPU capture steps documented.
- [x] 3.3 Timing source fields documented.
- [x] 4.1 Targeted Vitest run passed.
- [x] 4.3 Manual capture rows remain pending with explicit WebGPU/device blocker.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `apps/demo/src/evidence/evidenceCameras.test.ts` | Unit | N/A (new) | Written first for missing schema/labels | Passed via direct Vitest CLI | 2 cases: schema + labels | Clean |
| 2.1 | `apps/demo/e2e/ao-compare.spec.ts` | E2E | Direct CLI used | Written first for missing full-res control | Assertion passes; command exits nonzero on teardown | WebGPU/fallback branches | Pending teardown fix |
| 3.1 | `apps/demo/e2e/ao-compare.spec.ts` | E2E | Same as 2.1 | Museum control smoke added | Assertion passes; command exits nonzero on teardown | Route/control case | Pending teardown fix |

## Verification

- Passed: `node node_modules/vitest/vitest.mjs run --config apps/demo/vitest.config.ts src/evidence/evidenceCameras.test.ts`
- Passed: `node node_modules/typescript/bin/tsc --noEmit -p apps/demo/tsconfig.json`
- Behavior passed but command failed in teardown:
  `node node_modules/@playwright/test/cli.js test --grep "museum exposes evidence controls" --reporter=list --timeout=15000 --global-timeout=45000`
  reported `ok 1 ... museum exposes evidence controls...` and then timed out waiting for webServer teardown.

## Remaining

- [ ] 4.2 Fix or bypass Windows Playwright webServer teardown, then re-run targeted Playwright to get a zero exit code.
