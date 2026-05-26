# Project Skill Registry — horizon-ao

## Compact Rules

### TypeScript / TSL Node Rules

- Keep `@horizonao/core` public exports closed unless an OpenSpec evidence gate explicitly promotes a new surface.
- `VBAONodeOptions` must not gain denoise, temporal, depth-MIP, prefilter, metadata, or sampling-schedule knobs without a spec delta and screenshots/timings.
- For TSL kernel work, add or update RED tests that pin source-level invariants before editing `VBAONode.ts`.
- Preserve accessibility semantics: AO output `.r` is accessibility where `1` is open and `0` is dark.

### WebGPU Evidence Rules

- Do not claim visual improvement without committed screenshots and JSON timing rows in `EVIDENCE.md`.
- Required labels: `noise`, `mud`, `halo`, `thin-gap`, `edge-bleed`, `scale-mismatch`, `false-curvature`.
- Faster timing never beats worse image quality; false-curvature is a hard reject for depth hierarchy work.
- Compare against the same scene, camera, resolution, view mode, and denoise state.

### Strict TDD Rules

- Strict TDD is active; write failing Vitest/source-contract tests before implementation.
- Library math/reference behavior belongs in Vitest.
- Canvas/route smoke coverage belongs in Playwright.
- Do not run production build commands.

### SDD / Artifact Rules

- Use OpenSpec artifacts for team-visible specs and Engram for recovery.
- For substantial VBAO quality work, create `proposal.md`, `design.md`, `tasks.md`, and `specs/vbao-node/spec.md`.
- Archive rejected candidates with the exact evidence that killed them.

## User Skills

| Trigger | Compact rule block |
| --- | --- |
| `VBAONode`, `TSL`, shader, WebGPU kernel | TypeScript / TSL Node Rules |
| evidence, screenshots, benchmark, WebGPU timing | WebGPU Evidence Rules |
| test, strict TDD, RED/GREEN | Strict TDD Rules |
| SDD, OpenSpec, roadmap, spec | SDD / Artifact Rules |
