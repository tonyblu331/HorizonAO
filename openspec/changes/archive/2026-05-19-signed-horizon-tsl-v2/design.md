# Design: signed-horizon-tsl-v2

## Technical Approach

Keep the current Three TSL pass architecture and port the raw kernel naming/resolve to signed-horizon concepts. Use CPU tests to pin the analytic contract and keep E2E scalar-debug checks as the render proof.

## Architecture Decisions

| Decision          | Choice                          | Rejected                        | Rationale                                                   |
| ----------------- | ------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Shader strategy   | Terminology-first TSL alignment | Full analytic rewrite in one PR | Reduces regression risk while making the math auditable     |
| Public API        | No changes                      | New math/quality knobs          | No test proves a new knob is necessary                      |
| Output semantics  | Store accessibility             | Store strict occlusion          | Current composite and debug paths already use accessibility |
| Renderer fallback | Three owns fallback             | Custom fallback                 | Matches project rule and Three architecture                 |

## Data Flow

```text
scene depth + normal + camera
  -> HorizonAoNode raw signed-horizon accessibility
  -> HorizonAoDenoiseNode scalar denoise
  -> debug/composite
```

## File Changes

| File                                            | Action | Description                                                              |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `packages/horizon-ao/src/horizonAoMath.ts`      | Modify | Add CPU parity helper for cos-horizon resolve against signed terminology |
| `packages/horizon-ao/src/horizonAoMath.test.ts` | Modify | Add RED/GREEN tests for parity and guards                                |
| `packages/horizon-ao/src/horizonAoNode.ts`      | Modify | Rename raw-kernel helpers and variables to signed-horizon terms          |
| `openspec/horizonao-current-shape-roadmap.md`   | Modify | Mark signed-horizon TSL v2 progress                                      |

## Interfaces / Contracts

No public runtime API changes.

Internal contract:

```ts
resolveSignedHorizonCosineSliceAccessibility({
  positiveCosHorizon,
  negativeCosHorizon,
  projectedNormalOnTangent,
  projectedNormalOnView,
})
```

This helper mirrors the current TSL slice resolve so tests can lock formula behavior before shader edits.

## Testing Strategy

| Layer | What to Test                         | Approach                 |
| ----- | ------------------------------------ | ------------------------ |
| Unit  | CPU reference and cos-horizon parity | Vitest                   |
| Type  | Public exports and demo code         | `tsc`, `tsgo`            |
| E2E   | Scalar AO debug proof                | Targeted Playwright grep |
| Lint  | No style/type lint drift             | ESLint                   |

## Migration / Rollout

No migration required.

## Open Questions

None.
