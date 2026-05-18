import type { ParitySceneFixture } from '@horizonao/core'

export const PARITY_SCENES = {
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
} as const satisfies Record<string, ParitySceneFixture>

export type ParitySceneKey = keyof typeof PARITY_SCENES
