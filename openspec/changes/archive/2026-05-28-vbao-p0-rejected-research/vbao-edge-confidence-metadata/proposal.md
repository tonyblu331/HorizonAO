# Proposal: VBAO Edge Confidence Metadata

## Summary

Introduce reference-level confidence metadata for future bitmask-aware denoise.
The first implementation scales spatial filter weights by per-sample confidence.

## Motivation

Generic bilateral filtering was rejected because it traded `noise` for `mud`,
`edge-bleed`, and `thin-gap`. A future filter needs confidence/edge information
instead of blindly averaging AO.

## Goals

- Add confidence weighting to the reference spatial denoise formula.
- Keep metadata internal and out of public exports/options.
- Prove low confidence suppresses otherwise valid neighbor weights.

## Non-Goals

- No render-target metadata promotion yet.
- No public denoise option.
- No claim that denoise is accepted without screenshot evidence.
