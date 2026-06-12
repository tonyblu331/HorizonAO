# Phase 3 Candidate Decision: Sector Confidence Stays Private

## Candidate Picked

Pick exactly one candidate from the solver board:

```text
sector confidence / support as private reconstruction metadata
```

Do not pick a thickness-policy shader change for this phase. Existing reference
evidence already rejected the two stronger near-contact candidates for
production because they add sectors to the thin-gap gate.

## Why This Candidate

The fixture matrix says the weakest raw-signal ambiguity is not just interval
width. It is that the scalar bitmask reduction forgets support quality:

```text
broad stable interval -> sector bit set
one-hit stochastic interval -> sector bit set
```

Both become the same scalar occupancy after popcount. Confidence/support is the
candidate that preserves some of that receiver-state truth for reconstruction
without changing the public API.

## RED / Reference Coverage

The candidate is covered by:

- `packages/horizon-ao/reference/__tests__/vbaoReceiverConfidence.test.ts`
- `packages/horizon-ao/reference/__tests__/vbaoAngularIntervalSolverFixtures.test.ts`

The key RED semantics are:

- supported open visibility differs from unsupported open visibility;
- coherent occlusion can be high confidence;
- one-hit stochastic support remains low support;
- stable broad support remains higher confidence than weak support.

## Runtime / Shader Status

Runtime already has the private candidate:

- `packages/horizon-ao/src/VBAOReceiverConfidenceNode.ts`
- `packages/horizon-ao/src/VBAOHalfResCleanupNode.ts`
- `packages/horizon-ao/src/VBAOFullResPolishNode.ts`
- `packages/horizon-ao/src/VBAONode.ts`

No new shader edit is made in this phase. The candidate remains private and
generated shader inspection stays stable by construction.

## Evidence Contrast

Prior receiver-solver evidence already compared:

- scalar-control rows;
- confidence-diagnostic rows;
- pass labels and timings;
- private compute/candidate inventory.

The relevant local artifact is:

- `openspec/changes/vbao-receiver-visibility-solver/phase-3-5-confidence-evidence.md`

That evidence proved observability and private diagnostic wiring. It did not
prove a public product win.

## Decision

Keep sector confidence private and candidate-only.

Promotion remains blocked by:

- candidate-only rows;
- missing reference observations for product promotion;
- current failure labels;
- no public user need for confidence/mask/support controls.

## Consequence

Phase 3 closes as a rejection/preservation decision, not a runtime edit:

```text
confidence/support is useful receiver metadata
AND already wired privately
AND not yet product-promoted
AND not public API
```

The next executable work is Phase 4: ensure reconstruction consumes confidence
and edge compatibility as receiver truth rather than using polish to hide raw
signal defects.
