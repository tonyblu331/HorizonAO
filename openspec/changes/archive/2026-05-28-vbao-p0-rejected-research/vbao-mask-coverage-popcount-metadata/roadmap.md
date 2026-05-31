# VBAO Mask Metadata Roadmap

_Roundtable revision for the next gate after rejecting metadata-aware v1._

---

## Current Shape

| Area | Current state | Candid rating | Why |
| --- | --- | ---: | --- |
| Hardened parity oracle | Green for current fixture matrix, including true-normal corner rows | 8/10 | Good internal correctness tripwire; still not exhaustive ground truth. |
| Paper/formula reconciliation | Instrumented, not decided | 6/10 | Paper-style and cosine paths are comparable, but visual formula choice is not closed. |
| Depth hierarchy | Diagnostic/prototype only | 4/10 | Existing prefilter is not promoted and can create false curvature. |
| Metadata-aware v1 filter | Implemented, rejected for promotion | 5/10 | Spatial-only and correctly gated, but still shows noise, false curvature, and scale mismatch. |
| GPU-visible bitmask metadata | Debug views implemented; filter consumption pending | 5/10 | Mask coverage/popcount are visible in the Museum evidence harness, but filter v2 does not consume them yet. |
| Evidence discipline | Stronger than before | 7/10 | JSON/screenshots/timings exist; failure labels now reject promotion instead of hand-waving. |
| Public API discipline | Healthy | 9/10 | No `VBAONodeOptions` expansion and no public mask/filter export. |

## Revised Gate Sequence

```mermaid
flowchart LR
    accTitle: Revised VBAO Gate Sequence
    accDescr: The roadmap starts from rejected metadata-aware v1 and moves to internal bitmask metadata before any new filter promotion.

    rejected["❌ Reject metadata-aware v1"]
    mask_metadata["⚙️ Expose mask metadata"]
    debug_views["🔧 Debug views"]
    filter_v2["⚙️ Mask-aware filter v2"]
    evidence["✅ Evidence matrix"]
    decision{"🧠 Promote?"}
    no_public_api["🔒 Keep API private"]
    formula["🧠 Formula decision"]
    depth["🧠 Depth hierarchy decision"]

    rejected --> mask_metadata --> debug_views --> filter_v2 --> evidence --> decision
    decision -->|"pass"| formula
    decision -->|"pass"| depth
    decision -->|"fail"| mask_metadata
    no_public_api -.-> mask_metadata
    no_public_api -.-> filter_v2

    classDef rejected_class fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    classDef work_class fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    classDef decision_class fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef guard_class fill:#f3f4f6,stroke:#4b5563,color:#111827

    class rejected rejected_class
    class mask_metadata,debug_views,filter_v2,evidence work_class
    class decision,formula,depth decision_class
    class no_public_api guard_class
```

## Architecture Slice

```mermaid
flowchart TB
    accTitle: Mask Metadata Architecture
    accDescr: Internal bitmask metadata is produced near VBAO mask construction, displayed as debug views, and consumed by the next spatial filter candidate.

    subgraph shader["⚙️ VBAO shader internals"]
        mask["sector mask per slice"]
        ao["AO scalar"]
        coverage["maskCoverage"]
        popcount["maskPopcount"]
        variance["maskVariance later"]
    end

    subgraph demo["🔧 Museum demo internals"]
        views["debug views"]
        matrix["benchmark matrix"]
        filter["mask-aware filter v2"]
    end

    subgraph evidence["✅ Evidence gate"]
        json["JSON rows"]
        shots["screenshots"]
        labels["failure labels"]
    end

    mask --> ao
    mask --> coverage
    mask --> popcount
    mask -.-> variance
    coverage --> views
    popcount --> views
    coverage --> filter
    popcount --> filter
    filter --> matrix --> json
    matrix --> shots
    shots --> labels
```

## Semantic Contract

| Term | Meaning | Promotion use |
| --- | --- | --- |
| `maskCoverage` | Average blocked-sector fraction across slices | Reject saturated broad masks that likely cause false curvature. |
| `maskPopcount` | Normalized average popcount, equivalent to `countOneBits(mask) / 32` per slice | Detect sparse vs. saturated occlusion before blending. |
| `maskVariance` | Later optional spread across slices | Detect unstable/directional disagreement. |
| `edgeDepth` | Geometric depth discontinuity | Preserve silhouette and depth edges. |
| `edgeNormal` | Geometric normal discontinuity | Preserve corners and surface changes. |
| `confidence` | Local geometry confidence | Avoid blending low-quality neighborhoods. |

## Next Tasks

1. **RED contract first**
   - Add source tests requiring internal `mask-coverage` / `mask-popcount`
     debug views.
   - Assert no `VBAONodeOptions` or `@horizonao/core` export changes.
   - Assert the metadata-aware v1 evidence remains rejected.

2. **Real GPU metadata channel**
   - Produce mask coverage/popcount beside a GPU visibility-mask construction.
   - Do not derive it from final AO after the fact.
   - Keep the channel internal to demo/evidence plumbing until promotion.
   - Status: initial Museum debug views implemented.

3. **Debug and benchmark**
   - Add Museum debug views for `mask-coverage` and `mask-popcount`.
   - Add benchmark matrix rows for the mask metadata views.
   - Capture 1920×1080 primary and 1280×720 secondary screenshots.
   - Status: initial 10-row WebGPU debug matrix captured.

4. **Filter v2**
   - Add a mask-aware spatial candidate.
   - Reject taps with saturated or inconsistent masks before blending.
   - Keep it temporal-free.

5. **Decision**
   - Compare raw VBAO, metadata-aware v1, mask-aware v2, GTAO, and N8AO.
   - Promote nothing unless it reduces `noise` without worsening `mud`,
     `edge-bleed`, `halo`, `thin-gap`, `false-curvature`, or
     `scale-mismatch`.

## Stop Conditions

- If mask metadata is not independently visible in debug screenshots, stop.
- If the filter still preserves hatch noise, stop.
- If it removes noise by adding mud, stop.
- If public API needs expansion before evidence passes, stop.
- If depth-prefilter changes are needed, split into a separate gate.
