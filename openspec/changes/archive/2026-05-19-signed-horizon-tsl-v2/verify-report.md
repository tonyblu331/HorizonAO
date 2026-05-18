# Verify Report: signed-horizon-tsl-v2

## Status

Pass, with no critical issues found.

## Commands

| Check                  | Command                                                                                   | Result                   |
| ---------------------- | ----------------------------------------------------------------------------------------- | ------------------------ |
| Core unit tests        | `pnpm --filter @horizonao/core test`                                                      | Pass, 4 files / 29 tests |
| Core typecheck         | `pnpm --filter @horizonao/core typecheck`                                                 | Pass                     |
| Core tsgo              | `pnpm --filter @horizonao/core typecheck:tsgo`                                            | Pass                     |
| Demo typecheck         | `pnpm --filter @horizonao/demo typecheck`                                                 | Pass                     |
| Demo tsgo              | `pnpm --filter @horizonao/demo typecheck:tsgo`                                            | Pass                     |
| Lint                   | `pnpm lint`                                                                               | Pass                     |
| Targeted scalar AO E2E | `pnpm --filter @horizonao/demo test:e2e -- --grep "renders scalar HorizonAO debug views"` | Pass, 1 test             |

## Findings

- CPU math tests now cover the current cosine-horizon resolve helper, including non-finite input clamping, reversed horizon stability, and centered-normal parity.
- TSL raw-kernel helper names now use signed-horizon accessibility language and clamp horizon cosines before `sqrt` and `acos`.
- The public API remains unchanged.
- Scalar debug E2E renders both `raw-ao` and `denoised-ao` as grayscale with luminance variation.
- The local browser metadata reports `webgl-fallback`; this is valid smoke/render proof, not WebGPU validation.

## Deferred

- No production build was run.
- No GPU timing claim is made.
- Full analytic angle-domain TSL rewrite remains deferred until a visual parity harness can prove it does not regress scalar AO.
