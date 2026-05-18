import { expect, test, type Page } from '@playwright/test'
import { inflateSync } from 'node:zlib'
import { PARITY_SCENES } from '../src/parityScenes'

const routes = Object.values(PARITY_SCENES)
interface RgbaImage {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array<ArrayBufferLike>
}

interface DebugPixelStats {
  readonly sampledPixels: number
  readonly nonGrayRatio: number
  readonly lumaStdDev: number
}

for (const fixture of routes) {
  test(`initializes a visible canvas on ${fixture.route}`, async ({ page }) => {
    await page.goto(fixture.route)

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    await page.waitForTimeout(750)

    const initialized = await canvas.evaluate((node) => {
      const canvasElement = node as HTMLCanvasElement
      const context = canvasElement.getContext('2d')
      const hasSize = canvasElement.width > 0 && canvasElement.height > 0

      if (context) {
        const { width, height } = canvasElement
        const sampleWidth = Math.min(width, 64)
        const sampleHeight = Math.min(height, 64)
        const x = Math.max(0, Math.floor((width - sampleWidth) / 2))
        const y = Math.max(0, Math.floor((height - sampleHeight) / 2))
        const pixels = context.getImageData(x, y, sampleWidth, sampleHeight).data
        return (
          hasSize &&
          (Array.from(pixels).some((value) => value !== 0) || canvasElement.clientWidth > 0)
        )
      }

      return hasSize
    })

    expect(initialized).toBe(true)
  })

  test(`exposes parity harness metadata on ${fixture.route}`, async ({ page }) => {
    await page.goto(fixture.route)

    const panel = page.getByLabel('Parity harness')
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('data-scene', fixture.key)
    await expect(panel).toHaveAttribute('data-baseline', 'scene-only')
    await expect(panel).toHaveAttribute('data-debug-view', 'none')
    await expect(panel).toHaveAttribute('data-render-backend', /^(webgpu|webgl-fallback|unknown)$/)
    await expect(panel).toHaveAttribute('data-resolution', /\d+x\d+/)
    await expect(panel).toHaveAttribute('data-dpr', /\d+\.\d{2}/)
    await expect(panel).toHaveAttribute(
      'data-artifact',
      new RegExp(`^${fixture.key}__scene-only__none__`),
    )
    await expect(panel).toHaveAttribute('data-gpu-timing', 'unavailable')
    await expect(panel).toHaveAttribute('data-gpu-timing-source', 'not-measured')

    await page.getByLabel('AO baseline').selectOption('three-gtao-node')
    await expect(panel).toHaveAttribute('data-baseline-status', 'available')

    await page.getByLabel('AO baseline').selectOption('horizonao-raw')
    await expect(panel).toHaveAttribute('data-baseline-status', 'available')

    await page.getByLabel('AO baseline').selectOption('n8ao-webgpu')
    await expect(panel).toHaveAttribute('data-baseline-status', 'unverified')

    await page.getByLabel('AO debug view').selectOption('edge-confidence')
    await expect(panel).toHaveAttribute('data-debug-view', 'edge-confidence')
    await expect(panel).toHaveAttribute('data-debug-view-status', 'metadata-only')

    await page.getByLabel('AO debug view').selectOption('normal')
    await expect(panel).toHaveAttribute('data-debug-view', 'normal')
    await expect(panel).toHaveAttribute('data-debug-view-status', 'rendered')
  })

  test(`captures a parity screenshot artifact on ${fixture.route}`, async ({ page }, testInfo) => {
    await page.goto(fixture.route)

    const panel = page.getByLabel('Parity harness')
    await expect(panel).toBeVisible()

    const artifactName = await panel.getAttribute('data-artifact')
    expect(artifactName).toBeTruthy()

    await expect(page.locator('canvas').first()).toBeVisible()
    await page.waitForTimeout(750)
    const screenshot = await page.locator('canvas').first().screenshot()
    await testInfo.attach(artifactName ?? `${fixture.key}.png`, {
      body: screenshot,
      contentType: 'image/png',
    })

    const metadata = await panel.evaluate((node) => {
      const element = node as HTMLElement
      return {
        scene: element.dataset.scene,
        baseline: element.dataset.baseline,
        baselineStatus: element.dataset.baselineStatus,
        debugView: element.dataset.debugView,
        debugViewStatus: element.dataset.debugViewStatus,
        renderBackend: element.dataset.renderBackend,
        resolution: element.dataset.resolution,
        dpr: element.dataset.dpr,
        gpuTiming: element.dataset.gpuTiming,
        gpuTimingSource: element.dataset.gpuTimingSource,
        gpuTimingMs: element.dataset.gpuTimingMs,
      }
    })

    await testInfo.attach(`${fixture.key}__metadata.json`, {
      body: JSON.stringify(metadata, null, 2),
      contentType: 'application/json',
    })
  })

  test(`captures the Three GTAONode baseline on ${fixture.route}`, async ({ page }, testInfo) => {
    const pageErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto(fixture.route)

    const panel = page.getByLabel('Parity harness')
    await expect(panel).toBeVisible()
    await page.getByLabel('AO baseline').selectOption('three-gtao-node')
    await expect(panel).toHaveAttribute('data-baseline', 'three-gtao-node')
    await expect(panel).toHaveAttribute('data-baseline-status', 'available')
    await page.getByLabel('AO debug view').selectOption('raw-ao')
    await expect(panel).toHaveAttribute('data-debug-view-status', 'rendered')
    await expect
      .poll(async () => panel.getAttribute('data-gpu-timing'), { timeout: 10_000 })
      .toMatch(/^(captured|unsupported)$/)
    const artifactName = await panel.getAttribute('data-artifact')
    expect(artifactName).toBeTruthy()

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    await page.waitForTimeout(750)

    const hasPixels = await canvas.evaluate((node) => {
      const canvasElement = node as HTMLCanvasElement
      return canvasElement.width > 0 && canvasElement.height > 0
    })

    expect(hasPixels).toBe(true)
    expect(pageErrors).toEqual([])

    const screenshot = await canvas.screenshot()
    await testInfo.attach(artifactName ?? `${fixture.key}__three-gtao-node.png`, {
      body: screenshot,
      contentType: 'image/png',
    })

    const metadata = await panel.evaluate((node) => {
      const element = node as HTMLElement
      return {
        scene: element.dataset.scene,
        baseline: element.dataset.baseline,
        baselineStatus: element.dataset.baselineStatus,
        debugView: element.dataset.debugView,
        debugViewStatus: element.dataset.debugViewStatus,
        renderBackend: element.dataset.renderBackend,
        resolution: element.dataset.resolution,
        dpr: element.dataset.dpr,
        gpuTiming: element.dataset.gpuTiming,
        gpuTimingSource: element.dataset.gpuTimingSource,
        gpuTimingMs: element.dataset.gpuTimingMs,
      }
    })

    await testInfo.attach(`${fixture.key}__three-gtao-node__metadata.json`, {
      body: JSON.stringify(metadata, null, 2),
      contentType: 'application/json',
    })
  })

  test(`captures the HorizonAO raw baseline on ${fixture.route}`, async ({ page }, testInfo) => {
    const pageProblems = collectPageProblems(page)

    await page.goto(fixture.route)

    const panel = page.getByLabel('Parity harness')
    await expect(panel).toBeVisible()
    await page.getByLabel('AO baseline').selectOption('horizonao-raw')
    await expect(panel).toHaveAttribute('data-baseline', 'horizonao-raw')
    await expect(panel).toHaveAttribute('data-baseline-status', 'available')
    await page.getByLabel('AO debug view').selectOption('raw-ao')
    await expect(panel).toHaveAttribute('data-debug-view-status', 'rendered')
    await expect
      .poll(async () => panel.getAttribute('data-gpu-timing'), { timeout: 10_000 })
      .toMatch(/^(captured|unsupported)$/)
    const artifactName = await panel.getAttribute('data-artifact')
    expect(artifactName).toBeTruthy()

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    await page.waitForTimeout(750)

    const hasPixels = await canvas.evaluate((node) => {
      const canvasElement = node as HTMLCanvasElement
      return canvasElement.width > 0 && canvasElement.height > 0
    })

    expect(hasPixels).toBe(true)
    expect(pageProblems).toEqual([])

    const screenshot = await canvas.screenshot()
    await testInfo.attach(artifactName ?? `${fixture.key}__horizonao-raw.png`, {
      body: screenshot,
      contentType: 'image/png',
    })

    const metadata = await panel.evaluate((node) => {
      const element = node as HTMLElement
      return {
        scene: element.dataset.scene,
        baseline: element.dataset.baseline,
        baselineStatus: element.dataset.baselineStatus,
        debugView: element.dataset.debugView,
        debugViewStatus: element.dataset.debugViewStatus,
        renderBackend: element.dataset.renderBackend,
        resolution: element.dataset.resolution,
        dpr: element.dataset.dpr,
        gpuTiming: element.dataset.gpuTiming,
        gpuTimingSource: element.dataset.gpuTimingSource,
        gpuTimingMs: element.dataset.gpuTimingMs,
      }
    })

    await testInfo.attach(`${fixture.key}__horizonao-raw__metadata.json`, {
      body: JSON.stringify(metadata, null, 2),
      contentType: 'application/json',
    })

    await page.getByLabel('AO debug view').selectOption('denoised-ao')
    await expect(panel).toHaveAttribute('data-debug-view', 'denoised-ao')
    await expect(panel).toHaveAttribute('data-debug-view-status', 'rendered')
    await expect(panel).toHaveAttribute(
      'data-artifact',
      new RegExp(`^${fixture.key}__horizonao-raw__denoised-ao__`),
    )
  })
}

test('renders scalar HorizonAO debug views on the grid scene', async ({ page }) => {
  const pageProblems = collectPageProblems(page)

  await page.goto(PARITY_SCENES.grid.route)

  const panel = page.getByLabel('Parity harness')
  const canvas = page.locator('canvas').first()
  await expect(panel).toBeVisible()
  await expect(canvas).toBeVisible()
  await page.getByLabel('AO baseline').selectOption('horizonao-raw')
  await expect(panel).toHaveAttribute('data-baseline', 'horizonao-raw')

  for (const debugView of ['raw-ao', 'denoised-ao'] as const) {
    await page.getByLabel('AO debug view').selectOption(debugView)
    await expect(panel).toHaveAttribute('data-debug-view', debugView)
    await expect(panel).toHaveAttribute('data-debug-view-status', 'rendered')
    await expect(panel).toHaveAttribute(
      'data-artifact',
      new RegExp(`^grid__horizonao-raw__${debugView}__`),
    )
    await page.waitForTimeout(750)

    const hasPixels = await canvas.evaluate((node) => {
      const canvasElement = node as HTMLCanvasElement
      return canvasElement.width > 0 && canvasElement.height > 0
    })

    expect(hasPixels).toBe(true)

    const stats = getAoDebugPixelStats(await canvas.screenshot())

    expect(stats.sampledPixels).toBeGreaterThan(1_000)
    expect(stats.nonGrayRatio).toBeLessThan(0.02)
    expect(stats.lumaStdDev).toBeGreaterThan(0.25)
  }

  expect(pageProblems).toEqual([])
})

function collectPageProblems(page: Page): string[] {
  const problems: string[] = []

  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' || /feedback loop|INVALID_OPERATION/i.test(text)) {
      problems.push(text)
    }
  })
  page.on('pageerror', (error) => problems.push(error.message))

  return problems
}

function getAoDebugPixelStats(pngBuffer: Buffer): DebugPixelStats {
  const image = decodePngRgba(pngBuffer)
  const crop = {
    x0: Math.floor(image.width * 0.3),
    x1: Math.floor(image.width * 0.7),
    y0: Math.floor(image.height * 0.24),
    y1: Math.floor(image.height * 0.68),
  }
  const lumas: number[] = []
  let sampledPixels = 0
  let nonGrayPixels = 0

  for (let y = crop.y0; y < crop.y1; y += 4) {
    for (let x = crop.x0; x < crop.x1; x += 4) {
      const offset = (y * image.width + x) * 4
      const r = byteAt(image.data, offset)
      const g = byteAt(image.data, offset + 1)
      const b = byteAt(image.data, offset + 2)
      const maxChannelDelta = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))

      if (maxChannelDelta > 4) nonGrayPixels += 1
      lumas.push(0.2126 * r + 0.7152 * g + 0.0722 * b)
      sampledPixels += 1
    }
  }

  const mean = lumas.reduce((sum, value) => sum + value, 0) / Math.max(1, lumas.length)
  const variance =
    lumas.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, lumas.length)

  return {
    sampledPixels,
    nonGrayRatio: nonGrayPixels / Math.max(1, sampledPixels),
    lumaStdDev: Math.sqrt(variance),
  }
}

function decodePngRgba(buffer: Buffer): RgbaImage {
  const signature = buffer.subarray(0, 8)
  if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('Unsupported screenshot format: expected PNG')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks: Buffer[] = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = byteAt(data, 8)
      colorType = byteAt(data, 9)
    } else if (type === 'IDAT') {
      idatChunks.push(data)
    } else if (type === 'IEND') {
      break
    }

    offset += length + 12
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`)
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3
  const stride = width * bytesPerPixel
  const inflated = inflateSync(Buffer.concat(idatChunks))
  const rgba = new Uint8Array(width * height * 4)
  let sourceOffset = 0
  let previousRow: Uint8Array<ArrayBufferLike> = new Uint8Array(stride)

  for (let y = 0; y < height; y += 1) {
    const filter = byteAt(inflated, sourceOffset)
    sourceOffset += 1
    const encodedRow = inflated.subarray(sourceOffset, sourceOffset + stride)
    sourceOffset += stride
    const row = unfilterPngRow(encodedRow, previousRow, bytesPerPixel, filter)

    for (let x = 0; x < width; x += 1) {
      const source = x * bytesPerPixel
      const target = (y * width + x) * 4
      rgba[target] = byteAt(row, source)
      rgba[target + 1] = byteAt(row, source + 1)
      rgba[target + 2] = byteAt(row, source + 2)
      rgba[target + 3] = colorType === 6 ? byteAt(row, source + 3) : 255
    }

    previousRow = row
  }

  return { width, height, data: rgba }
}

function unfilterPngRow(
  encoded: Uint8Array<ArrayBufferLike>,
  previous: Uint8Array<ArrayBufferLike>,
  bytesPerPixel: number,
  filter: number,
): Uint8Array<ArrayBufferLike> {
  const row = new Uint8Array(encoded.length)

  for (let index = 0; index < encoded.length; index += 1) {
    const left = index >= bytesPerPixel ? byteAt(row, index - bytesPerPixel) : 0
    const up = byteAt(previous, index)
    const upperLeft = index >= bytesPerPixel ? byteAt(previous, index - bytesPerPixel) : 0
    let predictor = 0

    if (filter === 1) predictor = left
    else if (filter === 2) predictor = up
    else if (filter === 3) predictor = Math.floor((left + up) / 2)
    else if (filter === 4) predictor = paeth(left, up, upperLeft)
    else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`)

    row[index] = (byteAt(encoded, index) + predictor) & 0xff
  }

  return row
}

function byteAt(bytes: Uint8Array<ArrayBufferLike>, index: number): number {
  const value = bytes[index]
  if (value === undefined) throw new Error(`PNG byte index out of bounds: ${index}`)
  return value
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft
  const leftDistance = Math.abs(estimate - left)
  const upDistance = Math.abs(estimate - up)
  const upperLeftDistance = Math.abs(estimate - upperLeft)

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left
  if (upDistance <= upperLeftDistance) return up
  return upperLeft
}
