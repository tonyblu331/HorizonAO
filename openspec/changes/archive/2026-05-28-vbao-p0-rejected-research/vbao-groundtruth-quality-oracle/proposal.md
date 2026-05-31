# Proposal: VBAO Ground-Truth Quality Oracle

## Summary

Add a reference-only quality oracle for VBAO evidence. The oracle gives tests and
future benchmark tooling a numeric way to compare candidate accessibility against
analytic or deterministic hemisphere ground truth before any shader path is
promoted.

## Motivation

The latest evidence rejected high-sample, schedule-only, generic denoise, and the
2x2 depth prefilter candidate. The missing production discipline is an oracle:
XeGTAO/CACAO-style work is tuned against reference quality, not vibes.

## Goals

- Provide deterministic, frame-free hemisphere sampling for reference fixtures.
- Score accessibility error as a normalized quality value.
- Label quality failures including `false-curvature`.
- Keep all oracle code internal to source/tests; no public package export.

## Non-Goals

- No public `VBAONodeOptions` changes.
- No GPU ray tracing or temporal accumulation.
- No claim that a shader candidate passes until screenshots and timings exist.

## Decision Rule

Any future sampling, depth hierarchy, or denoise candidate must explain how it
improves oracle score and screenshot labels before promotion.
