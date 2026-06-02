# Resolve/Polish Fusion Preflight

Phase 4 proposes a private fused resolve-polish candidate. The default product
baseline does not exercise low-resolution polish, so the audit added a
high-softness preflight row before any fused node work.

## Current Graph Fact

The museum benchmark uses `softness: 0.45`.

For low-resolution VBAO:

```text
polishStrength = max(0, softness - 0.5) * 2
```

At `softness: 0.45`, full-resolution polish is skipped in low-resolution product
rows. The active half-resolution product chain is therefore:

```text
raw -> cleanup -> resolve
```

not:

```text
raw -> cleanup -> resolve -> polish
```

## Decision

Do not implement a fused resolve-polish node until the candidate has source and
evidence contracts.

The preflight capture now proves a measurable separate-pass baseline exists for
low-resolution resolve plus polish:

| Row | Raw | Cleanup | Resolve | Polish | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1920x1080 AO soft 0.75 | 0.637 ms | 0.103 ms | 0.094 ms | 0.194 ms | 1.028 ms |
| 1280x720 AO soft 0.75 | 0.335 ms | 0.024 ms | 0.045 ms | 0.080 ms | 0.483 ms |

Artifact: `artifacts/benchmarks/vbao-resolve-polish-preflight.json`.

## Required Before Reopening

- Add source/evidence contracts for a private fused candidate.
- Add source/evidence contracts proving the fused candidate has no temporal,
  history, reprojection, or public denoise controls.
- Compare target count, total timing, shader inspectability, and visual labels
  against the separate-pass row.

Until those contracts exist, do not implement the fused node.
