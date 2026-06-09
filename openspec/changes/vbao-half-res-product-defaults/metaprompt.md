# Metaprompt: VBAO Half-Resolution Product Defaults

You are working in `G:\RWY37\horizon-ao` on the VBAO half-resolution
product-defaults SDD.

## Objective

Make `VBAONode` stop paying full-resolution raw visibility cost by default while
preserving the public product boundary and explicit full-resolution override.

The concrete objective is to complete every unchecked task in
`openspec/changes/vbao-half-res-product-defaults/tasks.md`, starting from the
first incomplete task. Do not jump into kernel rewrites before the default policy
and evidence refresh are complete.

## Current Contracts

- `VBAONode` is the public product boundary.
- `getTextureNode()` returns final product AO.
- `getRawTextureNode()` is debug/readback output only.
- Half-resolution raw AO must be resolved before product use.
- `resolutionScale: 1.0` remains valid as an explicit caller override.
- No public denoise, temporal, velocity, compute, or debug scheduling option is
  allowed from this SDD.
- Production build commands are forbidden unless explicitly requested.

## Execution Rules

1. Follow `tasks.md` phase order.
2. Keep this SDD focused on product default policy and evidence refresh.
3. Add behavior tests before claiming the default policy is fixed.
4. Do not change the VBAO kernel formula in this SDD.
5. Do not change pass topology in this SDD.
6. Do not update `EVIDENCE.md` until screenshots and GPU timings exist.
7. If half-resolution defaults create a visible quality regression, document the
   failure label before adding more code.

## Phase Driver

Proceed in this order:

1. Confirm current raw-cost diagnosis against code and benchmark artifacts.
2. Make product defaults half-resolution while preserving explicit full-res.
3. Lock the policy with source-contract and behavior tests.
4. Capture default half-res and explicit full-res evidence rows.
5. Update evidence only after timing, screenshot, and failure-label data exist.
6. Triage deeper optimizations separately after the default policy is measured.

## Verification

Use the smallest relevant checks:

```sh
pnpm vitest run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
git diff --check
```

Run benchmark/evidence commands only when working on the evidence phase. Do not
run production build unless explicitly requested.
