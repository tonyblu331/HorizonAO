# HorizonAO Raw Kernel Specification

## Purpose

The HorizonAO raw kernel produces scalar accessibility from depth, normal, and camera data using a Three.js TSL/WebGPU-first pass. It is not a renderer fallback, temporal accumulator, bent-normal system, or general visibility framework.

## Requirements

### Requirement: Signed-Horizon Slice Contract

The raw kernel SHALL expose signed-horizon terminology for slice resolve while preserving scalar accessibility output.

#### Scenario: CPU reference remains canonical

- GIVEN a signed horizon slice with known analytic horizons
- WHEN CPU reference helpers resolve accessibility
- THEN no-occluder, full-blocker, symmetric two-wall, and far-background cases SHALL match expected values

#### Scenario: Public API stays stable

- GIVEN existing calls to `horizonAO(depthNode, normalNode, camera, options)`
- WHEN the raw kernel internals are refactored
- THEN callers SHALL NOT need new options or changed argument order

### Requirement: Scalar Accessibility Semantics

The raw AO texture SHALL continue storing accessibility where `1` means open and `0` means dark.

#### Scenario: Composite semantics

- GIVEN HorizonAO output in normal rendering mode
- WHEN AO is composited with scene color
- THEN scene color SHALL be multiplied by scalar accessibility

#### Scenario: Debug semantics

- GIVEN `raw-ao` or `denoised-ao` debug view
- WHEN the debug view renders
- THEN pixels SHALL be grayscale with non-flat luminance variation

### Requirement: Scope Guard

The signed-horizon TSL v2 change MUST NOT add temporal, bitmask AO, bent normals, XR/stereo behavior, blue-noise ablation, or renderer fallback.

#### Scenario: Unsupported scope remains absent

- GIVEN the implementation diff
- WHEN reviewing public API and node options
- THEN no new feature knob for deferred scope SHALL appear
