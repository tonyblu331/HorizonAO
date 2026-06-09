# Slice Reduction Decision

## Status

Spec decision recorded; runtime shader candidate implemented.

## Fixture Result

The multi-slice/non-axis scalar reference fixture compares:

- current production-style uniform slice averaging; and
- projected-normal weighted slice averaging inspired by the GTAO outer integral.

The fixture shows a material warning-level gap:

```text
uniform accessibility - projectedWeightedAccessibility > 0.03
```

This is enough to reject the claim that the existing fixture set proves uniform
slice averaging is safe. Runtime was changed only after the root spec and
source contracts were updated.

## Decision

The runtime formula candidate is projected-normal slice weighting
using the slice projected-normal length already computed in the raw kernel
(`NprojLen`).

The candidate formula is:

```text
weightedAccessibility += sliceAccessibility * NprojLen
weightSum += NprojLen
```

This is a raw-kernel candidate correction. It has shader inspection and
raw-kernel screenshot/timing evidence, but not half-resolution product-stage
promotion evidence.

## Runtime Change Checklist

- [x] Update the root `openspec/specs/vbao-node/spec.md` in the same change that
  lands runtime behavior.
- [x] Update source contracts that previously rejected
  `sliceAccessibility.mul(NprojLen)`.
- [x] Run targeted source/reference tests.
- [x] Capture generated shader inspection.
- [x] Capture raw-kernel screenshots and GPU timings.
- [x] Record raw-kernel timing rows in `EVIDENCE.md`.
- [ ] Capture product-stage reconstruction rows before making a
      half-resolution product promotion claim.

## Non-Decision

This does not reopen temporal, denoise, pass fusion, or public API scope.
