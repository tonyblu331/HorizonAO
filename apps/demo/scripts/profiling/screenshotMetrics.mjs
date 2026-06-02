import { readFile } from 'node:fs/promises'

export async function analyzeScreenshotQuality(page, screenshotPath) {
  const base64 = await readFile(screenshotPath, 'base64')

  return page.evaluate(async (imageBase64) => {
    const image = new Image()
    image.decoding = 'async'
    image.src = `data:image/png;base64,${imageBase64}`
    await image.decode()

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context === null) throw new Error('2D canvas is unavailable for AO image metrics')

    context.drawImage(image, 0, 0)

    // Crop away fixed demo chrome and the bottom-right controls. The metrics are
    // intended to catch AO image patterning, not navbar/UI pixels.
    const crop = {
      x0: Math.floor(canvas.width * 0.04),
      y0: Math.floor(canvas.height * 0.12),
      x1: Math.floor(canvas.width * 0.82),
      y1: Math.floor(canvas.height * 0.86),
    }
    const width = Math.max(1, crop.x1 - crop.x0)
    const height = Math.max(1, crop.y1 - crop.y0)
    const pixels = context.getImageData(crop.x0, crop.y0, width, height).data
    const luma = new Float32Array(width * height)

    let sum = 0
    for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
      const value = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255
      luma[i] = value
      sum += value
    }

    const meanLuma = sum / luma.length
    let variance = 0
    for (const value of luma) variance += (value - meanLuma) ** 2
    const stdLuma = Math.sqrt(variance / luma.length)

    // Cross high-pass: cheap and deterministic. It suppresses slow scene
    // gradients while preserving visible sampling bands, dither, and striping.
    const residual = new Float32Array(luma.length)
    const radius = 4
    let residualEnergy = 0
    let residualCount = 0
    let dxSum = 0
    let dySum = 0
    let diffCount = 0
    let thinGapSignal = 0
    let thinGapCount = 0
    let edgeBleedSignal = 0
    let edgeBleedCount = 0

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const index = y * width + x
        const crossAverage =
          (luma[index - radius] +
            luma[index + radius] +
            luma[index - radius * width] +
            luma[index + radius * width]) *
          0.25
        const value = luma[index] - crossAverage
        residual[index] = value
        residualEnergy += value * value
        residualCount++
        dxSum += Math.abs(luma[index] - luma[index - 1])
        dySum += Math.abs(luma[index] - luma[index - width])
        diffCount++

        const horizontalGap = Math.max(0, luma[index] - (luma[index - 2] + luma[index + 2]) * 0.5)
        const verticalGap = Math.max(
          0,
          luma[index] - (luma[index - 2 * width] + luma[index + 2 * width]) * 0.5,
        )
        thinGapSignal += Math.max(horizontalGap, verticalGap)
        thinGapCount++

        const nearContrast =
          Math.abs(luma[index + 1] - luma[index - 1]) +
          Math.abs(luma[index + width] - luma[index - width])
        const farContrast =
          Math.abs(luma[index + radius] - luma[index - radius]) +
          Math.abs(luma[index + radius * width] - luma[index - radius * width])
        edgeBleedSignal += Math.max(0, farContrast - nearContrast)
        edgeBleedCount++
      }
    }

    const patternNoiseScore = Math.sqrt(residualEnergy / Math.max(1, residualCount))
    const rowMeans = []
    const colMeans = []

    for (let y = radius; y < height - radius; y++) {
      let rowSum = 0
      let count = 0
      for (let x = radius; x < width - radius; x++) {
        rowSum += residual[y * width + x]
        count++
      }
      rowMeans.push(rowSum / Math.max(1, count))
    }

    for (let x = radius; x < width - radius; x++) {
      let colSum = 0
      let count = 0
      for (let y = radius; y < height - radius; y++) {
        colSum += residual[y * width + x]
        count++
      }
      colMeans.push(colSum / Math.max(1, count))
    }

    const std = (values) => {
      const mean = values.reduce((total, value) => total + value, 0) / Math.max(1, values.length)
      return Math.sqrt(
        values.reduce((total, value) => total + (value - mean) ** 2, 0) /
          Math.max(1, values.length),
      )
    }

    const horizontalStripeScore = std(rowMeans) / Math.max(patternNoiseScore, 1e-6)
    const verticalStripeScore = std(colMeans) / Math.max(patternNoiseScore, 1e-6)
    const stripeScore = Math.max(horizontalStripeScore, verticalStripeScore)
    const meanAbsDx = dxSum / Math.max(1, diffCount)
    const meanAbsDy = dySum / Math.max(1, diffCount)
    const directionalAnisotropy =
      Math.abs(meanAbsDx - meanAbsDy) / Math.max(meanAbsDx + meanAbsDy, 1e-6)
    const thinGapPreservationProxy = thinGapSignal / Math.max(1, thinGapCount)
    const edgeBleedProxy = edgeBleedSignal / Math.max(1, edgeBleedCount)

    return {
      crop,
      meanLuma,
      stdLuma,
      patternNoiseScore,
      stripeScore,
      horizontalStripeScore,
      verticalStripeScore,
      directionalAnisotropy,
      edgeBleedProxy,
      thinGapPreservationProxy,
      meanAbsDx,
      meanAbsDy,
      basis:
        'Cropped screenshot luma; patternNoiseScore is cross-high-pass RMS, stripeScore is row/column residual coherence normalized by high-pass RMS, edgeBleedProxy is broad contrast beyond local edges, and thinGapPreservationProxy is narrow bright-line contrast.',
    }
  }, base64)
}
