# VBAO Branch Reconciliation + Tip Re-Scope — Decision Doc

Status: **decided.** Date: 2026-06-08. Work-home: fresh worktree `claude/vbao-foundation-p0` off
the canonical tip `613a773` (`codex/vbao-half-res-product-defaults`).

## 1. Lineage is LINEAR, not divergent (git proof)

```
merge-base(temporal 30de841, codex 613a773) = 30de841   → temporal is a pure ANCESTOR of codex
merge-base(codex 613a773, rcvconf 6d27043)  = 6d27043   → rcvconf is an ANCESTOR of codex
```

```
30de841 temporal (old worktree, 0 unique commits)
   → 807e012 half-res default presets
   → 17f4871 signal quality evidence gate
   → ab7409c release gap closure gates
   → 5706c0f wire private receiver confidence
   → 6d27043 complete receiver solver gates
   → 3359106 harden product evidence gates
   → 613a773 CANONICAL TIP
```

The earlier "3 divergent branches" framing was wrong; the old worktree was simply 6 commits behind.

## 2. Corrections to earlier claims (I was wrong; proof above + code below)

- "Receiver-confidence node is imagined / on a different branch" → **WRONG.** It is 603 LOC on the
  canonical tip and is wired into the product path.
- "`contact`/`advanced.*` API is imagined" → **WRONG.** It exists on the tip
  (`resolveVbaoContactThickness`, `VBAONodeOptions.advanced`).
- Module-global renderer-state "every-frame corruption" → still **overstated**; it is latent
  fragility + inconsistency (three.js uses the same module-scope pattern; `updateBefore` is
  non-reentrant).

## 3. Tip re-scope — DONE vs REMAINING on 613a773

### P0 — foundation / fat-trim
- `VBAOResolvePolishNode` — **ALREADY DELETED** on tip. ✅
- `VBAOVelocityTemporalNode` — still present (expanded, private). REMAINING: archive/keep decision.
- Module-global renderer state (`VBAONode`, `VBAOResolveNode`, `VBAOHalfResCleanupNode`) — REMAINING:
  fix via EffectPass unification (low priority; latent only).
- `VBAO_THETA_*` relocation — verify on tip; likely REMAINING.
- `configure()` throw (VBAONode.ts ~:409) — REMAINING: soften to lazy rebuild.
- **Confidence sidecar — ACTIVE + HIGHEST VALUE.** `usesConfidenceGuidedReconstruction =
  cleanupStrength>0 || polishStrength>0` → the 603-LOC `VBAOReceiverConfidenceNode` runs a FULL
  second slice/sample march whenever softness>0 or half-res. Two full VBAO marches per product frame.
  DECISION (per north star + both reviews): **fold confidence into the raw pass** (`RG16F`:
  `R=AO, G=confidence` from valid-sample ratio + slice-agreement variance via Welford in the existing
  loop), then feed `G` to cleanup/polish; delete the sidecar node. Fallback: cheap post-confidence
  from AO+geometry, or drop confidence until measured. NEVER a second estimator.

### P0.5 — public API (contact vs thickness)
- **ALREADY DONE** on tip (`contact`, `advanced.*`, deprecated aliases mapped). → downgrade to a
  verification + artist-API smoke test, not a build.

### P1 — ground truth
- **P1-A independent ray-cast reference — LARGELY DONE:** `reference/aoRaycastReference.ts` casts
  cosine-hemisphere rays (1024, golden-angle Fibonacci) vs analytic sphere/box occluders, finite
  radius, 9 fixtures (`flat-plane-open`, `sphere-contact`, `box-contact`, `two-wall-corner`,
  `broad-wall-contact`, `thin-gap-separated-slabs`, `grazing-surface-wall`,
  `normal-sensitive-side-contact`, `far-object-outside-radius`). Independent of VBAO math. ✅
  REMAINING: (a) commit a baseline, (b) wire a **VBAO-output-vs-raycast delta verifier**, (c) optional
  Owen/QMC upgrade for faster convergence.
- **P1-B screen-space-achievable reference — NOT done.** REMAINING (the key "what can SSAO know" split).
- **P1-C mesh QMC — NOT done** (only primitives). Lower priority; primitives may suffice for fixtures.

## 4. Re-scoped first P0 actions (ordered)
1. Establish green baseline on tip (typecheck + core vitest). ← verification floor
2. Confidence fold-into-raw (`RG16F`) + delete sidecar — biggest real win, on the active path.
3. Soften `configure()`; EffectPass-unify Resolve/Cleanup; relocate `VBAO_THETA_*`.
4. P1: commit raycast baseline + add VBAO-vs-raycast delta verifier; then P1-B.
