# VBAO Temporal Gate Verdict

Generated: 2026-06-02T10:35:04.464Z

Verdict: **reject-promotion**

Internal temporal allowed: **no**

Host sampling has host TAA/TRAA evidence, but it did not show a material product pattern/noise win without stripe regression.

| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| beauty | raw-debug | 0.00003 | -0.00016 | 0.00010 | 0.00006 | no | no |
| beauty | product | 0.00004 | 0.00026 | 0.00014 | 0.00005 | no | no |
| ao | raw-debug | 0.00000 | 0.00000 | 0.00000 | 0.00000 | no | no |
| ao | product | 0.00000 | 0.00055 | 0.00002 | 0.00003 | no | yes |

## Host TAA/TRAA Comparison

| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| beauty | product | -0.00023 | 0.00092 | -0.00003 | -0.00001 | no | yes |
| ao | product | 0.00000 | 0.00054 | 0.00010 | -0.00004 | no | yes |

Host TAA/TRAA evidence: **present**.

Same-cost non-temporal alternative evidence: **present**.

Velocity-backed internal temporal evidence: **not present**.

This verifier cannot allow temporal AO unless host TAA/TRAA or velocity-backed internal evidence and same-cost non-temporal comparisons produce a material win without blocking labels or tracked regressions. Complete-but-failing evidence remains `reject-promotion`; AO-owned temporal remains private unless the velocity-backed evidence reaches candidate.
