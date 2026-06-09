# Pass Ownership Audit

## Purpose

Phase 4 asks whether `VBAOResolveNode` and `VBAOHalfResCleanupNode` should be
normalized onto `VBAOEffectPass`. This audit compares the source shape and
decides whether to refactor in this SDD.

## Source Shape

| File | Current ownership | Notes |
| --- | --- | --- |
| `VBAOEffectPass.ts` | Per-instance render target, material, pass texture, and renderer state; shared helper for fullscreen rendering. | Already used by full-res polish and temporal/evidence-style passes. |
| `VBAOFullResPolishNode.ts` | Extends `VBAOEffectPass`. | Existing normalized pass shape. |
| `VBAOResolveNode.ts` | Owns render target, material, pass texture, module-level quad mesh, module-level size, and module-level renderer state. | Product JBU4 resolve; pass label is `VBAOResolve`; output texture is `VBAO.Resolve`. |
| `VBAOHalfResCleanupNode.ts` | Owns render target, material, pass texture, module-level quad mesh, module-level size, and module-level renderer state. | Optional half/low-resolution cleanup; pass label is `VBAOHalfResCleanup`; output texture is `VBAO.HalfResCleanup`. |

## Decision

Do not refactor pass ownership in this SDD continuation.

Reason: the duplicated shape is real, but both standalone passes are active
product reconstruction stages. Moving them onto `VBAOEffectPass` should be
behavior-neutral, but it still touches render-target sizing, pass labels,
renderer state restoration, and evidence capture. That deserves a focused patch
with screenshot/timing refresh if done.

## Future Refactor Gate

A future pass-ownership refactor may proceed only if it preserves:

- public exports;
- `getTextureNode()` behavior;
- pass labels and texture names;
- half-resolution sizing semantics;
- generated shader inspection expectations;
- screenshot and timing evidence capture.

Targeted source tests alone are not enough for promotion if pass timing or
rendered output changes.
