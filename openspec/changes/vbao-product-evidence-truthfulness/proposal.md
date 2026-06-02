# Proposal: VBAO Product Evidence Truthfulness

## Summary

Close the gap between review claims and the demo/benchmark path. Product evidence must exercise the fixed `quality` preset path, while debug sample overrides remain separate from release-candidate claims.

## Motivation

The review found that the Museum evidence path still passed explicit `samples` and `slices`, which forces `VBAONode` into the dynamic loop-shape path. That means evidence could claim fixed product presets while measuring a debug override. That's the kind of mismatch that makes a system look better than it is. We fix the measurement path before optimizing anything else.

## Goals

- Make Museum VBAO product rows use `quality: 'quality'` without explicit `samples`/`slices`.
- Preserve explicit sample/slice overrides only for separate debug/override benchmark rows.
- Keep evidence labels honest: VBAO product output is product output, not a public denoiser.
- Record remaining release-candidate blockers from the external review as gates, not vibes.

## Non-Goals

- No temporal AO history.
- No bent AO.
- No default noise-source change.
- No public reconstruction/filter nodes.
- No production build unless explicitly requested.

## Success Criteria

- Source-contract tests fail if Museum product VBAO reintroduces explicit `samples`/`slices` in `vbaoOptions`.
- Benchmark metadata reports the fixed product quality shape that is being measured.
- The next evidence capture can distinguish product preset rows from debug override rows.