/** Minimal scene fixture type. Updated in PR-04/PR-05 to include all VBAO demo routes. */
export interface SceneFixture {
  readonly key: string
  readonly label: string
  readonly route: string
  readonly camera: {
    readonly position: readonly [number, number, number]
    readonly target: readonly [number, number, number]
    readonly fov?: number
    readonly near?: number
    readonly far?: number
  }
}

export const PARITY_SCENES = {
  /** /vbao — VBAONode demo: raw Three.js loop with post-processing pipeline. */
  vbao: {
    key: 'vbao',
    label: 'VBAO Grid',
    route: '/vbao',
    camera: {
      position: [9, 7, 12] as unknown as readonly [number, number, number],
      target: [0, 0, 0] as unknown as readonly [number, number, number],
      fov: 42,
      near: 0.1,
      far: 120,
    },
  },
  /** /vbao-sponza — VBAONode on the Sponza model. */
  vbaoSponza: {
    key: 'vbaoSponza',
    label: 'VBAO Sponza',
    route: '/vbao-sponza',
    camera: {
      position: [0, 5.2, 8.4],
      target: [0, 0.35, 0],
      fov: 48,
      near: 0.04,
      far: 180,
    },
  },
  /** /vbao-bunny — VBAONode on the Stanford Bunny. */
  vbaoBunny: {
    key: 'vbaoBunny',
    label: 'VBAO Bunny',
    route: '/vbao-bunny',
    camera: {
      position: [0.92, 0.56, 1.62],
      target: [0, 0.12, 0],
      fov: 34,
      near: 0.01,
      far: 18,
    },
  },
  /** /vbao-suzanne — VBAONode on Suzanne. */
  vbaoSuzanne: {
    key: 'vbaoSuzanne',
    label: 'VBAO Suzanne',
    route: '/vbao-suzanne',
    camera: {
      position: [3.2, 2.05, 4.8],
      target: [0, 1.1, 0],
      fov: 34,
      near: 0.04,
      far: 40,
    },
  },
  /** / — R3F grid scene without VBAO (reference). */
  grid: {
    key: 'grid',
    label: 'Primitive Grid',
    route: '/',
    camera: {
      position: [9, 7, 12],
      target: [0, 0, 0],
      fov: 42,
      near: 0.1,
      far: 120,
    },
  },
  sponza: {
    key: 'sponza',
    label: 'Sponza',
    route: '/sponza',
    camera: {
      position: [0, 5.2, 8.4],
      target: [0, 0.35, 0],
      fov: 48,
      near: 0.04,
      far: 180,
    },
  },
  suzanne: {
    key: 'suzanne',
    label: 'Suzanne',
    route: '/suzanne',
    camera: {
      position: [3.2, 2.05, 4.8],
      target: [0, 1.1, 0],
      fov: 34,
      near: 0.04,
      far: 40,
    },
  },
  bunny: {
    key: 'bunny',
    label: 'Stanford Bunny',
    route: '/bunny',
    camera: {
      position: [0.92, 0.56, 1.62],
      target: [0, 0.12, 0],
      fov: 34,
      near: 0.01,
      far: 18,
    },
  },
} as const satisfies Record<string, SceneFixture>

export type ParitySceneKey = keyof typeof PARITY_SCENES
