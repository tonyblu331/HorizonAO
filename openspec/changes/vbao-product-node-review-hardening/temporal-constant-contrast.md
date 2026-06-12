# Temporal and Constant Contrast

## Purpose

The pasted review calls out `historyWeight = 0.8`, `maxVelocityUv = 0.25`, and
`depthThreshold = 0.0005` as magic numbers. Current source confirms those values
exist in `packages/horizon-ao/src/VBAOVelocityTemporalNode.ts`.

This does not reopen temporal promotion. It records why any future temporal SDD
must derive those constants from geometry, sampling budget, and reprojection
validity instead of inheriting prototype defaults.

## Source Facts

- `VBAOVelocityTemporalNode.ts` initializes:
  - `historyWeight = 0.8`;
  - `depthThreshold = 0.0005`;
  - `normalThreshold = 0.85`;
  - `maxVelocityUv = 0.25`.
- `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` asserts public
  options do not expose `historyWeight`.
- `EVIDENCE.md` records temporal promotion as rejected; public temporal API and
  temporal quality promotion remain blocked.

## Contrast Decisions

| Constant | Pasted review pressure | Current SDD decision |
| --- | --- | --- |
| `historyWeight = 0.8` | Long memory window; should derive from target sample equivalence and raw samples per frame. | Keep as rejected prototype evidence only. Future temporal work must derive or justify it in a separate SDD. |
| `maxVelocityUv = 0.25` | Too loose for normal motion; behaves like a teleport guard rather than a reprojection-validity guard. | Rename/rederive only if temporal work is reopened; do not expose as public product control. |
| `depthThreshold = 0.0005` | NDC-space threshold is depth-dependent and can be too loose at distance. | Future temporal work should prefer linear or relative depth checks and prove the threshold with fixtures. |
| `normalThreshold = 0.85` | Less discussed in the paste but still a prototype gate. | Keep private and evidence-gated; pair with depth and velocity rejection metrics if reopened. |

## Guardrail

No temporal constant change belongs in the product-node default-policy patch. The
right sequence is:

1. Keep temporal private/rejected.
2. Resolve spatial product defaults and evidence boundaries first.
3. Reopen temporal only through a dedicated velocity-backed SDD with rejection
   counters, fixture coverage, screenshots, timings, and public API proof.
