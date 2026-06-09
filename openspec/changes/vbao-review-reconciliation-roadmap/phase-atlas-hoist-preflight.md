# Phase Atlas Hoist Preflight

## Current State

The raw kernel still calls `sampleNoisePhase(i, j)` inside the innermost sample
loop. That computes phase wrapping and atlas coordinates for every slice/sample
tap.

This is a plausible ALU cleanup target, but it is not a correctness fix. The
phase atlas participates in stochastic thin-sector coverage, so a hoist that
changes decorrelation is a regression even if it looks faster.

## Blocker

Do not prototype the hoist while the projected-normal slice reduction candidate
is still awaiting product-stage evidence. The formula change is a correctness
candidate; the hoist is an ALU optimization. Mixing both in one evidence batch
would make regressions harder to attribute.

## Acceptance For A Future Hoist

- Generated shader inspection must stay readable.
- The phase atlas must still provide distinct slice/sample channels.
- Thin-sector stochastic behavior must not regress.
- Evidence rows must compare labels and GPU timings before/after.

## Decision

Preflight complete. Implementation is deferred until the projected-normal
formula candidate has product-stage screenshots, labels, and pass timings.
