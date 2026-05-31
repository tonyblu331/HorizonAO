# vbao-product-resolve-readiness Apply Progress

## Completed

- Added RED source-contract coverage for radius-valid samples, effective-thickness clamp, JBU4 resolve, real pass-texture contracts, and current presets.
- Added sample-local validity checks in `VBAONode` before any bitmask sector write.
- Clamped blocker back-face thickness to `min(thickness, 0.85 * sampleDistance)`.
- Switched raw AO and internal reconstruction texture filtering to nearest because JBU4/polish own interpolation and blur manually.
- Kept `VBAOResolveNode` as an internal Red/HalfFloat pass texture.
- Kept cleanup/resolve/polish passes inside the single public `VBAONode` product boundary.
- Updated presets to `performance`, `balanced`, `quality`, and `ultra`.

## Verification

- Passed: `node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts`
- Passed: `cd packages/horizon-ao && node ../../node_modules/typescript/bin/tsc --noEmit`
- Passed: `git diff --check`