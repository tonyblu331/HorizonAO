# VBAO Temporal Gate Verdict

Generated: 2026-06-04T18:08:40.437Z

Verdict: **reject-promotion**

Clean-checkout reproducible: **no**

Clean-checkout reproducibility requires every explicit temporal gate input file and referenced screenshot to be tracked by git with no staged or unstaged changes.

Internal temporal allowed: **no**

Host sampling has host TAA/TRAA evidence, but it did not show a material product pattern/noise win without stripe regression.

| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| ao | product | -0.04695 | 0.06692 | -0.03733 | -0.01296 | yes | yes |

## Host TAA/TRAA Comparison

| View | Output | Pattern delta | Stripe delta | Edge delta | Thin-gap delta | Material win | Stripe regression |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| ao | product | -0.03093 | 0.03298 | -0.01561 | -0.00207 | yes | yes |

Host TAA/TRAA evidence: **present**.

Same-cost non-temporal alternative evidence: **present**.

Velocity-backed internal temporal evidence: **not present**.

Velocity reset/lifetime evidence: **not present**.

Velocity motion evidence complete: **no**.

Velocity motion/disocclusion gate clean: **no**.

Velocity motion evidence kinds: **camera-motion, object-motion, disocclusion**.

This verifier cannot allow temporal AO unless host TAA/TRAA or velocity-backed internal evidence and same-cost non-temporal comparisons produce a material win without blocking labels or tracked regressions. Velocity-backed internal temporal additionally requires motion/disocclusion evidence. Complete-but-failing evidence remains `reject-promotion`; AO-owned temporal remains private unless the velocity-backed evidence reaches candidate.
