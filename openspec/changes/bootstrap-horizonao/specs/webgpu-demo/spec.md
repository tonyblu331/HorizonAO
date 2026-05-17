# WebGPU Demo Specification

## ADDED Requirements

### Requirement: Async WebGPU Canvas

The demo MUST initialize Three `WebGPURenderer` asynchronously through R3F's `Canvas.gl` callback.

#### Scenario: Renderer initializes before first frame

- GIVEN the browser opens a scene route
- WHEN the canvas is mounted
- THEN the renderer SHALL call `await renderer.init()`
- AND the scene SHALL not render through an uninitialized renderer

### Requirement: Scene Routes

The demo MUST expose separate routes for Sponza, Suzanne, Stanford Bunny, and an instanced primitive grid.

#### Scenario: Route renders the selected scene

- GIVEN the user navigates to a scene route
- WHEN the route component loads
- THEN one R3F canvas SHALL be visible
- AND route-specific camera placement SHALL be applied

### Requirement: Conservative WebGPU Compatibility

The demo SHOULD avoid Drei helpers whose implementation depends on WebGL-only render targets until proven compatible with WebGPU.

#### Scenario: Environment is applied

- GIVEN a scene is rendered
- WHEN the environment component mounts
- THEN it SHALL configure scene background and lighting state through R3F/Three primitives
- AND it SHALL restore previous scene state on unmount
