# Preset Policy Audit

## Verdict

Current source no longer uses an all-half-resolution default policy. The source
policy is evidence-compatible for release-candidate planning: `performance`
remains half-resolution, `balanced` uses a higher-than-half raw resolution, and
`quality` / `ultra` use full-resolution raw AO.

## Evidence

- `packages/horizon-ao/src/vbaoConstants.ts` sets:
  - `performance`: `resolutionScale: 0.5`;
  - `balanced`: `resolutionScale: 0.75`;
  - `quality`: `resolutionScale: 1.0`;
  - `ultra`: `resolutionScale: 1.0`.
- `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` pins that product
  preset table.
- `packages/horizon-ao/src/__tests__/vbaoSampling.test.ts` verifies
  `quality: 'quality'` resolves to full-resolution raw AO and that explicit
  `advanced.resolutionScale` can still request half-resolution for evidence or
  compatibility.
- `EVIDENCE.md` records: "half-res is not promoted" and says current
  product-preset evidence carries `false-curvature` / `scale-mismatch` labels
  and worse stripe metrics.
- `EVIDENCE.md` rows for half-res product-preset Museum captures include
  `noise,false-curvature,scale-mismatch` at both `1920x1080` and `1280x720`.

## Decision Pressure

Do not revert the current product preset table back to all-half-resolution
unless fresh committed evidence promotes half-resolution reconstruction.

The remaining policy work is evidence reconciliation, not runtime default
selection: future claims must distinguish the default product path from explicit
half-resolution evidence rows.
