import {
  ClampToEdgeWrapping,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  StorageTexture,
  UnsignedByteType,
  type WebGPURenderer,
} from 'three/webgpu'
import { Fn, instanceIndex, storageTexture, texture, textureStore, uint, uvec2, vec4 } from 'three/tsl'

export const VBAO_COMPUTE_CANDIDATE_LABEL = 'sector-confidence-smoke' as const
export const VBAO_COMPUTE_CANDIDATE_TARGET_FORMAT = 'rgba8unorm' as const
export const VBAO_COMPUTE_CANDIDATE_TARGET_LIFETIME = 'active-vbao-pipeline' as const
export const VBAO_COMPUTE_CANDIDATE_BACKEND = 'webgpu' as const

export function createVbaoSectorConfidenceComputeCandidate(width: number, height: number) {
  const safeWidth = Math.max(1, Math.floor(width))
  const safeHeight = Math.max(1, Math.floor(height))
  const target = new StorageTexture(safeWidth, safeHeight)
  target.name = 'VBAO.ComputeCandidate.SectorConfidence'
  target.format = RGBAFormat
  target.type = UnsignedByteType
  target.wrapS = ClampToEdgeWrapping
  target.wrapT = ClampToEdgeWrapping
  target.magFilter = NearestFilter
  target.minFilter = NearestFilter
  target.generateMipmaps = false
  const storageTarget = target as StorageTexture & { mipmapsAutoUpdate: boolean }
  storageTarget.mipmapsAutoUpdate = false
  target.colorSpace = NoColorSpace

  const output = storageTexture(target)
  const computeNode = Fn(() => {
    const x = uint(instanceIndex).mod(uint(safeWidth))
    const y = uint(instanceIndex).div(uint(safeWidth))
    textureStore(output, uvec2(x, y), vec4(1, 0, 0, 1)).toWriteOnly()
  })().compute(safeWidth * safeHeight, [64])

  return {
    label: VBAO_COMPUTE_CANDIDATE_LABEL,
    outputResolution: { width: safeWidth, height: safeHeight },
    storageTargetInventory: [
      {
        name: target.name,
        role: 'sector-confidence-storage-texture',
        backend: VBAO_COMPUTE_CANDIDATE_BACKEND,
        targetFormat: VBAO_COMPUTE_CANDIDATE_TARGET_FORMAT,
        targetLifetime: VBAO_COMPUTE_CANDIDATE_TARGET_LIFETIME,
        width: safeWidth,
        height: safeHeight,
        dispatchWorkItems: safeWidth * safeHeight,
        workgroupSize: 64,
      },
    ],
    target,
    computeNode,
    compute: (renderer: WebGPURenderer) => renderer.compute(computeNode),
    dispose: () => target.dispose(),
  }
}
