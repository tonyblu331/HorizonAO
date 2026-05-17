export interface ModelSource {
  readonly name: string
  readonly runtimeUrl: string
  readonly sourceUrl: string
  readonly license: string
  readonly credit: string
}

const khronosBase =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models'

export const modelSources = {
  sponza: {
    name: 'Sponza',
    runtimeUrl: `${khronosBase}/Sponza/glTF/Sponza.gltf`,
    sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Sponza',
    license: 'Cryengine Limited License Agreement, distributed by Khronos glTF Sample Assets',
    credit: 'Crytek, Alexandre Pestana, Morgan McGuire, Khronos Group',
  },
  suzanne: {
    name: 'Suzanne',
    runtimeUrl: `${khronosBase}/Suzanne/glTF/Suzanne.gltf`,
    sourceUrl: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Suzanne',
    license: 'CC0 1.0 Universal',
    credit: 'UX3D, Norbert Nopper, Khronos Group',
  },
  bunny: {
    name: 'Stanford Bunny',
    runtimeUrl: 'https://raw.githubusercontent.com/pmndrs/assets/main/src/models/bunny.glb',
    sourceUrl: 'https://graphics.stanford.edu/data/3Dscanrep/#bunny',
    license: 'Runtime GLB mirror: CC0 via pmndrs/assets. Original Stanford source requests attribution.',
    credit: 'Stanford Computer Graphics Laboratory; pmndrs/assets GLB mirror',
  },
} as const satisfies Record<string, ModelSource>
