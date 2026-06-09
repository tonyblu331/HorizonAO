# Confidence/Support Semantics

## Decision

Receiver confidence starts as reference semantics, not runtime metadata.

The first promoted meaning is:

```text
confidence = sqrt(receiver support * slice agreement)
```

where:

- `receiver support` is accepted receiver-compatible samples divided by candidate
  samples;
- `slice agreement` is the consistency of per-slice accessibility after
  visibility-mask reduction;
- confidence is not derived from darkness itself.

## Why

The confidence gate must answer whether the scalar receiver estimate is
trustworthy, not whether the pixel is bright or dark.

Supported open visibility and unsupported open visibility can both have
accessibility `1.0`; only the first should be high confidence. Likewise, a fully
occluded receiver can be high confidence when slices agree and samples are
compatible.

## Current Scope

Implemented as reference/test semantics only:

- `packages/horizon-ao/reference/vbaoReceiverConfidence.ts`
- `packages/horizon-ao/reference/__tests__/vbaoReceiverConfidence.test.ts`

`evaluateScalarVbaoReference()` now records:

- `sliceAcceptedSampleCounts`;
- `sliceCandidateSampleCounts`.

These are oracle terms for the confidence gate. They do not add runtime render
targets, public options, package exports, shader formulas, temporal behavior, or
evidence claims.

## What This Replaces

This replaces vague confidence ideas such as:

```text
confidence = AO darkness
confidence = post blur strength
confidence = sector mask saturation alone
```

with receiver-state evidence:

```text
Were enough local receiver-compatible samples observed?
Do independent slices agree after the visibility-mask reduction?
```

## Next Gate

Phase 3.2 must choose the smallest private metadata representation. `RG16F`
remains only a candidate until source/render-target evidence proves it is the
smallest useful representation for carrying scalar AO plus support/confidence.

Do not add a public `confidence`, `metadata`, `support`, or `mask` option.
