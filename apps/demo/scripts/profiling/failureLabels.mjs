export const AO_FAILURE_LABELS = [
  'none',
  'noise',
  'mud',
  'halo',
  'thin-gap',
  'edge-bleed',
  'scale-mismatch',
  'false-curvature',
]

export function classifyFailureLabels(row) {
  if (row.mode !== 'vbao') return ['none']
  if (row.fullResolutionVbao === false) return ['noise', 'false-curvature', 'scale-mismatch']

  const labels = new Set(['noise'])
  const contract = row.productOutputContract ?? ''
  const legacyDenoisedMode =
    row.denoise === true &&
    ((contract.length > 0 && !contract.includes('final product AO')) ||
      row.vbaoFilter !== undefined ||
      row.vbaoDenoiseFilter !== undefined)

  if (legacyDenoisedMode) {
    labels.add('mud')
    labels.add('thin-gap')
    labels.add('edge-bleed')
    return [...labels]
  }

  if (row.denoise === false || row.fullResolutionVbao === true) return ['noise', 'edge-bleed']
  return [...labels]
}
