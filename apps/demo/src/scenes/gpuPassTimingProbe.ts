import type { WebGPURenderer } from 'three/webgpu'

export interface GpuPassTiming {
  readonly uid: string
  readonly frame: number
  readonly label: string
  readonly gpuMs: number
  readonly width: number
  readonly height: number
}

interface TimestampBackend {
  beginRender?: (renderContext: unknown) => unknown
  getTimestampUID?: (renderContext: unknown) => string | undefined
  timestampQueryPool?: {
    render?: {
      timestamps?: Map<string, number>
    }
  }
}

interface RenderContextMeta {
  readonly frame: number
  readonly label: string
  readonly width: number
  readonly height: number
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

function readTextureName(renderContext: unknown): string {
  const contextRecord = asRecord(renderContext)
  const renderTargetRecord = asRecord(contextRecord?.renderTarget)
  const textureRecord = asRecord(renderTargetRecord?.texture)
  const textureName = textureRecord?.name
  return typeof textureName === 'string' ? textureName : ''
}

function readNumber(record: Record<string, unknown> | undefined, key: string): number {
  const value = record?.[key]
  return typeof value === 'number' ? value : 0
}

function readFrame(uid: string): number {
  const frameMatch = /:f(\d+)$/.exec(uid)
  return frameMatch === null ? -1 : Number(frameMatch[1])
}

function shouldCaptureTimingLabel(label: string): boolean {
  return (
    label.startsWith('AO.PassTiming.') ||
    label.startsWith('VBAO.') ||
    label.startsWith('N8AO.') ||
    label === 'GTAONode.AO'
  )
}

export function createGpuPassTimingProbe(renderer: WebGPURenderer): {
  readonly resolveLatestVbaoPassTimings: () => Promise<readonly GpuPassTiming[]>
  readonly dispose: () => void
} {
  const rendererWithBackend = renderer as unknown as { readonly backend?: TimestampBackend }
  const backend = rendererWithBackend.backend
  const originalBeginRender = backend?.beginRender
  const contextByUid = new Map<string, RenderContextMeta>()

  if (
    backend === undefined ||
    originalBeginRender === undefined ||
    backend.getTimestampUID === undefined
  ) {
    return {
      resolveLatestVbaoPassTimings: async () => [],
      dispose: () => {},
    }
  }

  backend.beginRender = function patchedBeginRender(this: unknown, renderContext: unknown) {
    const uid = backend.getTimestampUID?.(renderContext)
    const label = readTextureName(renderContext)
    if (uid !== undefined && shouldCaptureTimingLabel(label)) {
      const contextRecord = asRecord(renderContext)
      contextByUid.set(uid, {
        frame: readFrame(uid),
        label,
        width: readNumber(contextRecord, 'width'),
        height: readNumber(contextRecord, 'height'),
      })
    }
    return originalBeginRender.call(this, renderContext)
  }

  const rendererWithTimestamps = renderer as unknown as {
    resolveTimestampsAsync?: (type: 'render') => Promise<number | undefined>
  }

  return {
    resolveLatestVbaoPassTimings: async () => {
      await rendererWithTimestamps.resolveTimestampsAsync?.('render')
      const timestamps = backend.timestampQueryPool?.render?.timestamps
      if (timestamps === undefined) return []

      const rows = Array.from(timestamps.entries())
        .map(([uid, gpuMs]) => {
          const meta = contextByUid.get(uid)
          if (meta === undefined) return undefined
          return { ...meta, uid, gpuMs }
        })
        .filter((row): row is GpuPassTiming => row !== undefined)

      const latestFrame = Math.max(-1, ...rows.map((row) => row.frame))
      return rows.filter((row) => row.frame === latestFrame)
    },
    dispose: () => {
      backend.beginRender = originalBeginRender
      contextByUid.clear()
    },
  }
}
