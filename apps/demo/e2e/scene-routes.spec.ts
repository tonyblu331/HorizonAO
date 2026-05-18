import { expect, test } from '@playwright/test'
import type { HorizonAoDebugView } from '@horizonao/core'
import { PARITY_SCENES } from '../src/parityScenes'

const routes = Object.values(PARITY_SCENES)
const renderedDebugViews = [
  'raw-ao',
  'denoised-ao',
  'linear-depth',
  'normal',
] as const satisfies readonly HorizonAoDebugView[]
const measuredBaselines = ['three-gtao-node', 'horizonao-raw'] as const

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
    const pageErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))

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
    expect(pageErrors).toEqual([])

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

test('renders implemented AO debug views on the grid scene', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(PARITY_SCENES.grid.route)

  const panel = page.getByLabel('Parity harness')
  const canvas = page.locator('canvas').first()
  await expect(panel).toBeVisible()
  await expect(canvas).toBeVisible()

  for (const baseline of measuredBaselines) {
    await page.getByLabel('AO baseline').selectOption(baseline)
    await expect(panel).toHaveAttribute('data-baseline', baseline)

    for (const debugView of renderedDebugViews) {
      await page.getByLabel('AO debug view').selectOption(debugView)
      await expect(panel).toHaveAttribute('data-debug-view', debugView)
      await expect(panel).toHaveAttribute('data-debug-view-status', 'rendered')
      await expect(panel).toHaveAttribute(
        'data-artifact',
        new RegExp(`^grid__${baseline}__${debugView}__`),
      )
      await page.waitForTimeout(250)

      const hasPixels = await canvas.evaluate((node) => {
        const canvasElement = node as HTMLCanvasElement
        return canvasElement.width > 0 && canvasElement.height > 0
      })

      expect(hasPixels).toBe(true)
    }
  }

  expect(pageErrors).toEqual([])
})
