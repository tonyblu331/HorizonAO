# Benchmark Contrast: Pasted Review vs Current Evidence

## Purpose

The pasted review is useful because it compares VBAO against GTAO, SSAO, and
N8AO with concrete metrics. It is not, by itself, a release gate. This document
separates review pressure from committed repo evidence so implementation work
does not chase stale or uncommitted rows.

## Pasted Review Signal

| Axis | Pasted review claim | SDD classification |
| --- | --- | --- |
| VBAO full-res vs GTAO denoised | Noise and stripe are roughly tied; GTAO wins edge bleed; VBAO wins thin-gap; VBAO costs about 2.6x more. | Keep as product pressure, but remeasure with current harness before changing defaults. |
| VBAO vs SSAO | VBAO improves edge bleed, but SSAO can preserve thin contact because near-radius sampling and thickness caps differ. | Keep as contact/thickness pressure; route through fixture/reference gates, not screenshots alone. |
| VBAO vs N8AO | VBAO wins noise/edge against N8AO and roughly ties thin-gap. | Keep as baseline comparison only; N8AO is not ground truth. |
| Half-res product | Faster, but qualitative false-curvature and scale-mismatch remain blockers. | Keep; matches current preset-policy failure pressure. |
| 720p behavior | VBAO degrades similarly to GTAO and does not gain from reduced resolution. | Keep as evidence-capture requirement for any default-policy change. |
| FAST-like noise source | Review says FAST-like trades better than STBN and default. | Stale against current committed evidence; 2026-06-04 evidence keeps `phase-atlas-stable-hash` and rejects FAST-like/STBN candidates. |

## Current Repo Evidence

`EVIDENCE.md` records a later signal-quality studio gate on 2026-06-04:

- keep `phase-atlas-stable-hash` as the default sampling control;
- reject IGN, STBN, Hilbert/R2-style LUT, 128x128 atlas, and same-budget
  sample-shape candidates from that pass;
- keep contact/thickness candidates as controls unless reference gates prove a
  better policy;
- keep product promotion blocked because reference observations and threshold
  verdicts are missing and VBAO product rows still carry failure labels.

`EVIDENCE.md` also records release-gap closure rows on 2026-06-04. Those rows are
newer than the pasted review and show product promotion remains blocked. They do
not license README, marketing, release-candidate, or default-preset claims.

## Contrast Decisions

- Do not promote FAST-like or STBN from the pasted review. The current evidence
  explicitly rejects those candidates.
- Do not demote VBAO's bitmask kernel because GTAO wins edge bleed in one review
  table. Edge bleed is a blocker to solve, not proof that the representation is
  wrong.
- Do not use screenshot proxies as physical AO truth. Thin-gap, edge, and
  contact claims need fixture/readback/reference gates before product promotion.
- Keep the competitor matrix in future captures: GTAO, SSAO, VBAO, and N8AO
  should stay comparable at both 1920x1080 and 1280x720.
- Treat full-resolution VBAO as the honest quality baseline until half-resolution
  reconstruction earns promotion with reference-backed evidence.

## Required Follow-Up Evidence

Before any default-policy or quality claim changes, capture or verify:

- current GTAO/SSAO/N8AO/VBAO rows from the same route, camera, resolution, and
  AO/beauty output modes;
- product GPU timings, not only frame medians;
- failure labels for noise, edge bleed, false curvature, scale mismatch, and
  thin-gap/contact behavior;
- reference-backed observations for the fixture IDs named by the release gate.
