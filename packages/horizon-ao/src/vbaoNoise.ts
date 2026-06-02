import { ClampToEdgeWrapping, DataTexture, NearestFilter, NoColorSpace } from 'three/webgpu'

import {
  VBAO_PHASE_ATLAS_COLUMNS,
  VBAO_PHASE_ATLAS_PHASES,
  VBAO_PHASE_ATLAS_ROWS,
  VBAO_SAMPLING_SCHEME,
  sampleVbaoPhaseChannels,
} from './vbaoSampling'

export const VBAO_NOISE_TILE_SIZE = 64 as const

let sharedVbaoNoiseTexture: DataTexture | undefined

export function createVbaoNoiseTexture(): DataTexture {
  const n = VBAO_NOISE_TILE_SIZE
  const atlasWidth = n * VBAO_PHASE_ATLAS_COLUMNS
  const atlasHeight = n * VBAO_PHASE_ATLAS_ROWS
  const total = atlasWidth * atlasHeight
  const data = new Uint8Array(total * 4)

  for (let phase = 0; phase < VBAO_PHASE_ATLAS_PHASES; phase++) {
    const phaseX = phase % VBAO_PHASE_ATLAS_COLUMNS
    const phaseY = Math.floor(phase / VBAO_PHASE_ATLAS_COLUMNS)

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const atlasX = phaseX * n + x
        const atlasY = phaseY * n + y
        const i = atlasY * atlasWidth + atlasX
        const channels = sampleVbaoPhaseChannels({
          pixel: [x, y],
          phaseIndex: phase,
        })

        data[i * 4 + 0] = Math.max(0, Math.min(254, Math.floor(channels.rotation * 255)))
        data[i * 4 + 1] = Math.max(0, Math.min(254, Math.floor(channels.radialJitter * 255)))
        data[i * 4 + 2] = Math.max(0, Math.min(254, Math.floor(channels.subsectorThreshold * 255)))
        data[i * 4 + 3] = Math.max(0, Math.min(254, Math.floor(channels.polishRotation * 255)))
      }
    }
  }

  const tex = new DataTexture(data, atlasWidth, atlasHeight)
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  tex.magFilter = NearestFilter
  tex.minFilter = NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = NoColorSpace
  tex.name = `VBAO.Noise.${VBAO_SAMPLING_SCHEME}`
  tex.needsUpdate = true
  return tex
}

export function getSharedVbaoNoiseTexture(): DataTexture {
  sharedVbaoNoiseTexture ??= createVbaoNoiseTexture()
  return sharedVbaoNoiseTexture
}
