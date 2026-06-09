# API Alias Migration Policy

## Current Aliases

`VBAONodeOptions` currently keeps three deprecated aliases:

- `preset` -> `quality`
- `scale` -> `contrast`
- `intensity` -> `strength`

## Decision

Keep the aliases through the current pre-1.0 evidence-gated candidate phase.
Remove them only in a declared v1.1-or-later cleanup, or move them into an
explicit compatibility shim if the package gets real downstream usage before
that point.

## Rationale

The aliases are small API debt, but deleting them now would spend review budget
on compatibility churn while correctness and signal-quality gates are still
open. That is backwards. Public API cleanup should happen after the kernel and
evidence story is stable.

## Required Gate Before Removal

- README or migration note names the replacement keys.
- Source tests prove `VBAONodeOptions` no longer accepts the aliases, or prove a
  compatibility shim normalizes them before constructing `VBAONode`.
- No benchmark/evidence script still relies on the aliases.
- Conventional commit marks the removal as an API cleanup.
