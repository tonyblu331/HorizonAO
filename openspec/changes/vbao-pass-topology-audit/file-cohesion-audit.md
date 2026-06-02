# VBAO File Cohesion Audit

Phase 2b evaluates the pasted proposal to merge constants, sampling, noise, and
shared TSL helpers into `vbaoCore.ts`.

## Decision

Do not create `vbaoCore.ts` in this change.

## Findings

| File | Current responsibility | Decision |
| --- | --- | --- |
| `vbaoConstants.ts` | Public option types, defaults, clamp ranges, and fixed quality tiers | Keep split. This is the public configuration boundary and is tested as such. |
| `vbaoSampling.ts` | Deterministic phase-atlas math and constants | Keep split. It is testable without constructing Three.js texture objects. |
| `vbaoNoise.ts` | Runtime `DataTexture` creation and shared texture caching | Keep split. It owns Three texture construction, not sampling policy. |
| `vbaoBilateralWeight.ts` | Shared TSL bilateral geometry weighting | Keep split. This helper is already centralized and source-contract tested across resolve, cleanup, and polish. |
| `VBAOEffectPass.ts` | Shared internal render-target/fullscreen-pass plumbing | Keep. This has one clear responsibility and is already exercised by `VBAOFullResPolishNode`. |

## Rationale

The existing split separates public API configuration, deterministic sampling
math, runtime texture construction, shared TSL weighting, and pass plumbing.
Merging those into a single `vbaoCore.ts` would reduce file count but weaken
ownership. That is not a production improvement.

Future file moves are allowed only if they preserve behavior and make a module's
responsibility clearer than the current split.
