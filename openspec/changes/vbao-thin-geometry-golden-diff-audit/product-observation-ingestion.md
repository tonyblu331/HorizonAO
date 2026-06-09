# Product Observation Ingestion

## Status

Phase 3.2 documented; Phase 3.3 pinned by test.

## Current Ingestion Path

Product rows can provide ray-cast fixture observations through either field:

```ts
referenceObservations: [
  {
    fixtureId: 'thin-gap-separated-slabs',
    accessibility: number,
    source: 'gpu-readback',
  },
]
```

or:

```ts
referenceGate: {
  observations: [
    {
      fixtureId: 'thin-gap-separated-slabs',
      accessibility: number,
      source: 'gpu-readback',
    },
  ],
}
```

`createAoProductionReferenceGateReport` then maps those observations into the
ray-cast report and compares them against `aoRaycastReference.ts`.

## Missing Producer

The collector currently does not produce the `thin-gap-separated-slabs`
accessibility value. Until a GPU-readback or equivalent measured producer
exists, product benchmark rows remain rendered thin-gap proxy evidence only.

## Contract Test

`packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts`
now pins the boundary:

- a product row with some reference observation is `compared`;
- if it omits `thin-gap-separated-slabs`, the VBAO ray-cast summary still lists
  that fixture as missing;
- the summary remains warning-level instead of silently passing.

## Next Valid Work

Add a measured producer for `thin-gap-separated-slabs` accessibility, then feed
that observation into the existing row fields. Do not add another report layer
before the producer exists.
