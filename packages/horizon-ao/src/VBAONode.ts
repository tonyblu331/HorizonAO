/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * VBAONode — Visibility-Bitmask Ambient Occlusion for Three.js TSL/WebGPU.
 *
 * Integration shape mirrors `THREE.GTAONode` (depth + normal + camera +
 * factory + getTextureNode + setSize). v1 ships AO scalar only; no GI,
 * bent normals, denoise, temporal, ray, or neural extensions.
 *
 * **Required normal:** Unlike `GTAONode`, this constructor throws
 * `TypeError('VBAONode: normalNode is required')` when `normalNode` is
 * null or undefined. Depth-derived fallback is intentionally absent in v1
 * (see ADR-010).
 *
 * Reference: Therrien, O., Levesque, Y., Gilet, G.
 * *Screen Space Indirect Lighting with Visibility Bitmask*.
 * arXiv:2301.11376, 2023. https://arxiv.org/abs/2301.11376
 *
 * @three_import import { vbao } from '@horizonao/core'
 */

import {
  DataTexture,
  NodeMaterial,
  QuadMesh,
  RedFormat,
  RenderTarget,
  RendererUtils,
  RepeatWrapping,
  TempNode,
  Vector2,
  Vector3,
  type Camera,
  type Node,
  type NodeFrame,
  type TextureNode,
} from 'three/webgpu'
import {
  NodeUpdateType,
  PI,
  abs,
  atan,
  bitNot,
  bitOr,
  ceil,
  clamp,
  cos,
  cross,
  dot,
  float,
  floor,
  Fn,
  getScreenPosition,
  getViewPosition,
  If,
  int,
  logarithmicDepthToViewZ,
  Loop,
  max,
  min,
  normalize,
  passTexture,
  pow,
  reference,
  shiftLeft,
  shiftRight,
  sin,
  texture,
  textureSize,
  uint,
  uniform,
  uv,
  vec2,
  vec3,
  viewZToPerspectiveDepth,
} from 'three/tsl'

import {
  SECTOR_COUNT,
  VBAO_DEFAULTS,
  clampVbaoNodeOptions,
  type VBAONodeOptions,
} from './vbaoConstants'

// ─── module-level singletons (mirrors GTAONode pattern) ──────────────────────

const quadMesh = new QuadMesh()
const size = new Vector2()
let rendererState: ReturnType<typeof RendererUtils.resetRendererState> | undefined

// ─── magic-square noise (deterministic per-pixel rotation, AA-agnostic) ──────
// Adapted from THREE.GTAONode — same 5×5 magic-square pattern.

function generateMagicSquare(n: number): number[] {
  const sz = n * n
  const sq = Array(sz).fill(0)
  let r = Math.floor(n / 2)
  let c = n - 1

  for (let num = 1; num <= sz; ) {
    if (r === -1 && c === n) {
      c = n - 2
      r = 0
    } else {
      if (c === n) c = 0
      if (r < 0) r = n - 1
    }
    if (sq[r * n + c] !== 0) {
      c -= 2
      r++
      continue
    }
    sq[r * n + c] = num++
    c++
    r--
  }
  return sq
}

function generateMagicSquareNoise(size = 5): DataTexture {
  const n = Math.floor(size) % 2 === 0 ? Math.floor(size) + 1 : Math.floor(size)
  const sq = generateMagicSquare(n)
  const total = sq.length
  const data = new Uint8Array(total * 4)

  for (let i = 0; i < total; i++) {
    const angle = (2 * Math.PI * sq[i]) / total
    const v = new Vector3(Math.cos(angle), Math.sin(angle), 0).normalize()
    data[i * 4 + 0] = (v.x * 0.5 + 0.5) * 255
    data[i * 4 + 1] = (v.y * 0.5 + 0.5) * 255
    data[i * 4 + 2] = 127
    data[i * 4 + 3] = 255
  }

  const tex = new DataTexture(data, n, n)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.needsUpdate = true
  return tex
}

// ─── VBAONode ─────────────────────────────────────────────────────────────────

/**
 * Visibility-Bitmask AO TempNode.
 *
 * Public uniform surface matches `GTAONode` where the semantics overlap;
 * `distanceFallOff`, `distanceExponent`, and `useTemporalFiltering` are
 * intentionally omitted (see ADR-007). `sectors` is compile-time `32`
 * and is exposed only as a `readonly … as const` getter for documentary
 * purposes (see ADR-007 and `vbaoConstants.SECTOR_COUNT`).
 */
export class VBAONode extends TempNode<'float'> {
  static get type(): string {
    return 'VBAONode'
  }

  readonly depthNode: Node
  readonly normalNode: Node
  readonly camera: Camera

  readonly radius = uniform(VBAO_DEFAULTS.radius)
  readonly thickness = uniform(VBAO_DEFAULTS.thickness)
  readonly scale = uniform(VBAO_DEFAULTS.scale)
  readonly slices = uniform(VBAO_DEFAULTS.slices)
  readonly samples = uniform(VBAO_DEFAULTS.samples)
  readonly resolution = uniform(new Vector2())

  /** Documentary only — `SECTOR_COUNT` is compile-time in v1. */
  readonly sectors = SECTOR_COUNT

  resolutionScale: number = VBAO_DEFAULTS.resolutionScale
  updateBeforeType = NodeUpdateType.FRAME

  private readonly renderTarget = new RenderTarget(1, 1, {
    depthBuffer: false,
    format: RedFormat,
  })
  private readonly material = new NodeMaterial()
  private readonly textureNode: TextureNode
  private readonly sampleTextureNode: TextureNode
  private readonly cameraProjectionMatrix
  private readonly cameraProjectionMatrixInverse
  private readonly cameraNear
  private readonly cameraFar
  private readonly noiseNode

  /**
   * @param depthNode  - TSL node producing scene depth (`float`).
   * @param normalNode - TSL node producing view-space normals (`vec3`). **Required.**
   * @param camera     - The camera used to render the scene.
   * @param options    - Optional clamped uniform overrides.
   *
   * @throws {TypeError} if `normalNode` is `null` or `undefined`.
   */
  constructor(
    depthNode: Node,
    normalNode: Node,
    camera: Camera,
    options: VBAONodeOptions = {},
  ) {
    if (normalNode === null || normalNode === undefined) {
      throw new TypeError('VBAONode: normalNode is required')
    }

    super('float')

    this.depthNode = depthNode
    this.normalNode = normalNode
    this.camera = camera
    this.renderTarget.texture.name = 'VBAO.Raw'
    this.material.name = 'VBAO Raw'
    this.textureNode = passTexture(this as never, this.renderTarget.texture)
    this.sampleTextureNode = texture(this.renderTarget.texture)
    this.cameraProjectionMatrix = uniform(camera.projectionMatrix)
    this.cameraProjectionMatrixInverse = uniform(camera.projectionMatrixInverse)
    this.cameraNear = reference('near', 'float', camera)
    this.cameraFar = reference('far', 'float', camera)
    this.noiseNode = texture(generateMagicSquareNoise())

    this.configure(options)
  }

  /**
   * Apply a (clamped) batch of option overrides to the live uniforms.
   * Safe to call mid-frame.
   */
  configure(options: VBAONodeOptions): void {
    const next = clampVbaoNodeOptions({
      radius: this.radius.value,
      thickness: this.thickness.value,
      scale: this.scale.value,
      slices: this.slices.value,
      samples: this.samples.value,
      resolutionScale: this.resolutionScale,
      ...options,
    })

    this.radius.value = next.radius
    this.thickness.value = next.thickness
    this.scale.value = next.scale
    this.slices.value = next.slices
    this.samples.value = next.samples
    this.resolutionScale = next.resolutionScale
  }

  getTextureNode(): TextureNode {
    return this.textureNode
  }

  getSampleTextureNode(): TextureNode {
    return this.sampleTextureNode
  }

  /**
   * Returns the internal render target that holds the raw AO texture (R channel,
   * RedFormat, UnsignedByteType).
   *
   * Useful for GPU readback in tests:
   * ```ts
   * const rt = vbaoNode.getRenderTarget()
   * const data = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, rt.width, rt.height)
   * ```
   */
  getRenderTarget(): RenderTarget {
    return this.renderTarget
  }

  setSize(width: number, height: number): void {
    const scaledWidth = Math.max(1, Math.round(this.resolutionScale * width))
    const scaledHeight = Math.max(1, Math.round(this.resolutionScale * height))

    this.resolution.value.set(scaledWidth, scaledHeight)
    this.renderTarget.setSize(scaledWidth, scaledHeight)
  }

  updateBefore(frame: NodeFrame): void {
    const renderer = frame.renderer
    if (renderer === null || renderer === undefined) return

    rendererState = RendererUtils.resetRendererState(renderer, rendererState)

    const drawingBufferSize = renderer.getDrawingBufferSize(size)
    this.setSize(drawingBufferSize.width, drawingBufferSize.height)

    quadMesh.material = this.material
    quadMesh.name = 'VBAO Raw'

    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(this.renderTarget)
    quadMesh.render(renderer)

    RendererUtils.restoreRendererState(renderer, rendererState)
  }

  /**
   * Build the TSL fragment program for the VBAO effect.
   *
   * Algorithm (design.md §§2–6, arXiv:2301.11376):
   *
   *  1. Reconstruct view-space P from depth.
   *  2. Build a stable 2-D basis (T0, T1) perpendicular to V = normalize(−P).
   *  3. For each of `slices` directions:
   *       a. Rotate by per-pixel magic-square noise to avoid aliasing.
   *       b. March `samples` steps on BOTH sides of the slice axis (mirrored).
   *       c. Each step contributes a bit range to a u32 sector mask.
   *       d. Apply cosine-weighted reduction: A_i = Σ open·w / Σ w.
   *  4. Average A_i, apply pow(·, scale) and write to RedFormat render target.
   */
  setup(builder) {
    const uvNode = uv()

    // ── depth + normal helpers ──────────────────────────────────────────────

    const sampleDepth = (uvCoord) => {
      const d = this.depthNode.sample(uvCoord).r
      if (builder.renderer.logarithmicDepthBuffer === true) {
        const vz = logarithmicDepthToViewZ(d, this.cameraNear, this.cameraFar)
        return viewZToPerspectiveDepth(vz, this.cameraNear, this.cameraFar)
      }
      return d
    }

    // normalNode is required (ADR-010); constructor already guards null.
    const sampleNormal = (uvCoord) => this.normalNode.sample(uvCoord).rgb.normalize()

    // ── per-pixel rotation from magic-square noise ──────────────────────────
    // Same 5×5 pattern as GTAONode — deterministic, frame-invariant, AA-agnostic.

    const noiseResolution = textureSize(this.noiseNode, 0)
    const noiseUv = vec2(uvNode.x, uvNode.y.oneMinus()).mul(
      this.resolution.div(noiseResolution),
    )
    const noiseTexel = this.noiseNode.sample(noiseUv)
    // Recover the angle stored in the noise texture (cos/sin packed in xy).
    const noiseDir = noiseTexel.xy.mul(2.0).sub(1.0)
    // atan2(y, x) ∈ (−π, π], +π → (0, 2π], /2π → (0, 1]
    const rotation = atan(noiseDir.y, noiseDir.x).add(PI).div(PI.mul(2.0))

    // ── compile-time constants ──────────────────────────────────────────────

    const THETA_MIN = float(-Math.PI / 2) // lower bound of sector range
    const DELTA_THETA = float(Math.PI / SECTOR_COUNT) // sector angular width

    // ── maskRange sub-function (design.md §5) ──────────────────────────────
    // count-clamped 3-way branch; lo/hi individually clamped so out-of-domain
    // angles (from the wrong side of the slice axis) contribute nothing.

    const maskRangeFn = Fn(([k0_in, k1_in]) => {
      const lo = max(int(0), min(int(SECTOR_COUNT), k0_in))
      const hi = max(int(0), min(int(SECTOR_COUNT), k1_in))
      const count = hi.sub(lo) // ∈ [0, SECTOR_COUNT]
      const result = uint(0).toVar('maskRangeResult')

      If(count.greaterThan(int(0)), () => {
        If(count.greaterThanEqual(int(SECTOR_COUNT)), () => {
          // Full range: all 32 bits set.
          result.assign(bitNot(uint(0)))
        }).Else(() => {
          // Partial range: `count` ones starting at bit `lo`.
          // bitNot(0u) >> (32 − count) → count low bits set.
          // Then << lo shifts them into position.
          const ucount = uint(count)
          const ones = shiftRight(bitNot(uint(0)), uint(SECTOR_COUNT).sub(ucount))
          result.assign(shiftLeft(ones, uint(lo)))
        })
      })

      return result
    }).setLayout({
      name: 'vbaoMaskRange',
      type: 'uint',
      inputs: [
        { name: 'k0', type: 'int' },
        { name: 'k1', type: 'int' },
      ],
    })

    // ── main VBAO kernel ────────────────────────────────────────────────────

    const vbaoKernel = Fn(() => {
      // 1. Depth — discard sky/background pixels (depth >= 1).
      const depth = sampleDepth(uvNode).toVar('depth')
      depth.greaterThanEqual(1.0).discard()

      // 2. View-space position and surface normal.
      const P = getViewPosition(uvNode, depth, this.cameraProjectionMatrixInverse).toVar('P')
      const N = sampleNormal(uvNode).toVar('N')

      // View direction from surface toward camera.
      const V = normalize(P.negate()).toVar('V')

      // 3. Stable 2-D basis perpendicular to V (design.md §2).
      //    anyPerpendicular: abs(V.x) < 0.9 avoids degenerate cross products.
      const T0 = normalize(
        abs(V.x).lessThan(0.9).select(cross(V, vec3(1, 0, 0)), cross(V, vec3(0, 1, 0))),
      ).toVar('T0')
      const T1 = normalize(cross(V, T0)).toVar('T1')

      // 4. Slice accumulation.
      const accessibility = float(0).toVar('accessibility')

      Loop({ start: int(0), end: int(this.slices), type: 'int', condition: '<' }, ({ i }) => {
        // Slice direction in the hemisphere perpendicular to V.
        // φ_i = 2π · (i + rotation) / slices  (design.md §2)
        const phi = float(i).add(rotation).div(float(this.slices)).mul(PI.mul(2.0))
        const S_i = normalize(T0.mul(cos(phi)).add(T1.mul(sin(phi)))).toVar('S_i')

        // Projected surface-normal angle in the slice plane.
        // γ_i = atan2(N·V, N·S_i), clamped to [−π/2, π/2]  (design.md §2)
        const gammaNorm = clamp(
          atan(dot(N, V), dot(N, S_i)),
          float(-Math.PI / 2),
          float(Math.PI / 2),
        ).toVar('gammaNorm')

        // Per-slice visibility mask (u32; 0 = all open, 0xFFFFFFFF = all blocked).
        const occludedMask = uint(0).toVar('occludedMask')

        // 5. Mirrored march: side ∈ {+1, −1}  (design.md §4)
        Loop(
          { start: int(0), end: int(2), type: 'int', condition: '<', name: 'sideIdx' },
          ({ sideIdx }) => {
            const sideSign = sideIdx.equal(int(0)).select(float(1), float(-1))
            const S_side = S_i.mul(sideSign).toVar('S_side')

            // Uniform step spacing: t = (j+1) / samples  ∈ (0, 1]
            // No center-bias exponent — VBAO uses uniform sampling.
            Loop(
              {
                start: int(0),
                end: int(this.samples),
                type: 'int',
                condition: '<',
                name: 'j',
              },
              ({ j }) => {
                const stepFrac = float(j).add(1.0).div(float(this.samples))
                const viewOffset = S_side.mul(this.radius).mul(stepFrac)

                // Project sample position to screen UV.
                const sampleScreenPos = getScreenPosition(
                  P.add(viewOffset),
                  this.cameraProjectionMatrix,
                ).toVar('sampleScreenPos')

                // Skip samples outside the viewport [0,1]².
                If(
                  sampleScreenPos.x
                    .greaterThanEqual(float(0))
                    .and(sampleScreenPos.x.lessThanEqual(float(1)))
                    .and(sampleScreenPos.y.greaterThanEqual(float(0)))
                    .and(sampleScreenPos.y.lessThanEqual(float(1))),
                  () => {
                    // Reconstruct the scene surface at the sample location.
                    const sD = sampleDepth(sampleScreenPos)
                    const samplePos = getViewPosition(
                      sampleScreenPos,
                      sD,
                      this.cameraProjectionMatrixInverse,
                    ).toVar('samplePos')

                    // Front face: the sample surface.
                    const D_front = normalize(samplePos.sub(P))
                    // Back face: recede by `thickness` along view direction.
                    const D_back = normalize(samplePos.sub(V.mul(this.thickness)).sub(P))

                    // Horizon angles (design.md §4).
                    // θ = atan2(D·V, D·S_side) — angle from S_side toward V.
                    const thetaFront = atan(dot(D_front, V), dot(D_front, S_side))
                    const thetaBack = atan(dot(D_back, V), dot(D_back, S_side))

                    const t0 = min(thetaFront, thetaBack)
                    const t1 = max(thetaFront, thetaBack)

                    // Discrete sector indices: floor for inclusive start, ceil for exclusive end.
                    const k0 = int(floor(t0.sub(THETA_MIN).div(DELTA_THETA)))
                    const k1 = int(ceil(t1.sub(THETA_MIN).div(DELTA_THETA)))

                    // OR the sample's sector range into the slice mask.
                    occludedMask.assign(bitOr(occludedMask, maskRangeFn(k0, k1)))
                  },
                )
              },
            )
          },
        )

        // 6. Cosine-weighted reduction (design.md §6.1, production formula).
        //    A_i = Σ_k open(k) · max(0, cos(θ_k − γ)) / Σ_k max(0, cos(θ_k − γ))
        const numerator = float(0).toVar('numerator')
        const denominator = float(0).toVar('denominator')

        Loop(
          {
            start: int(0),
            end: int(SECTOR_COUNT),
            type: 'int',
            condition: '<',
            name: 'k',
          },
          ({ k }) => {
            // Sector centre: θ_k = (k + 0.5) · Δθ + θ_min  (design.md §3)
            const thetaK = float(k).add(float(0.5)).mul(DELTA_THETA).add(THETA_MIN)
            const w = max(float(0), cos(thetaK.sub(gammaNorm)))
            denominator.addAssign(w)

            // Bit k clear → sector k is OPEN; bit k set → sector k is blocked.
            If(shiftRight(occludedMask, uint(k)).bitAnd(uint(1)).equal(uint(0)), () => {
              numerator.addAssign(w)
            })
          },
        )

        accessibility.addAssign(numerator.div(max(denominator, float(1e-6))))
      })

      // 7. Average over slices, clamp, apply user scale.
      accessibility.assign(clamp(accessibility.div(float(this.slices)), float(0), float(1)))
      accessibility.assign(pow(accessibility, this.scale))

      return accessibility
    })

    this.material.fragmentNode = vbaoKernel().context(builder.getSharedContext())
    this.material.needsUpdate = true

    return this.textureNode
  }

  dispose(): void {
    this.renderTarget.dispose()
    this.material.dispose()
  }
}

/**
 * Factory function for `VBAONode`. Mirrors Three's `ao(...)` factory for
 * `GTAONode`.
 *
 * @throws {TypeError} if `normalNode` is `null` or `undefined`.
 */
export function vbao(
  depthNode: Node,
  normalNode: Node,
  camera: Camera,
  options?: VBAONodeOptions,
): VBAONode {
  return new VBAONode(depthNode, normalNode, camera, options)
}
