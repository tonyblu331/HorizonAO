import { useLayoutEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { mrt, normalView, output, pass, vec3, vec4 } from 'three/tsl'
import {
  createGpuTimingRecord,
  createUnsupportedGpuTimingRecord,
  horizonAO,
  type GpuTimingRecord,
  type HorizonAoDebugView,
} from '@horizonao/core'

interface HorizonAoRawBaselineProps {
  readonly debugView: HorizonAoDebugView
  readonly onGpuTiming: (timing: GpuTimingRecord) => void
}

export function HorizonAoRawBaseline({ debugView, onGpuTiming }: HorizonAoRawBaselineProps) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const renderer = gl as unknown as THREE.WebGPURenderer

  const pipeline = useMemo(() => {
    const renderPipeline = new THREE.RenderPipeline(renderer)
    const scenePass = pass(scene, camera)

    scenePass.setMRT(
      mrt({
        output,
        normal: normalView,
      }),
    )

    const sceneColor = scenePass.getTextureNode('output')
    const sceneDepth = scenePass.getTextureNode('depth')
    const sceneNormal = scenePass.getTextureNode('normal')
    const aoNode = horizonAO(sceneDepth, sceneNormal, camera)
    const aoValue = aoNode.getTextureNode().r

    renderPipeline.outputNode =
      debugView === 'raw-ao'
        ? vec4(vec3(aoValue), 1)
        : sceneColor.mul(vec4(vec3(aoValue), 1))

    return renderPipeline
  }, [camera, debugView, renderer, scene])

  useLayoutEffect(() => {
    let cancelled = false

    if (!renderer.hasFeature('timestamp-query')) {
      onGpuTiming(createUnsupportedGpuTimingRecord('render', 'timestamp-query feature unavailable'))
      return
    }

    const intervalId = window.setInterval(() => {
      void renderer
        .resolveTimestampsAsync(THREE.TimestampQuery.RENDER)
        .then((durationMs) => {
          if (!cancelled) onGpuTiming(createGpuTimingRecord('render', durationMs))
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            onGpuTiming(
              createUnsupportedGpuTimingRecord(
                'render',
                error instanceof Error ? error.message : 'timestamp resolve failed',
              ),
            )
          }
        })
    }, 500)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [onGpuTiming, renderer])

  useFrame(() => {
    pipeline.render()
  }, 1)

  return null
}
