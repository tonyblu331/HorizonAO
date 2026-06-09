# Preset Policy Audit

## Verdict

Current evidence classifies the all-half-resolution default policy as failing
for release-candidate promotion.

## Evidence

- `packages/horizon-ao/src/vbaoConstants.ts` sets every quality tier to
  `resolutionScale: 0.5`.
- `packages/horizon-ao/src/__tests__/vbaoNodeSource.test.ts` currently pins the
  all-half-res preset table.
- `EVIDENCE.md` records: "half-res is not promoted" and says current
  product-preset evidence carries `false-curvature` / `scale-mismatch` labels
  and worse stripe metrics.
- `EVIDENCE.md` rows for half-res product-preset Museum captures include
  `noise,false-curvature,scale-mismatch` at both `1920x1080` and `1280x720`.

## Decision Pressure

The next implementation patch should not keep all tiers half-res unless fresh
evidence reverses this verdict. The evidence-compatible default policy is to
make at least `quality` and `ultra` full-resolution, or to move half-resolution
behind an explicit non-default override/evidence route.

This audit completes the SDD planning classification only. It does not change
runtime defaults.
