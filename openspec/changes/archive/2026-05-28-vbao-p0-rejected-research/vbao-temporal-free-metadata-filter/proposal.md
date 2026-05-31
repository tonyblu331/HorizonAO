# Proposal: VBAO Temporal-Free Metadata-Aware Filter

## Summary

Add an internal Museum-demo GPU filter candidate that uses existing VBAO metadata
signals (`edge-depth`, `edge-normal`, and `confidence`) to reduce raw VBAO noise
without temporal history.

## Scope

- Demo/benchmark only.
- No public `VBAONodeOptions` or `@horizonao/core` export changes.
- No production promotion without screenshot/timing evidence.

## Motivation

The hardened GPU/scalar parity oracle is now green. The next risk is filtering
the raw visibility result without turning depth bands into `false-curvature` or
blurring across thin/silhouette geometry.

## Decision

Implement a candidate named `metadata-aware` beside the existing `generic` and
`custom-bilateral` demo spatial filters, then compare it against raw VBAO, GTAO,
N8AO, and previous VBAO filters in the benchmark matrix.
