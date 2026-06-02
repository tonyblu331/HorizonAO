# Proposal: VBAO Product Discipline Hardening

## Intent

Convert the latest VBAO review into a scoped, evidence-gated implementation plan.
The goal is not to add more features. The goal is to remove the seams that can
make the product path look disciplined in public while silently accumulating
runtime cost or unproven filtering internally.

## Verified Starting Point

The current tree already has the right product shape:

- `VBAONode` and `vbao` are the only package exports.
- `getTextureNode()` returns final product AO.
- `getRawTextureNode()` exposes raw AO for debug/readback.
- Low-resolution output is reconstructed through internal cleanup/resolve stages.
- Full-resolution polish is internal and controlled by `softness`.
- The quality tiers are `performance`, `balanced`, `quality`, and `ultra`.

The remaining problems are implementation discipline problems:

- `VBAOResolveNode` has a nearest-filtered fallback despite the JBU resolve owning
  manual bilinear reconstruction.
- `VBAOFullResPolishNode` runs near and wide Poisson taps by default, making the
  default polish a 16-tap full-resolution filter.
- Low-resolution `softness > 0` can run cleanup, resolve, and full-resolution
  polish in the same product path.
- Product quality tiers still feed the hot shader through uniform loop bounds.
- Pass-level GPU timing evidence is not yet committed for raw, cleanup, resolve,
  and polish independently.
- The current hash phase atlas is useful, but not proven against IGN, STBN/static,
  or FAST-like alternatives.
- Reference/report modules must live outside runtime `src/`, even though they are
  not package exports.

## Scope

### In Scope

- Make JBU fallback manually reconstruct from the same four raw AO taps.
- Reduce default full-resolution polish to the near 8-tap kernel.
- Map low-resolution softness to cleanup first and full-resolution polish only
  after a threshold.
- Add product preset loop-shape discipline for `2x4`, `3x6`, `4x8`, and `4x10`.
- Add pass-level timing evidence rows for raw, cleanup, resolve, and polish.
- Add a sampling-source comparison gate before changing the default phase atlas.
- Keep canonical/product drift visible in tests and evidence.
- Move reference/report code out of the runtime mental space without changing the
  public package API.

### Out of Scope

- No bent AO.
- No new public denoise or sampling knobs.
- No TAA, reprojection, history buffers, or temporal accumulator.
- No production build command unless explicitly requested.
- No claim that product VBAO is path-tracing-close until the reference gate proves
  it against baselines.

## Affected Areas

| Area | Impact |
| --- | --- |
| `packages/horizon-ao/src/VBAOResolveNode.ts` | Manual four-tap fallback reconstruction |
| `packages/horizon-ao/src/VBAOFullResPolishNode.ts` | Default 8-tap polish budget |
| `packages/horizon-ao/src/VBAONode.ts` | Softness-to-pass mapping and product loop-shape discipline |
| `packages/horizon-ao/src/vbaoConstants.ts` | Product tier values remain the source of fixed loop shapes |
| `apps/demo/scripts/collect-ao-benchmark.mjs` | Pass-level timing schema |
| `EVIDENCE.md` | Evidence rows for pass costs, noise source comparisons, and drift status |
| `packages/horizon-ao/reference/` | Home for reference/report modules and reference-focused tests |
| `packages/horizon-ao/src/__tests__/` | Runtime source-contract and production behavior tests |

## Success Criteria

- Default product polish is not a hidden 16-tap full-resolution filter.
- Low-resolution output does not double-filter unless evidence explicitly justifies it.
- JBU fallback is either truly manual bilinear or no longer described as bilinear.
- Product presets have fixed hot-loop shapes; advanced overrides remain debug/dev
  escape hatches.
- Evidence can show cost per internal pass.
- Noise-source changes cannot land without a comparison matrix.
- Public exports remain `VBAONode`, `vbao`, and option types.
