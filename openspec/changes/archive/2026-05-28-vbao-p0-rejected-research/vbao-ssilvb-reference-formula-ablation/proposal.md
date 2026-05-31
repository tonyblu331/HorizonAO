# Proposal: VBAO SSILVB/reference Formula Ablation

## Summary

Add an internal demo/benchmark-only formula ablation gate that compares the current production cosine-weighted VBAO output against the SSILVB/reference popcount accessibility output.

This is not a production formula change and not a public API expansion. The goal is evidence: fixtures and Museum screenshots must show whether the SSILVB/reference formula is better, worse, or simply different before any promotion decision.

## Non-goals

- No public `VBAONodeOptions` change.
- No `@horizonao/core` export.
- No spatial-filter-layered comparison.
- No compatibility alias or duplicate route.
- No fake GPU-paper wording.
