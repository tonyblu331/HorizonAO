# Proposal: VBAO GT-VBAO Attribution Gate

## Summary

Add an internal scalar attribution gate for the remaining `support-bitmask-v1`
GPU/scalar drift. This change explains the drift before any shader promotion,
spatial-filter work, Museum claim, or public API expansion.

Known target:

- fixture: `subpixel-thin-occluder`
- anchor: `subpixel-thin-left-upper-receiver`
- pixel: `[27, 33]`
- observed drift: `0.023529` AO

## Boundaries

- No production VBAO behavior change.
- No public `VBAONodeOptions` change.
- No `@horizonao/core` export expansion.
- No spatial-filter candidate in this gate.
- No production build.
