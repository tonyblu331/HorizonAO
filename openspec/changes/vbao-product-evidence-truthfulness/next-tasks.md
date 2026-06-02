# Next Tasks: VBAO Review Gate Roadmap

## Rule

Do not optimize, rename, or add passes until the current product path is measurable and truthful. The order matters: evidence first, then quality decisions, then cleanup.

## P0 — Stabilize Evidence Truthfulness

- [x] Product Museum rows use `quality: 'quality'` without explicit `samples`/`slices`.
- [x] Debug override rows are opt-in through `AO_BENCHMARK_VBAO_SAMPLE_MODE=debug-override` / `?vbaoSampleMode=debug-override`.
- [x] Production reports expose `VBAO sample mode`.
- [ ] Run a fresh product-preset capture and copy reviewed rows into `EVIDENCE.md`.
- [ ] If useful, run one debug-override capture and keep it clearly labeled as non-product evidence.

## P1 — Half-Resolution Quality Gate

Goal: decide whether half-res can be the performance path.

Tasks:

- [ ] Capture half-res and full-res VBAO product rows at `1920x1080` and `1280x720`.
- [ ] Compare pattern/noise, stripe, edge-bleed, and thin-gap proxies.
- [ ] Add an explicit pass/fail row for half-res promotion in `EVIDENCE.md`.
- [ ] If half-res fails wall/stripe gates, keep it non-default and document the failure label.

Acceptance:

- Half-res is only promotable if it improves cost without unacceptable stripe, edge-bleed, thin-gap, or false-curvature regression.

## P2 — Noise Reality Check

Goal: choose noise by measured reconstruction behavior, not taste.

Tasks:

- [ ] Keep current phase atlas as the default until a candidate wins.
- [ ] Compare atlas hash, IGN, static STBN, and FAST-like rows using the existing matrix.
- [ ] Add a separate task for procedural/no-texture IGN if the current implementation still routes through texture atlas sampling.
- [ ] Record rejected candidates with concrete reasons.

Acceptance:

- No default noise-source change without a Pareto win on quality metrics and pass timing.

## P3 — Runtime / Reference / Debug Boundary Trim

Goal: make the public runtime feel inevitable, not like a research attic.

Tasks:

- [ ] Move `vbaoGtVbaoMath.ts` out of runtime `src/` if no runtime import needs it.
- [ ] Move debug sector angle/cos/sin tables out of runtime public-adjacent constants if they are reference-only.
- [ ] Decide whether `__benchmarkNoiseSource` stays temporary, becomes an internal benchmark factory, or becomes a typed advanced internal option.
- [ ] Verify `packages/horizon-ao/src/index.ts` still exports only product API.

Acceptance:

- Runtime code ships product nodes and product constants only; reference/debug utilities live outside the runtime path.

## P4 — Generated Shader Inspection

Goal: verify TSL output, not just TypeScript source strings.

Tasks:

- [ ] Capture generated shader output or renderer node-builder output for product presets.
- [ ] Verify fixed loop bounds for `quality` product rows.
- [ ] Verify no full-res JBU path, no accidental wide polish taps, and no unexpected extra pass.
- [ ] Investigate duplicate-name warnings such as `vbaoPixel`; fix or document before release-candidate claims.

Acceptance:

- Source contracts and generated shader evidence agree.

## P5 — Self-Contained Package / Archive Check

Goal: external reviewers can audit the exact implementation, not a partial zip.

Tasks:

- [ ] Ensure internal pass files are included in any review archive.
- [ ] Include `src/index.ts`, runtime pass nodes, reference modules, and focused tests.
- [ ] Add a manifest showing included files and known deleted/moved paths.
- [ ] Run production build only if explicitly requested.

Acceptance:

- Review package has no missing imports for the files being evaluated.

## Recommended Next Execution

Start with **P1 half-resolution quality gate**. It answers the biggest product question: whether HorizonAO has a believable performance path, or whether full-res remains the only defensible product mode.