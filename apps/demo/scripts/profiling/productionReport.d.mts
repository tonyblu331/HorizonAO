export const AO_FAILURE_LABELS: readonly [
  'none',
  'noise',
  'mud',
  'halo',
  'thin-gap',
  'edge-bleed',
  'scale-mismatch',
  'false-curvature',
]

export interface AOReportRowForFailureLabels {
  mode?: string
  fullResolutionVbao?: boolean
  denoise?: boolean
  productOutputContract?: string
  vbaoFilter?: unknown
  vbaoDenoiseFilter?: unknown
}

export function classifyFailureLabels(row: AOReportRowForFailureLabels): string[]

export function writeProductionQualityReports(args: {
  outputJson: string
  outputMd: string
  report: {
    generatedAt: string
    rows: Array<{
      mode: string
      denoise?: boolean
      vbaoResolution?: string
      view: string
      resolution: { width: number; height: number }
      qualityMetrics: {
        patternNoiseScore: number
        stripeScore: number
        horizontalStripeScore: number
        verticalStripeScore: number
        directionalAnisotropy: number
      }
    }>
  }
}): Promise<void>
