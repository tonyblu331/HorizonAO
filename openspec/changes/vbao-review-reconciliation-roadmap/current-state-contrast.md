# Current-State Contrast: Pasted Review vs Repository

## Summary

The pasted review is directionally useful but stale in several concrete places.
The current worktree already contains multiple items the review describes as
missing. The next plan should focus on unresolved evidence and contract gaps,
not redoing landed cleanup.

This contrast has now been checked against local source and external research.
See `research-verification.md` for the source list and principal decisions.

## Contrast Table

| Review claim | Current repo state | Verdict |
| --- | --- | --- |
| `VBAOEffectPass` is the right extraction but is not landed. | `packages/horizon-ao/src/VBAOEffectPass.ts` exists and pass source tests require it. | Already done. |
| `vbaoBilateralWeight` is missing and bilateral code is duplicated. | `packages/horizon-ao/src/vbaoBilateralWeight.ts` exports `computeVbaoBilateralGeometryWeight`; cleanup, resolve, resolve-polish, and polish import it. | Already done structurally; constants still need rationale. |
| `VBAOResolvePolishNode` is only a contracted future deliverable. | `packages/horizon-ao/src/VBAOResolvePolishNode.ts` exists and extends `VBAOEffectPass`; public exports still hide it. | Already done as private evidence candidate. |
| `sourceResolution` uniform is missing. | `VBAONode.ts` has `readonly sourceResolution = uniform(new Vector2())`, updates it in `setSize`, and uses it for raw noise pixel and safe texel. | Already done. |
| `vbaoPixel` duplicate-name warning needs rename to `vbaoRawNoisePixel`. | `VBAONode.ts` uses `vbaoRawNoisePixel`; shader inspection source contracts also count that token. | Already done. |
| `VBAO_NOISE_SOURCE_CANDIDATES` leaks into runtime sampling. | Source tests require it not to appear in `vbaoSampling.ts`; search did not find it in runtime source. | Already done. |
| `aoPipelines.ts` extraction is expected. | `apps/demo/src/scenes/aoPipelines.ts` exists and multiple scenes import it. `MuseumScene.tsx` still has bespoke benchmark/evidence wiring. | Partially done; remaining Museum extraction is future demo cleanup. |
| Cosine-weighted slice accumulation is missing. | `vbao-kernel-canonical-drift-triage` added a multi-slice/non-axis fixture and changed runtime accumulation to `sliceAccessibility * NprojLen` / `weightSum += NprojLen` after updating the root spec. | Addressed as a gated runtime candidate. |
| Bilateral `24` and `normal^8` constants are magic. | `bilateral-constant-policy.md` documents the strict edge-preserving policy and source contracts pin the multiplier. | Addressed for current behavior; tuning remains a future evidence task. |
| Phase atlas work repeats inside the sample loop. | `sampleNoisePhase(i, j)` remains inside the inner sample loop. A preflight now defers hoisting until the projected-normal candidate has product-stage evidence. | Deferred deliberately as performance-only work. |
| Deprecated aliases remain in public options. | `preset`, `scale`, and `intensity` remain in `VBAONodeOptions` with explicit deprecation comments and a migration policy. | Addressed for this milestone. |
| `VBAO_SECTOR_TABLES` should move out of runtime. | No active runtime `src/vbaoSectorTables.ts` was found in the current search; reference sector data lives under `reference/`. | Already done or no longer applicable. |
| Temporal should be promoted later. | Existing evidence remains `reject-promotion`; velocity work is in separate SDD. | Rejected for this roadmap. |
| Resolve/polish fusion should be a PR. | Existing topology evidence found the fused candidate slower at high softness. | Rejected unless new evidence appears. |
| Raw signal still has `noise` and `edge-bleed` labels. | Current evidence still treats quality labels as gates. | Still open, but belongs to evidence/signal-quality work, not cleanup-only PRs. |

## Principal Closure List

The following pasted-review work MUST NOT be re-planned as new implementation
tasks in this roadmap:

- extract `VBAOEffectPass`;
- extract `vbaoBilateralWeight`;
- create private `VBAOResolvePolishNode`;
- add `sourceResolution`;
- rename stale `vbaoPixel` to `vbaoRawNoisePixel`;
- move noise-source candidates out of active runtime sampling.

Those are closed unless a new failing test or evidence row proves a regression.

## Reconciled Next Milestone

The next milestone is not "land all review PRs." The next milestone is:

```text
prove or close the remaining correctness and signal-quality gaps without
reintroducing stale topology/API work
```

That means:

- keep slice weighting evidence under `vbao-kernel-canonical-drift-triage`;
- document bilateral constants before changing them;
- treat phase hoist as a measured optimization after fixture gates;
- define a public alias removal policy before deleting compatibility keys;
- finish demo boundary cleanup only where it reduces evidence coupling.
