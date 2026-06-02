# Cleanup Removal Experiment

Phase 3 tested whether half-resolution cleanup can be skipped before JBU resolve.
The experiment used an evidence-only benchmark path, not a public
`VBAONodeOptions` field.

## Setup

- Scene: `museum`
- Resolutions: 1920x1080 and 1280x720
- Views: `beauty`, `ao`
- Output: product half-resolution VBAO
- Cleanup-on artifact: `artifacts/benchmarks/vbao-cleanup-on.json`
- Cleanup-skip artifact: `artifacts/benchmarks/vbao-cleanup-skip.json`
- Pass timing samples: 3

## Result

| Row | Total delta | Noise delta | Stripe delta | Edge delta | Label change |
| --- | ---: | ---: | ---: | ---: | --- |
| 1920x1080 beauty | -0.103 ms | +0.00070 | +0.00594 | +0.00036 | none |
| 1920x1080 AO | -0.096 ms | +0.00044 | +0.00423 | +0.00029 | none |
| 1280x720 beauty | -0.051 ms | +0.00066 | +0.00982 | +0.00065 | none |
| 1280x720 AO | -0.049 ms | +0.00029 | +0.00642 | +0.00051 | none |

Positive total delta means skip is slower; negative means skip is faster.
Lower noise, stripe, and edge proxy values are better.

## Decision

Do not remove `VBAOHalfResCleanupNode`.

Skipping cleanup saves a small pass cost in this matrix, but every comparable row
regresses noise, stripe, and edge-bleed proxies. Thin-gap proxy increases, but
that does not offset broad quality regressions. Current failure labels remain
unchanged, so there is no evidence that cleanup removal fixes a named failure.

Keep cleanup as the default low-resolution reconstruction stage. Future cleanup
work should focus on cost reduction or targeted conditions, not unconditional
deletion.
