# Tasks: VBAO Product Evidence Truthfulness

## Phase 0: Freeze Evidence Claim

- [x] 0.1 Confirm the review finding: Museum VBAO passed explicit `samples`/`slices`, so product evidence was not measuring the fixed preset path.
- [x] 0.2 Add/extend source-contract coverage so this cannot regress silently.

## Phase 1: Fix Product Benchmark Path

- [x] 1.1 Change Museum VBAO options to use `quality: 'quality'`.
- [x] 1.2 Remove explicit `samples`/`slices` from Museum product `vbaoOptions`.
- [x] 1.3 Keep benchmark metadata reporting the fixed quality preset shape.

## Phase 2: Keep Debug Overrides Separate

- [x] 2.1 Add an explicit debug-override benchmark dimension only if sample/slice override evidence is needed.
- [x] 2.2 Ensure reports label override rows as non-product evidence.

## Phase 3: Verification

- [x] 3.1 Run targeted source-contract Vitest.
- [x] 3.2 Run package typecheck if touched TypeScript requires it.
- [x] 3.3 Run `git diff --check`.
- [x] 3.4 Do not run production build unless explicitly requested.