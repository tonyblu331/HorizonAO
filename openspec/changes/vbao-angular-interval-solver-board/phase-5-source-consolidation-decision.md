# Phase 5 Decision: Consolidation Without Hot-Loop Extraction

## Purpose

Decide what to consolidate after the solver fixture matrix and reconstruction
audit.

## Current State

The source already has several useful consolidation points:

- `vbaoConstants.ts` names contact/thickness policy constants;
- `vbaoBilateralWeight.ts` centralizes reconstruction geometry compatibility;
- `VBAOEffectPass.ts` centralizes fullscreen pass boilerplate;
- `VBAOReceiverConfidenceNode.ts` owns the private confidence sidecar;
- `VBAONode.ts` remains the raw hot-loop owner.

## Decision

Do not extract the raw hot loop now.

The deletion test says extraction would not remove complexity yet. It would
mostly move shader-local terms into another file while increasing generated
shader inspection risk and source-test brittleness.

## Approved Consolidation Shape

Future consolidation is allowed only when it improves locality:

- duplicate validity/thickness semantics between raw and confidence sidecar can
  be consolidated after a behavior-preserving source audit;
- bilateral compatibility constants can be named if evidence says a constant is
  being tuned;
- stale candidate docs can be archived after measured rejection;
- benchmark-only gates can stay demo/evidence-owned.

## Blocked Consolidation

Do not:

- extract raw interval math while changing formulas;
- create helper modules that simply restate local shader expressions;
- expose confidence/support/mask types publicly;
- collapse raw/product texture semantics;
- remove generated shader inspection guardrails.

## Verification Rule

Any future consolidation must pass:

```text
source contract tests
AND reference fixtures
AND generated shader inspection when raw kernel text changes
AND diff hygiene
```

No production build unless explicitly requested.
