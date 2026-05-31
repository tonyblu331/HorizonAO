# Ultra-Plan: VBAO Parity Fixture Expansion

## Scope

This change expands parity from one flat-plane fixture to a small semantic
fixture matrix. The goal is not prettier screenshots; the goal is a deeper
correctness contract where scalar reference and GPU shader must agree on geometry
that matters.

## Module Deepening

The parity implementation is split into direct `vbaoParity/` modules. Callers
import the module they need directly. The modules own geometry semantics,
sampling, quantization, diagnostics, and row comparison.

```mermaid
flowchart LR
    accTitle: Module Deepening Plan
    accDescr: Refactor direction from one flat-plane helper into a deeper fixture scene module with scalar and GPU adapters

    current[⚠️ Flat-plane helper]
    fixture_scene[📋 FixtureScene **module**]
    scalar[🧮 Scalar adapter]
    gpu[🎨 GPU scene adapter]
    report[📊 Fixture report]

    current --> fixture_scene
    fixture_scene --> scalar
    fixture_scene --> gpu
    scalar --> report
    gpu --> report

    classDef warning fill:#fef9c3,stroke:#ca8a04,stroke-width:2px,color:#713f12
    classDef primary fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a5f
    classDef success fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d

    class current warning
    class fixture_scene,scalar,gpu primary
    class report success
```

## Acceptance Ladder

```mermaid
stateDiagram-v2
    accTitle: Fixture Acceptance Ladder
    accDescr: State machine for promoting each parity fixture from specified semantics to passing WebGPU evidence

    [*] --> Specified
    Specified --> RedTested
    RedTested --> ScalarImplemented
    ScalarImplemented --> GpuRendered
    GpuRendered --> Compared
    Compared --> Passed
    Compared --> Failed
    Failed --> Debugging
    Debugging --> ScalarImplemented
    Passed --> [*]
```

## Work Order

1. Lock semantic names and row schema.
2. Add RED tests for matrix shape.
3. Extract flat-plane into the new fixture seam without changing behavior.
4. Add two-wall corner scalar adapter.
5. Add two-wall corner GPU adapter.
6. Add thin-occluder scalar adapter.
7. Add thin-occluder GPU adapter.
8. Run route-level WebGPU parity.
9. Update evidence and stop if any fixture fails.

## Non-Negotiables

- No production build.
- No public API expansion.
- No spatial-filter work until fixture parity is green.
- No broad tolerance to hide mismatch.
- No screenshot promotion from fixture parity alone.
