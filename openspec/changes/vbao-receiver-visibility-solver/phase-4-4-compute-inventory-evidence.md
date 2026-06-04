# Phase 4.4 Evidence: Compute Target Inventory

## Decision

Compute evidence rows now expose target format, target lifetime, backend, and
dispatch timing. This closes the inventory gap without promoting a product
compute path.

## Implementation

| Area | Change |
| --- | --- |
| Compute candidate | `sector-confidence-smoke` inventory now records `targetFormat: rgba8unorm`, `targetLifetime: active-vbao-pipeline`, `backend: webgpu`, work items, and workgroup size. |
| Readback oracle | WebGPU readback storage buffers now record `targetFormat: float32x4-fixture-values`, `targetLifetime: single-benchmark-run`, and `backend: webgpu-compute`. |
| Production report | The compute status table now includes backend, target formats, lifetimes, and dispatch timing. |
| Source contracts | Tests pin private compute schema visibility while keeping public options and exports compute-free. |

## Evidence Capture

Command:

```sh
AO_BENCHMARK_MODES=vbao \
AO_BENCHMARK_VIEWS=ao \
AO_BENCHMARK_DENOISE_STATES=true \
AO_BENCHMARK_VBAO_RESOLUTION_STATES=half \
AO_BENCHMARK_VBAO_COMPUTE_CANDIDATE=sector-confidence-smoke \
AO_BENCHMARK_VBAO_RECEIVER_CONFIDENCE=confidence-guided \
AO_BENCHMARK_VBAO_RECONSTRUCTION_STAGES=final \
AO_BENCHMARK_SCREENSHOT_ROOT=artifacts/benchmarks/vbao-compute-inventory-phase4-4 \
AO_BENCHMARK_OUTPUT_JSON=artifacts/benchmarks/vbao-compute-inventory-phase4-4.json \
AO_BENCHMARK_OUTPUT_MD=artifacts/benchmarks/vbao-compute-inventory-phase4-4.md \
pnpm --filter @horizonao/demo benchmark:ao
```

Artifacts:

- `artifacts/benchmarks/vbao-compute-inventory-phase4-4.json`
- `artifacts/benchmarks/vbao-compute-inventory-phase4-4.md`
- `artifacts/benchmarks/vbao-compute-inventory-phase4-4/`

## Inventory Rows

| Resolution | Candidate | Backend | Target | Format | Lifetime | Dispatch timing |
| --- | --- | --- | --- | --- | --- | --- |
| 1920x1080 | `sector-confidence-smoke` | `webgpu` | `VBAO.ComputeCandidate.SectorConfidence` | `rgba8unorm` | `active-vbao-pipeline` | CPU `1.600 ms` |
| 1280x720 | `sector-confidence-smoke` | `webgpu` | `VBAO.ComputeCandidate.SectorConfidence` | `rgba8unorm` | `active-vbao-pipeline` | CPU `1.100 ms` |

The report emits both final product rows and reconstruction-gate aggregate rows;
the inventory is identical for both. These rows remain candidate-only because
they still lack reference observations and carry `noise` blockers.

## Verification

```sh
pnpm --filter @horizonao/demo test -- scripts/profiling/productionReport.test.mjs
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
pnpm --filter @horizonao/demo typecheck
pnpm --filter @horizonao/core typecheck
```

Results:

- production report Vitest: 1 file passed, 19 tests passed;
- source contract Vitest: 13 files passed, 119 tests passed;
- demo typecheck: passed;
- core typecheck: passed.

## Non-Promotion Rule

Inventory visibility is not a product win. It only makes future compute
candidates auditable. Product compute remains blocked until it replaces a named
storage/tiled/observability limit and clears the quality gates.
