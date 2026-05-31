# Design: VBAO GT/Reference vs Production Alignment

```mermaid
flowchart LR
  samples["Fixture depth/normal samples"] --> prodMask["Production mask\nadaptive thickness + sampled-view extrusion"]
  samples --> gtMask["GT/reference mask\nnormal shift + constant view thickness"]
  prodMask --> prodReduce["Cosine-weighted production reduction"]
  gtMask --> gtReduce["Paper popcount reduction"]
  prodReduce --> parity["GPU parity row"]
  gtReduce --> parity
  parity --> label["paper-matches-gpu | cosine-matches-gpu | both-drift | visual-choice-required"]
```

## Semantics

- **Production VBAO** means the current `VBAONode` shader and matching scalar oracle in `vbaoReference.ts`.
- **GT/reference VBAO** means the paper/community-GLSL-aligned scalar path in `vbaoPaperReference.ts`.
- `paperExpected` MUST be computed from paper-aligned masks, not from production masks with a different reducer.
- The parity page remains internal and may expose diagnostic mask arrays for review.

## Non-goals

- No public API expansion.
- No production build.
- No automatic switch from cosine-weighted production to popcount paper reduction.
