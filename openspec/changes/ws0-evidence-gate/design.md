# Design: WS-0 — Close the Evidence Gate

## Technical Approach

Two new TS modules in `packages/horizon-ao/reference/`, both Vitest-pinned (strict TDD, RED first):
`vbaoProductGateBridge.ts` (analytic observations for the 7 required raycast fixtures) and
`vbaoTemporalMetrics.ts` (named ghosting/RMSE/flicker exports lifted from the inline test).
The benchmark `.mjs` consumer then stops emitting `missing-reference-observation` for VBAO product rows.

Single biggest constraint discovered in code (NOT resolved by the proposal): the consumer
`apps/demo/scripts/collect-ao-benchmark.mjs` runs under **plain Node ESM** (`node scripts/...`),
has **no tsx/ts-node loader**, and `@horizonao/core` only exports `./dist/index.js` — `reference/*`
is test-only and unexported. So the `.mjs` script **cannot import the TS bridge**. Every existing
`.mjs` (e.g. `collect-ao-ground-truth-baseline.mjs`) reimplements its math inline in JS. The design
below resolves this boundary explicitly rather than assuming a direct import.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Bridge ownership | Bridge owns all 7 observations directly via `evaluateVbaoRepresentationEstimate` over `RAYCAST_AO_FIXTURES` | Compose with `vbaoProductFixtureObservations.ts` for 4 | That module uses DIFFERENT fixture ids (`flat-plane`, `full-hemisphere`, `two-wall-corner`, `thin-occluder`) — none are `RaycastAoFixtureId` — and `source: 'analytic-product-reference'`, which is NOT a valid `AoReferenceObservationSource`. Composing would force id remapping + an illegal source. Owning all 7 from the raycast fixtures is the only single-source path. Confirms proposal. |
| TS→Node boundary | Bridge stays TS (tested); a deterministic **committed JSON snapshot** (`reference/data/vbaoProductGateObservations.json`) is emitted by the bridge and imported by the `.mjs` via `import ... assert { type: 'json' }` | (a) direct TS import — impossible, no loader; (b) inline JS reimplement in `.mjs` — duplicates math, violates single-source; (c) parallel `.mjs` mirror | Bridge output is fully deterministic (no RNG, fixed slices/sectors). A JSON snapshot keeps ONE math source (TS), is plain-Node importable, and a RED Vitest pins `JSON === createVbaoProductGateObservations()` so drift is caught. |
| `source` label | `'analytic-proxy'` (the load-bearing honest label) | `'gpu-readback'`, new enum member | `'analytic-proxy'` already exists in `AoReferenceObservationSource`; it must NOT masquerade as GPU truth. Note string carries `analytic-vbao-representation` provenance. No public-type change. |
| Temporal lift equality | New module re-exports the EXACT inline bodies; the test file imports them; a RED test asserts new-module results === previously-inline numeric expectations before any cleanup | Rewrite math "cleaner" | Strict-TDD equality preservation: lift must be behavior-identical; only after GREEN may the test switch to imports. |

## Data Flow

    RAYCAST_AO_FIXTURES ─┐
                         ▼
    evaluateVbaoRepresentationEstimate(fixture, 4)  (TS, deterministic)
                         ▼
    createVbaoProductGateObservations() → AoProductionReferenceObservation[7]
                         ▼ (emit, pinned byte-equal by RED test)
    reference/data/vbaoProductGateObservations.json
                         ▼ (import assert json)
    collect-ao-benchmark.mjs → row.referenceObservations = [...7]
                         ▼
    createReferenceGateStatusRows() → status 'compared' (was 'missing-reference-observation')

## Fixture Synthesis (no silent gaps)

All 7 required ids exist verbatim in `RAYCAST_AO_FIXTURES`; bridge maps 1:1, no synthesis needed:
`flat-plane-open`, `box-contact`, `two-wall-corner`, `broad-wall-contact`, `thin-gap-separated-slabs`,
`grazing-surface-wall`, `normal-sensitive-side-contact`. Bridge filters `RAYCAST_AO_FIXTURES` by
`AO_PRODUCTION_REFERENCE_REQUIRED_FIXTURE_IDS`; a RED test asserts the produced id set EQUALS the
required set (catches any future fixture rename). The proposal's worry about synthesizing
`thin-gap-separated-slabs` is moot — it is a real raycast fixture id.

## Interfaces / Contracts

```ts
// vbaoProductGateBridge.ts
export function createVbaoProductGateObservations(
  slices?: number,                              // default 4 (matches groundTruthDelta)
): readonly AoProductionReferenceObservation[]  // length 7, one per required id

// per-fixture mapping (field by field):
// fixtureId      <- fixture.id (RaycastAoFixtureId)
// accessibility  <- evaluateVbaoRepresentationEstimate(fixture, slices)
// source         <- 'analytic-proxy'
// note           <- 'analytic-vbao-representation slices=<n>'  (provenance, not GPU)

// vbaoTemporalMetrics.ts  (lifted; signatures preserved verbatim)
export function computeAoRmse(reference: Float32Array, temporal: Float32Array): number
export function computeGhostScore(prevAo: Float32Array, currAo: Float32Array, motionMagnitude: number): number
export function computeFlickerVariance(aoByFrame: readonly Float32Array[]): number  // NEW: per-pixel temporal variance, mean over pixels
export function findConvergenceFrame(rmseByFrame: number[], threshold: number): number | null
export function evaluateConvergenceGate(rmseByFrame: number[], t: { maxRmse: number; byFrame: number }): { verdict: 'pass' | 'fail'; convergedByFrame: number | null }
export function computeOcclusionResidual(aoValues: Float32Array): number
export function computeColdStartAlpha(frameIndex: number, adaptiveAlpha: number): number
export function computeColdStartDeviation(frameIndex: number, adaptiveAlpha: number, spatialSample: number, temporalHistory: number): number
```

`computeFlickerVariance`: throws `RangeError` on empty input or ragged lengths (mirrors siblings);
returns mean over pixels of the per-pixel variance across frames (0 when all frames identical).

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/horizon-ao/reference/vbaoProductGateBridge.ts` | Create | `createVbaoProductGateObservations` over the 7 required fixtures |
| `packages/horizon-ao/reference/data/vbaoProductGateObservations.json` | Create | Deterministic emitted snapshot consumed by `.mjs` |
| `packages/horizon-ao/reference/vbaoTemporalMetrics.ts` | Create | Lifted exports + `computeFlickerVariance` |
| `packages/horizon-ao/reference/__tests__/vbaoProductGateBridge.test.ts` | Create (RED) | gate reaches `'compared'`; 7 ids covered; JSON byte-equal to fn output; source = `'analytic-proxy'` |
| `packages/horizon-ao/reference/__tests__/vbaoTemporalMetrics.test.ts` | Create (RED) | pins lifted signatures + `computeFlickerVariance` |
| `packages/horizon-ao/reference/__tests__/vbaoTemporalPromotionGates.test.ts` | Modify | import lifted exports (after GREEN) |
| `apps/demo/scripts/collect-ao-benchmark.mjs` | Modify | import JSON snapshot; set `row.referenceObservations` on VBAO product rows |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (RED first) | bridge produces 7 ids, `'analytic-proxy'` source, gate `'compared'` via `createAoProductionReferenceGateReport` | Vitest, deterministic |
| Unit (RED first) | temporal metric signatures + `computeFlickerVariance` + equality with prior inline expectations | Vitest |
| Contract | JSON snapshot === `createVbaoProductGateObservations()` | Vitest deep-equal (drift guard) |
| Integration | `.mjs` row carries `referenceObservations`; `createReferenceGateStatusRows` yields `'compared'` | `productionReport.test.mjs`-style assertion |

## Migration / Rollout

No migration. No public API (`@horizonao/core` exports unchanged). No threshold/constant tuning.
Snapshot regen is a dev step guarded by a test, not a runtime path.

## Open Questions

- [ ] JSON snapshot vs `.mjs` mirror: snapshot chosen for single-source; if the team prefers no committed data file, fall back to a `.mjs` mirror pinned byte-equal by the same RED test. (Non-blocking — both satisfy the contract.)
