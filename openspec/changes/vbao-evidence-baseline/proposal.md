# Proposal: VBAO Evidence Baseline

## Intent

Establish reproducible visual and timing evidence for VBAO before changing
kernel math. Current complaints about muddy/noisy output are plausible, but the
next math work needs screenshots, timings, and failure labels instead of taste.

## Scope

### In Scope

- Add evidence requirements for raw/denoised GTAO, VBAO, and N8AO comparisons.
- Add a demo-only full-resolution VBAO evidence mode or preset.
- Update `EVIDENCE.md` with capture rows and failure classification fields.
- Add route/control smoke coverage for the evidence comparison path.

### Out of Scope

- No VBAO kernel, adaptive-thickness, depth-MIP, or denoise algorithm changes.
- No public `@horizonao/core` API or `VBAONodeOptions` changes.
- No XeGTAO/CACAO port.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `vbao-node`: Add evidence-gated comparison requirements for benchmark captures,
  full-resolution evidence mode, and future math/denoise decisions.

## Approach

Build on the existing Museum/GTAO reference route and `EVIDENCE.md`. Keep the
evidence mode demo-local, record raw and denoised output separately, and require
captures at 1920x1080 and 1280x720 using pinned cameras where possible.

## Affected Areas

| Area | Impact | Description |
| --- | --- | --- |
| `EVIDENCE.md` | Modified | Add comparison matrix, failure labels, timing rows |
| `apps/demo/src/scenes/MuseumScene.tsx` | Modified | Add full-resolution evidence mode/control if needed |
| `apps/demo/e2e/` | Modified | Smoke coverage for evidence comparison controls |
| `openspec/specs/vbao-node/spec.md` | Modified | Add evidence baseline requirements |

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Headless tests miss WebGPU behavior | High | Mark browser/GPU captures as manual evidence |
| Evidence mode becomes a public API | Medium | Keep it demo-only and document no core API changes |
| Full-res comparison changes defaults | Low | Add evidence mode without modifying locked tiers |

## Rollback Plan

Revert the SDD change folder, evidence route/control edits, test additions, and
`EVIDENCE.md` rows. No package API or kernel migration is involved.

## Dependencies

- WebGPU-capable browser for final evidence captures.
- Existing Museum/GTAO comparison route and `evidenceCameras.ts`.

## Success Criteria

- [ ] Proposal, spec, design, and tasks exist under `openspec/changes/vbao-evidence-baseline/`.
- [ ] `EVIDENCE.md` defines required raw/denoised comparison rows and failure labels.
- [ ] Demo has a full-resolution VBAO evidence path without changing core defaults.
- [ ] Smoke tests cover evidence controls; manual WebGPU captures remain documented.
