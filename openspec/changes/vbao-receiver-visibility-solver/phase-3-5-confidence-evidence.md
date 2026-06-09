# Phase 3.5 Confidence Evidence

## Purpose

Phase 3.5 compares a scalar reconstruction control against the private receiver
confidence candidate with screenshots, labels, and pass timings.

This comparison uses two explicit benchmark lanes:

- `scalar-control`: disables receiver-confidence-guided reconstruction in the
  demo benchmark path while keeping the same half-resolution product stage.
- `confidence-guided`: keeps the private receiver confidence sidecar enabled
  and captures the `confidence` diagnostic stage.

The switch is benchmark-only. It is not a public `VBAONodeOptions` field.

## Commands

```sh
AO_BENCHMARK_MODES=vbao \
AO_BENCHMARK_VIEWS=ao \
AO_BENCHMARK_DENOISE_STATES=true \
AO_BENCHMARK_VBAO_RESOLUTION_STATES=half \
AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE=off \
AO_BENCHMARK_VBAO_RECEIVER_CONFIDENCE=scalar-control \
AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES=final \
AO_BENCHMARK_SCREENSHOT_ROOT=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control \
AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control.json \
AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control.md \
pnpm --filter @horizonao/demo benchmark:ao
```

```sh
AO_BENCHMARK_MODES=vbao \
AO_BENCHMARK_VIEWS=ao \
AO_BENCHMARK_DENOISE_STATES=true \
AO_BENCHMARK_VBAO_RESOLUTION_STATES=half \
AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE=sector-confidence-smoke \
AO_BENCHMARK_VBAO_RECEIVER_CONFIDENCE=confidence-guided \
AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES=confidence \
AO_BENCHMARK_SCREENSHOT_ROOT=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate \
AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate.json \
AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate.md \
pnpm --filter @horizonao/demo benchmark:ao
```

## Artifacts

Control:

- `artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control.json`
- `artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control.md`
- `artifacts/benchmarks/vbao-receiver-confidence-phase3-5-control/`

Candidate:

- `artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate.json`
- `artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate.md`
- `artifacts/benchmarks/vbao-receiver-confidence-phase3-5-candidate/`

Screenshots exist at both required capture resolutions:

- `1920x1080`
- `1280x720`

## Timing Summary

| Resolution | Lane | Output | Confidence pass | Product total GPU ms | Diagnostic total GPU ms | Compute CPU ms |
| --- | --- | --- | --- | ---: | ---: | ---: |
| 1920x1080 | scalar-control | product | skipped | 1.231872 | n/a | n/a |
| 1280x720 | scalar-control | product | skipped | 0.665600 | n/a | n/a |
| 1920x1080 | confidence-guided | confidence-diagnostic | measured 0.890880 | n/a | 0.890880 | 1.300000 |
| 1280x720 | confidence-guided | confidence-diagnostic | measured 0.508928 | n/a | 0.508928 | 1.100000 |

## Evidence Status

The direct control rows are complete evidence rows:

- screenshots exist;
- frame stats exist;
- pass timings exist;
- `confidence` is `skipped` in scalar-control rows.

The confidence diagnostic rows are complete evidence rows:

- screenshots exist;
- frame stats exist;
- `confidence` is measured;
- product passes are skipped;
- `total-diagnostic` is derived from the measured confidence pass;
- the `sector-confidence-smoke` compute candidate stays listed as private
  candidate evidence.

The reconstruction-gate aggregate rows in the control report are intentionally
incomplete because this Phase 3.5 run captures `final` only, not the full
`raw, cleanup, resolve, polish, final` stage set.

## Decision

Keep receiver confidence private.

The Phase 3.5 evidence proves the harness can compare:

- blind scalar reconstruction control;
- confidence diagnostic output;
- pass labels and timing shape;
- private candidate inventory.

It does not prove a public product win, a release threshold win, or reference
coverage. Both scalar-control and confidence-diagnostic rows are
`candidate-only`, with promotion blocked by missing reference observations,
threshold gate, and current failure labels.

This replaces the vague idea of "compare confidence" with an explicit private
benchmark switch and a diagnostic output lane. It also avoids treating
confidence as public API or multiplying the public product AO by confidence.
