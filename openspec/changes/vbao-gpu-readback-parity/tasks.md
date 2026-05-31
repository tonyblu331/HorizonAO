# Tasks: VBAO GPU Readback Parity Gate

- [x] Add RED test for named GPU readback fixture IDs.
- [x] Add scalar flat-plane parity helper for fixed fixture pixels.
- [x] Add readback comparison result with max error, row status, and tolerance.
- [x] Wire `/vbao-parity` to expose one canonical fixture matrix payload.
- [x] Update Playwright E2E to assert fixed scalar reference fixture rows when
      `E2E_WEBGPU_PARITY=1`.
- [x] Keep parity helpers out of the public package API.
- [x] Run `E2E_WEBGPU_PARITY=1` successfully on a stable WebGPU Playwright or
      manual browser session and record the result.
- [ ] Expand fixtures beyond the flat plane: two-wall corner and thin occluder.
      Planned in `openspec/changes/vbao-parity-fixture-expansion/`.
