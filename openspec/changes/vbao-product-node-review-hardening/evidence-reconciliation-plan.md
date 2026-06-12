# Evidence Reconciliation Plan: Phase 6.3 and 6.4

## Purpose

Phase 6 is the evidence-heavy remainder of this SDD. It has two jobs:

1. Reproduce or supersede the pasted GTAO/SSAO/N8AO/VBAO benchmark claims.
2. Attach reference-backed fixture observations before any product-quality
   promotion claim.

Screenshots, timing rows, and proxy metrics are useful, but they are not
physical AO truth. Product claims stay blocked until benchmark rows and
reference observations agree.

## 6.3 Competitor Benchmark Matrix

### Goal

Replace the pasted numeric review with committed, current-harness evidence for
GTAO, SSAO, N8AO, and VBAO.

### Required Capture

Run the existing benchmark harness with:

- scenes: `museum`;
- resolutions: `1920x1080` and `1280x720`;
- modes: `gtao,ssao,vbao,n8ao`;
- views: `beauty,ao`;
- denoise states: `false,true`;
- VBAO resolution states: `full`;
- VBAO temporal mode: `off`;
- VBAO sample mode: `product-preset`;
- WebGPU required;
- pass timings enabled.

Use explicit output paths so the run cannot overwrite unrelated evidence:

```powershell
$env:AO_BENCHMARK_SCENES='museum'
$env:AO_BENCHMARK_MODES='gtao,ssao,vbao,n8ao'
$env:AO_BENCHMARK_VIEWS='beauty,ao'
$env:AO_BENCHMARK_DENOISE_STATES='false,true'
$env:AO_BENCHMARK_VBAO_RESOLUTION_STATES='full'
$env:AO_BENCHMARK_VBAO_TEMPORAL_MODE='off'
$env:AO_BENCHMARK_VBAO_SAMPLE_MODE='product-preset'
$env:AO_BENCHMARK_PASS_TIMING_SAMPLES='10'
$env:AO_BENCHMARK_REQUIRE_WEBGPU='1'
$env:AO_BENCHMARK_OUTPUT_JSON='artifacts/benchmarks/ao-competitor-reconciliation-latest.json'
$env:AO_BENCHMARK_OUTPUT_MD='artifacts/benchmarks/ao-competitor-reconciliation-summary.md'
$env:AO_BENCHMARK_SCREENSHOT_ROOT='artifacts/benchmarks/screenshots-ao-competitor-reconciliation'
pnpm --filter @horizonao/demo exec node scripts/collect-ao-benchmark.mjs
```

### Acceptance

- Rows exist for `gtao`, `ssao`, `vbao`, and `n8ao`.
- Rows exist at both required resolutions.
- Rows include `beauty` and `ao` views.
- Rows include quality metrics:
  - `patternNoiseScore`;
  - `stripeScore`;
  - `edgeBleedProxy`;
  - `thinGapPreservationProxy`.
- Rows include product/pass timing data where the harness can report it.
- Summary explicitly labels pasted-review claims as one of:
  - reproduced;
  - superseded;
  - not comparable because harness/scene/output semantics differ.

### Non-Acceptance

- A single screenshot is not enough.
- Frame median alone is not enough.
- N8AO must remain `internally-filtered`, not mislabeled as raw-vs-denoised
  parity.
- GTAO/SSAO raw rows may be controls, but product comparison uses denoised rows.
- VBAO half-resolution is out of this specific competitor reconciliation unless
  a separate half-resolution gate is requested.

## 6.4 Reference-Backed Fixture Observations

### Goal

Stop product-quality claims from depending only on rendered screenshot proxies.
Each product row that wants promotion must provide explicit fixture observations
for the required ray-cast fixture set.

### Required Fixture Set

The required production reference fixtures are defined by
`AO_REQUIRED_REFERENCE_FIXTURE_IDS` / `AO_PRODUCTION_REFERENCE_REQUIRED_FIXTURE_IDS`:

- `flat-plane-open`;
- `box-contact`;
- `two-wall-corner`;
- `broad-wall-contact`;
- `thin-gap-separated-slabs`;
- `grazing-surface-wall`;
- `normal-sensitive-side-contact`.

### Required Work

1. Decide the observation source for each algorithm:
   - `vbao-product`: GPU readback or scalar product-equivalent observation;
   - `vbao-raw`: GPU readback or scalar raw-equivalent observation;
   - `gtao`, `ssao`, `n8ao`: GPU/readback observation or a documented
     algorithm-specific fixture adapter.
2. Attach observations to benchmark rows through `referenceObservations` or
   `referenceGate.observations`.
3. Run the production reference gate so rows move from
   `missing-reference-observation` to either:
   - `missing-required-observation`, if partial;
   - `compared`, if every required fixture is present.
4. Commit the generated reference-gate JSON/Markdown or summarize it in
   `EVIDENCE.md` with artifact paths.

### Acceptance

- Every promotable product row has all required fixture IDs.
- The production report no longer reports `missing-reference-observation` for
  rows used in product-quality claims.
- `thin-gap-separated-slabs` is present for every promotable row.
- VBAO raw and VBAO product observations remain separate.
- Reference results include ray-cast comparison, not only scalar VBAO fixture
  observations.

### Non-Acceptance

- Screenshot proxy metrics do not count as fixture observations.
- Product polish cannot hide raw/reference drift without a separate explanation.
- Missing fixture observations are blockers, not warnings.
- A row with `missing-required-observation` cannot support release, README, or
  marketing quality claims.

## Execution Order

1. Run 6.3 competitor reconciliation first so the benchmark matrix is current.
2. Add or attach 6.4 fixture observations to the same row shape.
3. Re-run production report / reference gate.
4. Update `EVIDENCE.md`.
5. Only then revisit product claims or README wording.

## Verification

Planning-only verification:

```sh
git diff --check -- openspec/changes/vbao-product-node-review-hardening
```

Implementation verification, once 6.3/6.4 are executed:

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/reference/__tests__/aoProductionReferenceGate.test.ts packages/horizon-ao/reference/__tests__/aoReferenceReport.test.ts packages/horizon-ao/reference/__tests__/aoRaycastReference.test.ts
pnpm --filter @horizonao/core typecheck
```
