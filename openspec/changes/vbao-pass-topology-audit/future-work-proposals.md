# Future Work Proposals

These are explicitly out of scope for the pass topology audit. Each item needs
its own proposal, evidence gate, and public/private API decision.

## Velocity-Backed AO-Owned Temporal

Proposal needed before product use. It must prove velocity reprojection improves
stability without ghosting/disocclusion regressions and without reintroducing
camera-only guide history.

## Multi-Bounce AO

Proposal needed. It should define the visual target, cost budget, and whether
the effect belongs in VBAO or in a higher-level lighting/composition pass.

## Bent Normals

Proposal needed. It should define output encoding, consumers, and whether the
node can expose bent-normal data without widening the default scalar AO
interface.

## Directional Occlusion

Proposal needed. It should define how directional visibility is represented and
how it composes with current scalar accessibility output.

## Public API Changes

Proposal needed for any public `temporal`, velocity, denoise, cleanup, or
resolve-polish option. The current audit keeps all topology controls
evidence-only and private.
