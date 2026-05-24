# ADR-010: `normalNode` Is a Required Positional Argument in v1

- **Status:** Accepted
- **Date:** 2026-05-22
- **Related:** ADR-007 (pivot), ADR-008 (AO-only scope).

## Context

`GTAONode(depthNode, normalNode, camera)` accepts a `normalNode` and, when absent in some integration paths, falls back silently to normals reconstructed from depth derivatives. Depth-derived normals are cheap but degrade exactly where VBAO is supposed to win: thin geometry, edges, depth discontinuities, foliage cards, railings.

If `VBAONode` mirrors GTAO's silent fallback, the headline claim — "better thin-geometry AO than GTAO" — is undermined by the default usage pattern. Users who do not pass a real `normalNode` will see VBAO output that is not meaningfully better than GTAO's, and EVIDENCE.md screenshots become uninterpretable.

## Decision

`VBAONode`'s constructor signature is:

```ts
constructor(
  depthNode: Node,
  normalNode: Node,         // required positional, NOT optional
  camera: Camera,
  options?: VBAONodeOptions
)
```

Passing `null` or `undefined` for `normalNode` SHALL throw `TypeError('VBAONode: normalNode is required')`.

The factory function `vbao(depthNode, normalNode, camera, options?)` enforces the same contract.

There is no silent depth-derived normal fallback in v1. If users want depth-derived normals, they must pass a `Node` that performs that reconstruction explicitly. The decision is then theirs and visible at the call site.

## Consequences

**Positive:**

- Thin-geometry claim is defensible by default. The screenshot you take of Sponza railings will show the difference VBAO actually delivers.
- The constructor signature documents the contract — readers see immediately that VBAO is not a drop-in for code that previously passed `null` for normals.
- EVIDENCE.md captures (PR-05) cannot accidentally degrade by missing normals.

**Negative:**

- Slightly more friction to drop into demos and tests — every call site must pass a real `normalNode`.
- Inconsistent with `GTAONode`'s silent fallback behaviour.

**Risks:**

- Pressure to add a "depth-derived normal" helper to make migration easier. Allowed: ship an explicit helper (e.g. `normalFromDepth(depthNode, camera)`) as a separate utility, but it MUST be passed explicitly, not invoked silently inside `VBAONode`.

## Future allowance (v2 only, if at all)

If v2 ships, this ADR allows a follow-up to add a depth-derived fallback under one condition: the fallback is gated behind an explicit `options.depthDerivedNormalFallback: true` flag, and the constructor emits `console.warn` once per process when that fallback is used. The silent default remains: required normal.

## Implementation notes

- The error message is exactly `VBAONode: normalNode is required` — pinned by the capability spec scenarios so a typo in the message fails the test.
- The check happens before any `super(...)` call uses the normal — that is, the constructor validates positional args first, then proceeds with `TempNode` initialisation.
