# Apply Progress: VBAO Temporal AO Gate

## 2026-06-02

Strict TDD remains active. This batch added only the spec gate, an internal host
temporal sampling path, benchmark plumbing, and source-contract coverage. It did
not add internal AO history and it did not make temporal AO public API.

## Completed

| Task | Status | Evidence |
| --- | --- | --- |
| 1.1 | Done | `openspec/changes/vbao-temporal-ao-gate/specs/vbao-node/spec.md` defines opt-in temporal modes while keeping default output temporal-free. |
| 1.2 | Done | `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` proves default construction has no history texture, previous view-projection, or temporal accumulation node. |
| 1.3 | Done | Spec delta requires same-cost non-temporal alternatives before accepting temporal. |
| 0.1 | Done | `artifacts/benchmarks/vbao-lab-baseline-latest.json` plus the Museum temporal-off smoke rows confirm raw/product AO-only and beauty output for the baseline scenes. |
| 2.1 | Done | `VBAONode` accepts internal `temporalMode: "host"` and advances the phase atlas offset without AO history allocation. |
| 2.2 | Done | Source-contract coverage proves default `off` and host-only phase animation. |
| 5.1 | Done | Current evidence does not justify public temporal API. |
| 5.2 | Done | No public `temporal` option was added. |
| 5.3 | Done | Reprojection thresholds, clamp expansion, and history weights remain absent from public options. |
| 3.7 | Done | Internal temporal benchmark rows expose validation mode, reset state/reasons, thresholds, and temporal/guide pass timing. |
| 4.1 | Done | Captured internal `beauty,ao` product rows alongside existing off/host/host-TRAA and `spatial-ultra` rows. |
| 4.2 | Done | Internal rows include measured raw, temporal, temporal-depth, temporal-normal, polish, and derived total-product GPU timings. |
| 4.3 | Done | Verifier/reporting carries temporal failure labels and internal temporal comparison deltas. |
| 4.4 | Done | Internal temporal is rejected for promotion because it shows no material pattern/noise win. |
| 4.5 | Done | `verify:vbao-temporal` reads `vbao-temporal-internal-latest.json` before any candidate verdict. |
| 6.1 | Done | Internal temporal remains private; rejection rationale is archived in evidence/verdict artifacts. |

## Evidence Captured

| Artifact | Status |
| --- | --- |
| `artifacts/benchmarks/vbao-temporal-off-latest.json` | Captured 1280x720 Museum full-res VBAO temporal-off rows for beauty/AO and raw/product output. |
| `artifacts/benchmarks/vbao-lab-baseline-latest.json` | Captured 1280x720 Lab full-res VBAO temporal-off rows for beauty/AO and raw/product output. |
| `artifacts/benchmarks/vbao-temporal-host-latest.json` | Captured matching internal host-mode rows. |
| `artifacts/benchmarks/vbao-temporal-host-traa-latest.json` | Captured matching host-mode rows through Three's WebGPU `TRAANode`. |
| `artifacts/benchmarks/vbao-temporal-spatial-ultra-latest.json` | Captured 1280x720 Museum full-res non-temporal `spatial-ultra` rows as the higher-sample spatial alternative. |
| `artifacts/benchmarks/vbao-temporal-gate-verdict.json` | Automated verdict is `prototype-only`; `internalTemporalAllowed` is `true`; host TAA/TRAA evidence is present; same-cost alternative evidence is present; `VBAO_TEMPORAL_REQUIRE_CANDIDATE=1` still fails because promotion is not justified. |
| `artifacts/benchmarks/vbao-temporal-internal-smoke.json` | Captured one 1280x720 Museum full-res AO product smoke row for private `internal` mode. The temporal pass emitted a measured GPU timestamp; this is runtime plumbing evidence, not a quality promotion. |
| `artifacts/benchmarks/vbao-temporal-internal-latest.json` | Captured 1280x720 Museum full-res `beauty,ao` product rows for private `internal` mode with diagnostics and pass timings. |
| `EVIDENCE.md` | Records the comparison as a non-TAA smoke gate and explicitly rejects promotion. |

## Verification

```sh
pnpm --filter @horizonao/core test -- --run packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts
pnpm --filter @horizonao/core typecheck
pnpm --filter @horizonao/demo typecheck
pnpm --filter @horizonao/demo verify:vbao-temporal
git diff --check -- openspec/changes/vbao-temporal-ao-gate packages/horizon-ao/src/VBAONode.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts packages/horizon-ao/src/__tests__/vbaoProfilingFailureLabels.test.ts apps/demo/src/scenes/MuseumScene.tsx apps/demo/scripts/collect-ao-benchmark.mjs apps/demo/scripts/profiling/productionReport.mjs
```

## Open Gates

- Host temporal capture now includes a host TRAA setup, but it does not pass:
  TRAA improves beauty pattern/noise only by accepting product stripe
  regression, and the non-TAA smoke row also worsens AO product stripe proxy.
- Same-cost non-temporal alternative evidence is now captured through
  `spatial-ultra`, but it does not override the host TRAA stripe regression or
  the non-TAA host stripe regression.
- The installed Three package provides WebGPU `TRAANode`; it is wired into the
  demo host path and captured as `vbao-temporal-host-traa-latest.json`, but the
  captured rows do not pass the promotion gate.
- Internal temporal accumulation is evaluated and remains only a private
  prototype. It must carry the host stripe regression as known risk and cannot
  be used for public API or quality promotion because the internal rows show no
  material pattern/noise win.
- The first internal prototype is wired after full-resolution resolve and before
  full-resolution polish. It owns AO history, resets on resize and camera cuts,
  clamps history to the current 3x3 AO neighborhood, and uses history weight
  `0.8`.
- Phase 3.3 and 3.4 are now implemented for the private prototype. History is
  sampled through previous-frame UV, out-of-viewport history is rejected, and
  previous depth/normal guide history is validated before blending.
- `sdd-plan.md` now owns the remaining roadmap. Phase 3.7 and Phase 4 are
  complete as a rejection/prototype gate; remaining work is Phase 6 hardening or
  an explicit future tuning fork.

## Gate Closeout

This change closes as an evidence-gated no-go for temporal promotion, but it now
unblocks private internal temporal accumulation prototyping. Host phase animation
was implemented and captured with both non-TAA output and host TRAA output. The
same-cost non-temporal `spatial-ultra` alternative was also captured. The
verifier reports `prototype-only` with `internalTemporalAllowed: true`, so Phase
3 may start without public API or product-quality claims.
