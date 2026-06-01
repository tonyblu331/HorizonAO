# VBAO Temporal Gate Verdict

Generated: 2026-06-01T21:07:04.191Z

Verdict: **prototype-only**

Internal temporal allowed: **yes**

Host temporal sampling is not promoted, but complete host TAA/TRAA and same-cost alternative evidence are present, so private internal temporal prototyping may start with stripe regression carried as a known risk and without public API or quality claims.

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

## Internal Temporal Comparison

| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| beauty | product | 0.00000 | 0.00000 | 0.00000 | 0.00000 | no | no |
| ao | product | 0.00000 | 0.00000 | 0.00000 | 0.00000 | no | no |

Host TAA/TRAA evidence: **present**.

Same-cost non-temporal alternative evidence: **present**.

Internal temporal evidence: **present**; promotion pass: **no**.

This verifier cannot promote temporal AO unless host TAA/TRAA evidence is present, same-cost non-temporal comparisons are present, and internal temporal evidence produces a material win without stripe, edge, or thin-gap regression. Private internal temporal prototyping is allowed when the evidence set is complete, with observed regressions carried forward as prototype risks rather than promotion claims.
