/** Minimal scene fixture type for demo routes and evidence camera defaults. */
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
  lab: {
    key: 'lab',
    label: 'Sphere Lab',
    route: '/lab',
    camera: {
      position: [4.6, 2.8, 6.2],
      target: [0, 0.75, -0.35],
      fov: 44,
      near: 0.03,
      far: 60,
    },
  },
  museum: {
    key: 'museum',
    label: 'Museum',
    route: '/museum',
    camera: {
      position: [1, 3, 7],
      target: [0, 1.2, 0],
      fov: 45,
      near: 0.1,
      far: 50,
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
