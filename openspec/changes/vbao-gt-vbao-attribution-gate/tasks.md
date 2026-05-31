# Tasks: VBAO GT-VBAO Attribution Gate

- [x] Run SDD init guard and record strict TDD/no-build capabilities.
- [x] Add RED tests for canonical attribution mask ranges.
- [x] Add RED tests for the subpixel upper-anchor attribution report.
- [x] Add internal scalar attribution report.
- [x] Wire attribution into the internal support-bitmask parity result.
- [x] Add RED/green GPU correlation for the attribution target drift.
- [x] Add RED/green shader accumulation guard that snapshots the previous hit
      mask before updating `support-bitmask-v1`.
- [x] Add RED/green per-sample mask attribution for high-sector
      sector-boundary diagnostics.
- [x] Add RED/green high-sector perturbation hypothesis that explains the
      known `6/255` GPU gap without promoting the candidate.
- [x] Add RED/green sector interval precision envelope for the known sector
      `28/29` high-angle boundary.
- [x] Add RED/green live shader-side sample diagnostic/readback for the exact
      `subpixel-thin-occluder` target sample.
- [x] Add RED/green live shader-side slice diagnostic/readback for the exact
      target accumulated masks and reduction terms.
- [x] Add RED/green live shader-side transition diagnostic/readback for the
      exact target sample support-mask update.
- [x] Add RED/green live shader-side prior-sample trace to identify the sample
      that contributes sector `29` before the target transition.
- [x] Add RED/green live shader-side prior-sample geometric/math detail for
      slice `0`, side `1`, sample `2`.
- [x] Add RED/green scalar fixture frontmost-depth parity fix for the known
      subpixel-thin contributor coordinate.
- [x] Reclassify `support-bitmask-v1` target parity after the scalar fixture
      fix: ready for internal label review, not production promotion.
- [x] Add RED/green internal support-bitmask label-review gate that blocks
      missing/pending/worsened fixture labels before Museum matrix work.
- [x] Add RED/green explicit `pending-review` label template rows for every
      required support-bitmask review fixture and variant.
- [x] Add RED/green reviewed label-row ingestion so the internal candidate can
      advance to `ready-for-museum-matrix` only after labels improve and none
      worsen.
- [x] Record pending support-bitmask label-review decision artifact without
      inventing reviewed labels.
- [x] Add support-bitmask label-review capture packet script so reviewers can
      replace `pending-review` rows from live fixture evidence.
- [x] Keep public API and production defaults unchanged.
- [x] Update evidence/current-state notes.
- [x] Run targeted Vitest, package/demo `tsc --noEmit`, targeted WebGPU parity,
      and `git diff --check`.
- [x] No production build.
