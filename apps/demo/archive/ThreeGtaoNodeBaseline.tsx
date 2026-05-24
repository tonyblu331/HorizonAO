import { useLayoutEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { mrt, normalView, output, pass } from 'three/tsl'
import { ao as gtao } from 'three/addons/tsl/display/GTAONode.js'
import {
  createGpuTimingRecord,
  createHorizonAoSettings,
  createUnsupportedGpuTimingRecord,
  type GpuTimingRecord,
  type HorizonAoDebugView,
} from '@horizonao/core'
import { createAoDebugOutput } from './aoDebugOutput'

interface ThreeGtaoNodeBaselineProps {
  readonly debugView: HorizonAoDebugView
  readonly onGpuTiming: (timing: GpuTimingRecord) => void
}

export function ThreeGtaoNodeBaseline({ debugView, onGpuTiming }: ThreeGtaoNodeBaselineProps) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const renderer = gl as unknown as THREE.WebGPURenderer

  const pipeline = useMemo(() => {
    const renderPipeline = new THREE.RenderPipeline(renderer)
    const settings = createHorizonAoSettings('balanced')

    const scenePass = pass(scene, camera)
    scenePass.setMRT(
      mrt({
        output,
        normal: normalView,
      }),
    )

    const sceneColor = scenePass.getTextureNode('output')
    const sceneDepth = scenePass.getTextureNode('depth')
    const sceneLinearDepth = scenePass.getLinearDepthNode('depth')
    const sceneNormal = scenePass.getTextureNode('normal')
    const aoNode = gtao(sceneDepth, sceneNormal, camera)

    aoNode.radius.value = settings.radius
    aoNode.scale.value = settings.intensity
    aoNode.thickness.value = settings.thickness
    aoNode.distanceFallOff.value = settings.falloff
    aoNode.samples.value = settings.samples
    aoNode.resolutionScale = settings.halfResolution ? 0.5 : 1
    aoNode.useTemporalFiltering = false

    const aoTexture = aoNode.getTextureNode()
    const aoValue = aoTexture.r

    renderPipeline.outputNode = createAoDebugOutput({
      sceneColor,
      sceneLinearDepth,
      sceneNormal,
      aoValue,
      debugView,
    })

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
