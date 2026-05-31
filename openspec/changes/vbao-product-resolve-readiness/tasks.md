# vbao-product-resolve-readiness Tasks

- [x] Add RED source-contract tests for validity gate, effective-thickness clamp, JBU4 resolve, texture contract, and presets.
- [x] Add radius-valid sample rejection to `VBAONode`.
- [x] Clamp sample-local thickness before computing the back interval endpoint.
- [x] Change raw AO and internal reconstruction texture filtering to nearest for manual resolve/polish.
- [x] Keep `VBAOResolveNode` as an internal pass texture with JBU4.
- [x] Keep cleanup/resolve/polish passes behind the single public `VBAONode` product boundary.
- [x] Update quality preset constants to the current single-product tiers.
- [x] Run targeted Vitest/source checks, package typecheck, and `git diff --check`.