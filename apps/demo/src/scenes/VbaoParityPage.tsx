import { useEffect, useState } from 'react'

export type VbaoValidationSceneId =
  | 'flat-plane'
  | 'sphere-contact-on-plane'
  | 'thin-pole-fence'
  | 'grazing-wall'
  | 'depth-edge'
  | 'screen-edge'
  | 'large-open-view'
  | 'normal-mismatch'

export interface VbaoValidationMetricRow {
  readonly sceneId: VbaoValidationSceneId
  readonly fixturePass: boolean
  readonly edgeLeakage: number
  readonly thinOccluderHalo: number
  readonly staticStability: number
  readonly cameraMotionShimmer: number
}

export interface VbaoParityResult {
  readonly status: 'non-evidence-placeholder'
  readonly evidence: false
  readonly reason: string
  readonly width: number
  readonly height: number
  readonly config: {
    readonly radius: number
    readonly samples: number
    readonly slices: number
    readonly thickness: number
    readonly strength: number
    readonly outputContract: 'non-evidence-placeholder'
  }
  readonly metrics: readonly VbaoValidationMetricRow[]
  readonly fixturePixels: Partial<Record<VbaoValidationSceneId, readonly number[]>>
}

declare global {
  interface Window {
    __vbaoParity?: VbaoParityResult
    __vbaoParityError?: string
    __vbaoParityProgress?: string
  }
}

const PARITY_SIZE = 64
const SCENE_IDS: readonly VbaoValidationSceneId[] = [
  'flat-plane',
  'sphere-contact-on-plane',
  'thin-pole-fence',
  'grazing-wall',
  'depth-edge',
  'screen-edge',
  'large-open-view',
  'normal-mismatch',
]

function makePixels(width: number, height: number): readonly number[] {
  const pixels: number[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / Math.max(1, width - 1)
      const ny = y / Math.max(1, height - 1)
      pixels.push(0.55 + 0.35 * nx * (1 - ny))
    }
  }
  return pixels
}

function makeMetricRow(sceneId: VbaoValidationSceneId): VbaoValidationMetricRow {
  return {
    sceneId,
    fixturePass: true,
    edgeLeakage: 0,
    thinOccluderHalo: 0,
    staticStability: 1,
    cameraMotionShimmer: 0,
  }
}

function buildParityResult(): VbaoParityResult {
  const pixels = makePixels(PARITY_SIZE, PARITY_SIZE)
  const fixturePixels: Partial<Record<VbaoValidationSceneId, readonly number[]>> = {}
  for (const sceneId of SCENE_IDS) fixturePixels[sceneId] = pixels

  return {
    status: 'non-evidence-placeholder',
    evidence: false,
    reason:
      '/vbao-parity is currently a GT-VBAO++ validation scaffold only; placeholder pixels are non-gating and are not committed evidence until real GPU readback metrics replace these rows.',
    width: PARITY_SIZE,
    height: PARITY_SIZE,
    config: {
      radius: 0.4,
      samples: 4,
      slices: 2,
      thickness: 0.1,
      strength: 1,
      outputContract: 'non-evidence-placeholder',
    },
    metrics: SCENE_IDS.map(makeMetricRow),
    fixturePixels,
  }
}

type PageState = 'loading' | 'ready' | 'error'

export function VbaoParityPage() {
  const [pageState, setPageState] = useState<PageState>('loading')

  useEffect(() => {
    try {
      window.__vbaoParityProgress = 'gt-vbao-validation-scaffold-ready'
      window.__vbaoParity = buildParityResult()
      setPageState('ready')
    } catch (error) {
      window.__vbaoParityError = error instanceof Error ? error.message : String(error)
      setPageState('error')
    }
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>VBAO Validation</h1>
      <p data-testid="parity-status" data-state={pageState}>
        {pageState === 'ready'
          ? 'GT-VBAO++ validation scaffold ready; marked non-evidence until real metrics are captured.'
          : pageState}
      </p>
    </main>
  )
}
