# SDD Plan: VBAO Half-Resolution Product Defaults

## Current State

VBAO raw visibility cost scales with the number of shaded pixels multiplied by
the fixed slice/sample loop shape. The raw shader reconstructs view position,
samples depth/noise, evaluates two-sided visibility intervals, and reduces a
32-sector mask per pixel. That is acceptable work at reduced resolution, but it
is expensive when the product path defaults to full-resolution raw AO.

Verified repo state:

- `VBAONode.setSize()` sizes the raw render target from `resolutionScale`.
- `getTextureNode()` resolves low-resolution raw AO through the internal product
  graph before callers consume it.
- `getRawTextureNode()` remains debug/readback output only.
- Existing timing evidence shows full-resolution raw AO is materially slower
  than half-resolution raw AO for the same product preset.
- Before this change, `VBAO_DEFAULTS` and all `VBAO_QUALITY_TIERS` used
  `resolutionScale: 1.0`, so callers paid full-resolution raw cost unless they
  explicitly overrode it.

## Decision

Make half-resolution raw visibility the product default. Keep full-resolution
raw AO available through explicit `resolutionScale: 1.0` for evidence captures,
diagnostics, and quality experiments.

This addresses the immediate performance issue without changing the VBAO kernel,
the public option shape, or the internal product boundary.

## How We Will Address It

### Phase 1: Default Policy Fix

Goal: stop the library from defaulting to full-resolution raw visibility work.

- Set `VBAO_DEFAULTS.resolutionScale` to `0.5`.
- Set every named quality tier to `resolutionScale: 0.5`.
- Preserve explicit user override with `resolutionScale: 1.0`.
- Keep `getTextureNode()` as final product AO and `getRawTextureNode()` as debug
  output.

Acceptance:

- `clampVbaoNodeOptions({})` resolves to half-resolution.
- `clampVbaoNodeOptions({ quality: 'quality' })` resolves to half-resolution.
- `clampVbaoNodeOptions({ quality: 'quality', resolutionScale: 1.0 })` keeps
  full-resolution as an explicit override.

### Phase 2: Source Contract Coverage

Goal: make the policy visible to future maintainers.

- Update source-contract tests that pin quality-tier literals.
- Add behavior-level tests for default and override resolution scale.
- Keep tests focused on product defaults, not benchmark-only demo controls.

Acceptance:

- Focused Vitest coverage passes.
- Tests fail if a future change silently returns product defaults to full-res.

### Phase 3: Evidence Refresh

Goal: prove the default policy with committed evidence before making release
claims.

- Capture product rows for 1280x720 and 1920x1080 with default options.
- Record raw, cleanup, resolve, polish, and total-product pass timings.
- Compare against explicit full-res rows using the same camera, scene, quality,
  and output mode.
- Update `EVIDENCE.md` only after screenshots and GPU timings are committed.

Acceptance:

- Default product row reports `half-res`.
- Full-res row exists only as an explicit comparison row.
- Timing table shows the raw pass reduction and total-product impact.
- Visual failure labels do not regress beyond accepted half-res reconstruction
  tradeoffs.

Measured result:

- Evidence capture:
  `artifacts/benchmarks/vbao-half-res-product-defaults.md`.
- Screenshot root:
  `artifacts/benchmarks/screenshots-vbao-half-res-product-defaults/`.
- At 1920x1080, the explicit full-resolution comparison measured `raw` at
  `4.434ms` and `total-product` at `4.751ms`. The half-resolution
  reconstruction-gate row measured `raw` at `1.478ms` and `total-product` at
  `1.870ms`.
- At 1280x720, the explicit full-resolution comparison measured `raw` at
  `2.885ms` and `total-product` at `3.118ms`. The half-resolution
  reconstruction-gate row measured `raw` at `0.841ms` and `total-product` at
  `1.120ms`.
- The default policy therefore reduces raw visibility and total-product GPU
  cost in the captured rows.
- The tradeoff is not free: half-resolution rows still carry
  `noise,false-curvature,scale-mismatch` labels, while the full-resolution
  comparison rows carry `noise,edge-bleed`.

Promotion decision:

- Do not promote this capture to `EVIDENCE.md` yet.
- The generated report marks product rows as `missing-reference-observation`,
  so this is SDD-local cost evidence, not a complete release evidence claim.
- Route the remaining `false-curvature` and `scale-mismatch` follow-up through
  the depth-hierarchy or signal-quality lane before making stronger product
  claims.

### Phase 4: Deeper Kernel Work

Goal: address remaining cost only after the default policy is measured.

Potential follow-up candidates:

- Depth hierarchy evidence gate for large-radius sampling.
- Adaptive sample budget by radius or quality tier.
- Compute/storage candidate only if pass-level evidence shows TSL fullscreen
  fragment work is the limiting architecture.
- Resolve/polish fusion only if it reduces total-product cost without edge or
  thin-gap regressions.

Constraints:

- No public denoise controls.
- No temporal history or reprojection under this change.
- No kernel formula changes without reference-test coverage.
- No production build unless explicitly requested.

Triage:

- Keep this SDD scoped to default policy plus evidence. The default change
  reduces raw visibility cost without changing kernel formula, pass topology, or
  public API.
- `false-curvature` and `scale-mismatch` are not fixed by this SDD. Route them
  to the depth-hierarchy evidence lane or the broader signal-quality SDD.
- Compute/storage work is not justified by this SDD alone. It needs a separate
  proposal if raw fullscreen TSL cost remains the limiting architecture after
  the default change.
- Resolve/polish fusion is not justified by this SDD alone. The captured
  comparison still points primarily at raw visibility cost, not reconstruction
  pass cost.

## Verification

Focused checks:

```sh
pnpm vitest run packages/horizon-ao/src/__tests__/vbaoSampling.test.ts packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts
```

Evidence checks after capture:

```sh
pnpm test
pnpm test:e2e
```

Production build remains out of scope unless explicitly requested.
