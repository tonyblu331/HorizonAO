# Peer Review: VBAO GT/reference alignment

## Verdict

Accepted with caveats as an internal correctness/reporting hardening pass. The change fixes a real semantic weakness: `paperExpected` is now derived from paper-aligned masks instead of popcount over production masks.

## Review findings

### Strengths

- The production and GT/reference paths now differ at the mask-construction layer, not only at the reducer layer.
- Production VBAO remains the cosine-weighted shader target; this avoids an unsupported formula flip.
- Tests now require paper mask metadata (`paperMaskPopcountBySlice`, `paperMaskCoverageBySlice`, `paperSliceMasks`) alongside production mask metadata.
- OpenSpec records the decision boundary: alignment/reporting hardening only, not visual or public API promotion.

### Risks / caveats

- Targeted Playwright `/vbao-parity` WebGPU validation timed out in this session, so GPU route evidence was not refreshed.
- GT/reference is still scalar/reporting/debug-only; there is no verified live
  GPU implementation of the paper/reference semantics.
- Formula selection remains unresolved until GPU readback and Museum visual evidence support a decision.
- Worktree is stacked with prior uncommitted gates, so review/commit should be done carefully by change group.

## Screenshot

- `G:/RWY37/horizon-ao/artifacts/analysis/vbao_gt_alignment_peer_review.png`
- Source HTML: `G:/RWY37/horizon-ao/artifacts/analysis/vbao_gt_alignment_peer_review.html`

## Validation

```sh
node node_modules/vitest/vitest.mjs run packages/horizon-ao/src/__tests__/vbaoParity.test.ts packages/horizon-ao/src/__tests__/vbaoPaperReference.test.ts
# 2 files / 22 tests passed

cd packages/horizon-ao && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed

cd apps/demo && node ..\..\node_modules\typescript\bin\tsc --noEmit
# passed
```

No production build run.

## Next steps

1. Re-run `/vbao-parity` WebGPU readback and archive JSON/screenshot evidence.
2. Add a stronger contract that true-normal fixtures include at least one row where paper/reference and production masks diverge meaningfully.
3. Decide formula by evidence: paper/popcount, cosine-weighted, or keep both as explicit ablation labels.
4. Only after parity evidence is green, continue mask-aware temporal-free filter v2 using the GPU-visible mask metadata.
