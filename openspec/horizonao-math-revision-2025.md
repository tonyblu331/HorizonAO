# HorizonAO Math Revision 2025+

Status: research revision  
Date: 2026-05-18  
Branch: `codex/revise-horizonao-math-2025`  
Decision: revise the math roadmap, fix scalar debug output first, then implement signed horizon math

## 1. Current Reality

The merged HorizonAO path is not visually validated yet. Review screenshots after PR #8 showed:

- Three `GTAONode` `raw-ao` renders grayscale AO.
- HorizonAO `raw-ao` and `denoised-ao` currently show the colored scene.
- Local fallback logs report a framebuffer/texture feedback loop.

The first implementation step fixed issue #9 locally: raw AO remains exposed through `passTexture(...)`, while the denoise pass samples the raw render target as a plain texture and explicitly updates/setups the raw source before filtering. Do not tune or replace AO math unless the scalar debug E2E guard stays green.

## 2. Literature Sweep

The scan included English and non-English sources. The strongest directly relevant sources remain English production/research references, but Chinese and Korean work adds useful evidence around adaptive AO parameters and non-mesh AO weighting.

| Source                                                             | Language | Relevant takeaway                                                                                                                | HorizonAO decision                                       |
| ------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Three `GTAONode` docs/source                                       | English  | TSL-first shape, depth + optional normal + camera, optional temporal, manual denoise                                             | Keep as integration reference                            |
| Activision GTAO / Jimenez et al.                                   | English  | Horizon slice integration is still the right small-data AO model                                                                 | Align raw math more explicitly                           |
| XeGTAO                                                             | English  | Practical estimator, denoise, auto-tune mindset, ground-truth comparison discipline                                              | Use as algorithmic north star, not dependency            |
| AMD CACAO / ASSAO                                                  | English  | Edge-aware filtering, normal reconstruction, adaptive quality branches                                                           | Borrow validation ideas, defer complexity                |
| Wu 2025 ESS                                                        | English  | Stereo SSAO inconsistency can be detected adaptively using perceptual thresholds                                                 | Defer to XR/stereo research branch                       |
| EA SEED 2024 filter-adapted sampling                               | English  | Sampling should be designed against the denoiser/filter, not independently                                                       | Candidate for sampling v2 after #9                       |
| 中国图象图形学报 2025 lightweight rendering parameter optimization | Chinese  | Real-time rendering parameter optimization can reduce cost while preserving quality, but the public page is not AO-math specific | Useful preset-optimizer context only                     |
| LUT-Opt 2026 XGBoost-driven lookup tables                          | English  | Hybrid-pipeline AO can be included in adaptive rendering-parameter selection                                                     | Future preset optimizer only, no ML in v1                |
| Kim 2025 point-cloud AO, JKSCI                                     | Korean   | Normal-directional angular weighting and neighborhood search can produce coherent AO without mesh connectivity                   | Relevant to point/scan adapter, not v1 screen-space core |
| SIGGRAPH Advances 2025 production talks                            | English  | AAA engines still keep GTAO/post AO beside RT/GI/probe systems                                                                   | Confirms AO-first small-scale role                       |

Non-English terminology checked:

- Chinese: 屏幕空间环境光遮蔽, 环境光遮蔽, 轻量级实时渲染参数优化
- Korean: 주변폐색, 화면 공간 주변 폐색, 포인트 클라우드에서의 효율적인 주변폐색
- Japanese: スクリーンスペース アンビエントオクルージョン
- French: occlusion ambiante, occlusion ambiante en espace écran

Important: multilingual search did not reveal a better WebGPU/TSL-specific AO estimator than the GTAO/XeGTAO/CACAO family. So the correct move is not novelty theater. The correct move is a cleaner estimator plus better proof.

## 3. Revised Math Direction

### 3.1 Keep Accessibility As The Stored Quantity

Store accessibility `A`, not strict occlusion `O`.

```text
A(p) = 1 / pi integral_hemisphere V(p, w) max(0, n dot w) dw
O(p) = 1 - A(p)
```

Implementation rule:

- raw texture channel stores `A`, where `1` means open and `0` means fully dark
- composite multiplies scene color by `A^intensity`
- debug labels must say accessibility or AO scalar clearly

Why: This matches the current composite and avoids repeatedly flipping `1 - x` across passes.

### 3.2 Replace Ambiguous Cosine Accumulator With Signed Horizon Angles

The current code tracks horizon cosine deltas. That is hard to audit and easy to mislabel.

Math v2 should explicitly compute signed horizon angles per slice:

```text
For slice direction s_i:
  b_i = normalize(cross(s_i, viewDir))
  t_i = cross(b_i, viewDir)
  n_i = normalize(n - b_i dot n * b_i)
  gamma_i = atan2(dot(n_i, t_i), dot(n_i, viewDir))

  h_i+ = max horizon angle in +s_i
  h_i- = max horizon angle in -s_i

  A_i = integrated visible arc around gamma_i using h_i+ and h_i-
  A = saturate(mean_i(A_i))
```

This is closer to the GTAO mental model: find horizons, integrate the unoccluded arc against the projected normal, average slices.

Implementation note: copy no formula blindly. Validate the integrated arc term against Three `GTAONode`, XeGTAO, and a CPU scalar reference for known synthetic cases.

### 3.3 Use Thickness As A Visibility Window, Not A Magic Quality Knob

Rename internally:

```text
thickness -> depthWindow or horizonThickness
```

Public API may keep `thickness` for compatibility, but docs must explain:

- it rejects samples whose view-space depth delta is too large
- it reduces background leakage and detached halos
- it is not a physically meaningful material thickness

### 3.4 Couple Sampling To The Denoiser

Current magic-square jitter is acceptable as a first correction, but 2024+ sampling literature says sample patterns should be evaluated after the spatial/temporal filter.

Math v2 should compare:

1. current magic-square rotation
2. blue-noise or void-and-cluster style texture
3. filter-adapted sample pattern inspired by EA SEED 2024

Acceptance:

- compare raw AO and denoised AO
- same scene, camera, radius, samples, resolution
- reject any pattern that only looks better before denoise but worse after denoise

### 3.5 Add Edge Confidence As A First-Class Scalar

Before temporal, add an edge confidence term:

```text
C_edge = f(depthGradient, normalAgreement)
```

Use it for:

- denoise weights
- debug visualization
- future temporal confidence

Do not add temporal until `edge-confidence` is visible and meaningful.

### 3.6 Do Not Adopt Bitmask AO Yet

Visibility bitmask AO is interesting, but v1 is not ready. It increases state, packing complexity, and API pressure. Revisit only after:

- scalar raw AO is correct
- denoise is visually proven
- WebGPU path is validation clean
- failure screenshots show scalar horizon integration cannot solve a real target case

## 4. Revised Pass Graph

Near-term graph:

```text
scene depth + normal + camera
  -> raw signed-horizon accessibility
  -> spatial edge-aware denoise
  -> composite/debug
```

Future graph, only after evidence:

```text
scene depth + normal + camera
  -> raw signed-horizon accessibility
  -> edge confidence
  -> spatial denoise
  -> optional AO temporal with history rejection
  -> composite/debug
```

Still cut:

- GI
- SSGI
- ray tracing fallback
- neural AO
- material graph
- object hierarchy
- tile routing without measured gain

## 5. Revised PR Order

### PR-A: Fix AO Debug Output Feedback Loop

Issue: #9

Status: implemented locally.

Goal: make `raw-ao` and `denoised-ao` prove scalar AO visually.

Exit criteria:

- no feedback-loop warning
- HorizonAO raw debug is grayscale
- HorizonAO denoised debug is grayscale
- E2E rejects colored debug output and flat debug output

### PR-B: Signed Horizon Math v2

Status: first CPU-reference slice in progress.

Goal: replace ambiguous cosine accumulator with explicitly documented signed horizon-angle integration.

Tasks:

- write CPU scalar reference for synthetic cases before shader changes
- match no-occluder, full-blocker, symmetric two-wall, and far-background cases
- define the slice convention as an integral of `max(0, cos(theta - normalAngle))` over the visible signed horizon arc, normalized by the full cosine hemisphere integral of `2`
- port formula to TSL only after CPU tests pass
- compare against Three `GTAONode` raw AO

### PR-C: Sampling Ablation

Goal: select sample rotation/noise after denoise, not before.

Candidates:

- magic-square rotation
- blue-noise texture
- filter-adapted pattern inspired by EA SEED 2024

Exit criteria:

- screenshot matrix
- no fake timing
- winner chosen by artifact reduction, not taste

### PR-D: Edge Confidence And Denoise v2

Goal: make denoise explainable.

Tasks:

- compute edge confidence from depth and normal discontinuities
- render `edge-confidence`
- make denoise preserve silhouettes and contact edges better

### PR-E: XR/Stereo Research Branch

Goal: evaluate Wu 2025 only for stereo/XR.

Tasks:

- detect left/right AO inconsistency
- apply adaptive stereo-aware expensive path only where needed
- keep out of v1 web demo unless there is an XR target

## 6. Candid Rejections

Do not add ML/XGBoost/LUT parameter optimization now. The 2025 Chinese parameter-optimization paper and 2026 LUT-Opt paper are interesting for engine-level adaptive settings, but HorizonAO does not yet have trustworthy AO output. Optimizing a broken output is locura cósmica.

Do not add point-cloud AO to core. The Korean point-cloud paper is useful for scanned-data thinking, but HorizonAO is a screen-space Three.js node. A point-cloud adapter may come later.

Do not add Fourier horizon maps. The 2025 horizon-map work targets terrain/planetary shadows, not compact dynamic screen-space AO.

Do not use Wu 2025 as an excuse to add stereo complexity to v1. It belongs in XR research once monoscopic output is correct.

Do not make temporal the next fix. The current visual bug is spatial/pass correctness, not temporal instability.

## 7. Sources

- Three.js `GTAONode`: https://threejs.org/docs/pages/GTAONode.html
- Three.js `GTAONode` source in local dependency: `packages/horizon-ao/node_modules/three/examples/jsm/tsl/display/GTAONode.js`
- Activision GTAO: https://research.activision.com/publications/archives/atvi-tr-16-01practical-realtime-strategies-for-accurate-indirect-occlusion
- XeGTAO: https://github.com/GameTechDev/XeGTAO
- AMD CACAO: https://gpuopen.com/manuals/fidelityfx_sdk/techniques/combined-adaptive-compute-ambient-occlusion/
- Wu 2025 Efficient Stereo-Aware SSAO: https://kevincosner.github.io/publications/Wu2025ESS/
- EA SEED 2024 Filter-Adapted Spatio-Temporal Sampling: https://www.ea.com/seed/news/spatio-temporal-sampling
- Chinese lightweight real-time rendering parameter optimization: https://www.cjig.cn/zh/article/doi/10.11834/jig.240483/
- LUT-Opt 2026: https://arxiv.org/abs/2604.25178
- Korean point-cloud AO, JKSCI 2025: https://journal.kci.go.kr/jksci/archive/articleView?artiId=ART003280480
- SIGGRAPH Advances 2025: https://www.advances.realtimerendering.com/s2025/
