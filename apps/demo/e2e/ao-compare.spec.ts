import { expect, test, type Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { PARITY_SCENES } from '../src/parityScenes'

const AO_MODES = ['off', 'gtao', 'ssao', 'vbao', 'n8ao'] as const
const SPLIT_PIXEL_MODES = ['gtao', 'vbao', 'n8ao'] as const

test.setTimeout(90_000)

function byteDifferenceRatio(a: Buffer, b: Buffer): number {
  const len = Math.min(a.length, b.length)
  if (len === 0) return 0

  let different = Math.abs(a.length - b.length)
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) different++
  }

  return different / Math.max(a.length, b.length)
}

async function measureSegmentPixels(
  page: Page,
  png: Buffer,
  segmentCount: number,
): Promise<Array<{ index: number; meanLuma: number; nonBlackRatio: number }>> {
  return page.evaluate(
    async ({ base64, segmentCount: count }) => {
      const response = await fetch(`data:image/png;base64,${base64}`)
      const blob = await response.blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d')
      if (ctx === null) throw new Error('Could not create 2D context for screenshot analysis')
      ctx.drawImage(bitmap, 0, 0)

      const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const stats: Array<{ index: number; meanLuma: number; nonBlackRatio: number }> = []
      const sampleStride = 8

      for (let index = 0; index < count; index += 1) {
        const startX = Math.floor((index * canvas.width) / count)
        const endX = Math.floor(((index + 1) * canvas.width) / count)
        const insetX = Math.max(1, Math.floor((endX - startX) * 0.08))
        const insetY = Math.max(1, Math.floor(canvas.height * 0.08))
        let lumaTotal = 0
        let nonBlack = 0
        let samples = 0

        for (let y = insetY; y < canvas.height - insetY; y += sampleStride) {
          for (let x = startX + insetX; x < endX - insetX; x += sampleStride) {
            const offset = (y * image.width + x) * 4
            const r = image.data[offset] ?? 0
            const g = image.data[offset + 1] ?? 0
            const b = image.data[offset + 2] ?? 0
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
            lumaTotal += luma
            if (luma > 12) nonBlack += 1
            samples += 1
          }
        }

        stats.push({
          index,
          meanLuma: samples === 0 ? 0 : lumaTotal / samples,
          nonBlackRatio: samples === 0 ? 0 : nonBlack / samples,
        })
      }

      return stats
    },
    {
      base64: png.toString('base64'),
      segmentCount,
    },
  )
}

async function expectSplitSegmentsVisible(
  page: Page,
  modes: readonly (typeof SPLIT_PIXEL_MODES)[number][],
  options: { readonly viewMode: 'beauty' | 'ao'; readonly denoiseEnabled: boolean },
) {
  await page.locator('[data-compose-debug]').check()
  await page.locator('[data-compose-mode="ssao"]').uncheck()
  for (const mode of SPLIT_PIXEL_MODES) {
    const input = page.locator(`[data-compose-mode="${mode}"]`)
    if (modes.includes(mode)) await input.check()
    else await input.uncheck()
  }
  await page.locator(`[data-view="${options.viewMode}"]`).click()
  if (options.denoiseEnabled) await page.locator('[data-denoise]').check()
  else await page.locator('[data-denoise]').uncheck()
  await page.locator('[data-full-resolution]').check()

  await page.evaluate(() => window.__aoBenchmark?.reset())
  await page.waitForFunction(
    ({ expectedModes, viewMode, denoiseEnabled }) => {
      const latest = window.__aoBenchmark?.latest
      if (latest === undefined) return false
      return (
        latest.renderMode === 'compose' &&
        latest.viewMode === viewMode &&
        latest.denoiseEnabled === denoiseEnabled &&
        latest.composeModes.length === expectedModes.length &&
        expectedModes.every((mode) => latest.composeModes.includes(mode)) &&
        latest.reportIndex > 0
      )
    },
    {
      expectedModes: [...modes],
      viewMode: options.viewMode,
      denoiseEnabled: options.denoiseEnabled,
    },
  )

  const canvas = page.locator('canvas').first()
  const screenshot = await canvas.screenshot()
  const stats = await measureSegmentPixels(page, screenshot, modes.length)

  expect(stats, 'split pixel smoke should analyze one segment per selected algorithm').toHaveLength(
    modes.length,
  )
  for (const [index, mode] of modes.entries()) {
    const segment = stats[index]
    expect(segment, `${mode} split segment should have pixel statistics`).toBeDefined()
    if (segment === undefined) throw new Error(`${mode} split segment statistics missing`)
    expect(
      segment.meanLuma,
      `${mode} split segment should not render as a black/missing panel`,
    ).toBeGreaterThan(25)
    expect(
      segment.nonBlackRatio,
      `${mode} split segment should contain substantial non-black scene pixels`,
    ).toBeGreaterThan(0.2)
  }
}

for (const fixture of Object.values(PARITY_SCENES).filter((scene) => scene.key !== 'museum')) {
  test(`${fixture.key}: AO buttons fit and modes produce captures`, async ({ page }, testInfo) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text())
    })

    await page.goto(fixture.route)

    const panel = page.locator('.compare-panel')
    await expect(panel).toBeVisible({ timeout: 30_000 })

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()

    const panelBox = await panel.boundingBox()
    const viewport = page.viewportSize()
    expect(panelBox, `${fixture.key}: compare panel should have a layout box`).not.toBeNull()
    expect(viewport, `${fixture.key}: viewport should be available`).not.toBeNull()
    expect(panelBox!.x + panelBox!.width, `${fixture.key}: panel should fit viewport`).toBeLessThanOrEqual(
      viewport!.width,
    )

    const canvasBox = await canvas.boundingBox()
    expect(canvasBox, `${fixture.key}: canvas should have a layout box`).not.toBeNull()

    const backend = await page.locator('[data-renderer-backend]').first().getAttribute('data-renderer-backend')
    const client = await page.context().newCDPSession(page)

    if (backend !== 'webgpu') {
      await expect(page.locator('[data-ao="gtao"]')).toBeDisabled()
      await expect(page.locator('[data-ao="ssao"]')).toBeDisabled()
      await expect(page.locator('[data-ao="vbao"]')).toBeDisabled()
      await expect(page.locator('[data-ao="n8ao"]')).toBeDisabled()
      await expect(page.locator('[data-view="ao"]')).toBeDisabled()

      const path = testInfo.outputPath(`${fixture.key}-webgl-fallback.png`)
      const capture = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      })
      await writeFile(path, Buffer.from(capture.data, 'base64'))
      expect(pageErrors, `${fixture.key}: no console/page errors`).toEqual([])
      return
    }

    await page.locator('[data-view="ao"]').evaluate((node: HTMLElement) => node.click())
    await page.waitForTimeout(500)

    const capturePaths = new Map<(typeof AO_MODES)[number], string>()
    for (const mode of AO_MODES) {
      await page.locator(`[data-ao="${mode}"]`).evaluate((node: HTMLElement) => node.click())
      await page.waitForTimeout(600)

      const path = testInfo.outputPath(`${fixture.key}-${mode}-ao.png`)
      const capture = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      })
      await writeFile(path, Buffer.from(capture.data, 'base64'))
      capturePaths.set(mode, path)
    }

    const off = await readFile(capturePaths.get('off')!)
    for (const mode of AO_MODES.filter((m) => m !== 'off')) {
      const capture = await readFile(capturePaths.get(mode)!)
      const diff = byteDifferenceRatio(off, capture)
      expect(diff, `${fixture.key}: ${mode} AO capture should differ from Off`).toBeGreaterThan(0.005)
    }

    expect(pageErrors, `${fixture.key}: no console/page errors`).toEqual([])
  })
}

test('museum exposes evidence controls for raw, denoised, and full-resolution VBAO', async ({
  page,
}) => {
  await page.goto('/museum')

  const panel = page.locator('.benchmark-panel')
  await expect(panel).toBeVisible({ timeout: 30_000 })

  await expect(page.locator('[data-mode="vbao"]')).toBeVisible()
  await expect(page.locator('[data-view="beauty"]')).toBeVisible()
  await expect(page.locator('[data-view="ao"]')).toBeVisible()

  const denoise = page.locator('[data-denoise]')
  await expect(denoise).toBeVisible()

  const fullResolution = page.locator('[data-full-resolution]')
  await expect(fullResolution).toBeVisible()
  await expect(fullResolution).not.toBeChecked()

  const backend = await page.locator('[data-renderer-backend]').first().getAttribute('data-renderer-backend')
  if (backend !== 'webgpu') {
    await expect(denoise).toBeDisabled()
    await expect(fullResolution).toBeDisabled()
    return
  }

  await expect(denoise).toBeChecked()
  await fullResolution.check()
  await expect(fullResolution).toBeChecked()
})

test('museum publishes machine-readable benchmark snapshots for single and split modes', async ({
  page,
}) => {
  await page.goto('/museum')

  const panel = page.locator('.benchmark-panel')
  await expect(panel).toBeVisible({ timeout: 30_000 })

  const stats = page.locator('[data-stats]')
  await expect(stats).not.toContainText('-- fps', { timeout: 10_000 })

  await page.waitForFunction(() => window.__aoBenchmark?.latest !== undefined)
  const initial = await page.evaluate(() => window.__aoBenchmark?.latest)
  expect(initial).toMatchObject({
    scene: 'museum',
    viewMode: 'beauty',
    denoiseEnabled: true,
  })
  expect(initial?.fps).toBeGreaterThan(0)
  expect(initial?.avgFrameMs).toBeGreaterThan(0)
  expect(initial?.medianFrameMs).toBeGreaterThan(0)
  expect(initial?.p95FrameMs).toBeGreaterThan(0)
  expect(initial?.reportIndex).toBeGreaterThan(0)

  const composeToggle = page.locator('[data-compose-debug]')
  const backend = await page.locator('[data-renderer-backend]').first().getAttribute('data-renderer-backend')
  const initialSnapshot = await page.evaluate(() => window.__aoBenchmark?.snapshot())
  expect(initialSnapshot?.environment).toMatchObject({
    rendererBackend: initial?.rendererBackend,
    aoAvailable: backend === 'webgpu',
    requiredBackend: 'webgpu',
  })
  expect(typeof initialSnapshot?.environment.navigatorGpu).toBe('boolean')

  if (backend !== 'webgpu') {
    expect(initial?.rendererBackend).toBe('webgl')
    expect(initial?.vbaoSamplingSchedule).toBe('n/a')
    await expect(page.locator('[data-mode="vbao"]')).toBeDisabled()
    await expect(composeToggle).toBeDisabled()
    return
  }

  const initialReportIndex = initial!.reportIndex
  await page.evaluate(() => window.__aoBenchmark?.reset())
  const resetSnapshot = await page.evaluate(() => window.__aoBenchmark?.snapshot())
  expect(resetSnapshot?.latest).toBeUndefined()
  expect(resetSnapshot?.history).toEqual([])

  await composeToggle.uncheck()
  await page.locator('[data-mode="vbao"]').click()
  await page.waitForFunction(
    (previousReportIndex) =>
      window.__aoBenchmark?.latest?.renderMode === 'single' &&
      window.__aoBenchmark.latest.mode === 'vbao' &&
      window.__aoBenchmark.latest.reportIndex > previousReportIndex,
    initialReportIndex,
  )
  const single = await page.evaluate(() => window.__aoBenchmark?.latest)
  const singleSnapshot = await page.evaluate(() => window.__aoBenchmark?.snapshot())
  expect(single).toMatchObject({
    rendererBackend: 'webgpu',
    renderMode: 'single',
    mode: 'vbao',
    composeModes: [],
    vbaoSamplingSchedule: 'magic-square',
  })
  expect(single?.fps).toBeGreaterThan(0)
  expect(single?.reportIndex).toBeGreaterThan(initialReportIndex)
  expect(singleSnapshot?.history.length).toBeGreaterThan(0)

  await composeToggle.check()
  await page.locator('[data-compose-mode="gtao"]').check()
  await page.locator('[data-compose-mode="vbao"]').check()
  const singleReportIndex = single!.reportIndex
  await page.waitForFunction(
    (previousReportIndex) =>
      window.__aoBenchmark?.latest?.renderMode === 'compose' &&
      window.__aoBenchmark.latest.reportIndex > previousReportIndex &&
      window.__aoBenchmark.latest.composeModes.includes('gtao') &&
      window.__aoBenchmark.latest.composeModes.includes('vbao'),
    singleReportIndex,
  )
  const split = await page.evaluate(() => window.__aoBenchmark?.latest)
  expect(split).toMatchObject({
    rendererBackend: 'webgpu',
    renderMode: 'compose',
    mode: 'compose',
    vbaoSamplingSchedule: 'magic-square',
  })
  expect(split?.composeModes).toEqual(expect.arrayContaining(['gtao', 'vbao']))
  expect(split?.fps).toBeGreaterThan(0)
  expect(split?.reportIndex).toBeGreaterThan(singleReportIndex)

  await expect(page.locator('.split-labels span', { hasText: 'GTAO' })).toBeVisible()
  await expect(page.locator('.split-labels span', { hasText: 'VBAO' })).toBeVisible()
})

test('museum split composer renders visible pixels for every selected segment', async ({ page }) => {
  await page.goto('/museum')

  await expect(page.locator('.benchmark-panel')).toBeVisible({ timeout: 30_000 })
  const backend = await page.locator('[data-renderer-backend]').first().getAttribute('data-renderer-backend')
  test.skip(backend !== 'webgpu', 'split pixel smoke requires the WebGPU AO path')

  await expectSplitSegmentsVisible(page, SPLIT_PIXEL_MODES, {
    viewMode: 'beauty',
    denoiseEnabled: true,
  })
  await expectSplitSegmentsVisible(page, ['gtao', 'vbao'], {
    viewMode: 'ao',
    denoiseEnabled: false,
  })
})

test('museum exposes an internal high-sample VBAO benchmark preset', async ({ page }) => {
  await page.goto('/museum')

  await expect(page.locator('.benchmark-panel')).toBeVisible({ timeout: 30_000 })
  const backend = await page.locator('[data-renderer-backend]').first().getAttribute('data-renderer-backend')
  test.skip(backend !== 'webgpu', 'VBAO sample preset benchmark requires the WebGPU AO path')

  const presetChanged = await page.evaluate(() => {
    const benchmark = (
      window as unknown as {
        __aoBenchmark?: {
          readonly latest?: { readonly reportIndex: number }
          reset: () => void
          setVbaoSamplePreset?: (preset: 'baseline' | 'high-sample') => void
        }
      }
    ).__aoBenchmark
    if (benchmark?.setVbaoSamplePreset === undefined) return false
    benchmark.setVbaoSamplePreset('high-sample')
    benchmark.reset()
    return true
  })
  expect(presetChanged).toBe(true)

  await page.locator('[data-compose-debug]').uncheck()
  await page.locator('[data-mode="vbao"]').click()
  await page.locator('[data-view="ao"]').click()
  await page.locator('[data-denoise]').uncheck()
  await page.locator('[data-full-resolution]').check()
  await page.evaluate(() => window.__aoBenchmark?.reset())

  await page.waitForFunction(
    () =>
      window.__aoBenchmark?.latest?.mode === 'vbao' &&
      window.__aoBenchmark.latest.vbaoSamplePreset === 'high-sample' &&
      window.__aoBenchmark.latest.vbaoSamples === 16 &&
      window.__aoBenchmark.latest.vbaoSlices === 3 &&
      window.__aoBenchmark.latest.fullResolutionVbao === true &&
      window.__aoBenchmark.latest.reportIndex > 0,
  )

  const latest = await page.evaluate(() => window.__aoBenchmark?.latest)
  expect(latest).toMatchObject({
    renderMode: 'single',
    mode: 'vbao',
    viewMode: 'ao',
    denoiseEnabled: false,
    fullResolutionVbao: true,
    vbaoSamplePreset: 'high-sample',
    vbaoSamples: 16,
    vbaoSlices: 3,
  })
})

test('museum exposes internal VBAO sampling schedules for benchmark captures', async ({ page }) => {
  await page.goto('/museum')

  await expect(page.locator('.benchmark-panel')).toBeVisible({ timeout: 30_000 })
  const backend = await page.locator('[data-renderer-backend]').first().getAttribute('data-renderer-backend')
  test.skip(backend !== 'webgpu', 'VBAO sampling schedule benchmark requires the WebGPU AO path')

  const scheduleChanged = await page.evaluate(() => {
    const benchmark = (
      window as unknown as {
        __aoBenchmark?: {
          reset: () => void
          setVbaoSamplingSchedule?: (schedule: 'magic-square' | 'r2' | 'hilbert' | 'blue-noise') => void
        }
      }
    ).__aoBenchmark
    if (benchmark?.setVbaoSamplingSchedule === undefined) return false
    benchmark.setVbaoSamplingSchedule('r2')
    benchmark.reset()
    return true
  })
  expect(scheduleChanged).toBe(true)

  await page.locator('[data-compose-debug]').uncheck()
  await page.locator('[data-mode="vbao"]').click()
  await page.locator('[data-view="ao"]').click()
  await page.locator('[data-denoise]').uncheck()
  await page.locator('[data-full-resolution]').check()
  await page.evaluate(() => window.__aoBenchmark?.reset())

  await page.waitForFunction(
    () =>
      window.__aoBenchmark?.latest?.mode === 'vbao' &&
      window.__aoBenchmark.latest.vbaoSamplingSchedule === 'r2' &&
      window.__aoBenchmark.latest.fullResolutionVbao === true &&
      window.__aoBenchmark.latest.reportIndex > 0,
  )

  const latest = await page.evaluate(() => window.__aoBenchmark?.latest)
  expect(latest).toMatchObject({
    renderMode: 'single',
    mode: 'vbao',
    viewMode: 'ao',
    denoiseEnabled: false,
    fullResolutionVbao: true,
    vbaoSamplingSchedule: 'r2',
  })
})

test('museum exposes internal VBAO denoise filter candidates for benchmark captures', async ({
  page,
}) => {
  await page.goto('/museum')

  await expect(page.locator('.benchmark-panel')).toBeVisible({ timeout: 30_000 })
  const backend = await page.locator('[data-renderer-backend]').first().getAttribute('data-renderer-backend')
  test.skip(backend !== 'webgpu', 'VBAO denoise filter benchmark requires the WebGPU AO path')

  const filterChanged = await page.evaluate(() => {
    const benchmark = (
      window as unknown as {
        __aoBenchmark?: {
          reset: () => void
          setVbaoDenoiseFilter?: (filter: 'generic' | 'custom-bilateral') => void
        }
      }
    ).__aoBenchmark
    if (benchmark?.setVbaoDenoiseFilter === undefined) return false
    benchmark.setVbaoDenoiseFilter('custom-bilateral')
    benchmark.reset()
    return true
  })
  expect(filterChanged).toBe(true)

  await page.locator('[data-compose-debug]').uncheck()
  await page.locator('[data-mode="vbao"]').click()
  await page.locator('[data-view="ao"]').click()
  await page.locator('[data-denoise]').check()
  await page.locator('[data-full-resolution]').check()
  await page.evaluate(() => window.__aoBenchmark?.reset())

  await page.waitForFunction(
    () =>
      window.__aoBenchmark?.latest?.mode === 'vbao' &&
      window.__aoBenchmark.latest.denoiseEnabled === true &&
      window.__aoBenchmark.latest.vbaoDenoiseFilter === 'custom-bilateral' &&
      window.__aoBenchmark.latest.fullResolutionVbao === true &&
      window.__aoBenchmark.latest.reportIndex > 0,
  )

  const latest = await page.evaluate(() => window.__aoBenchmark?.latest)
  expect(latest).toMatchObject({
    renderMode: 'single',
    mode: 'vbao',
    viewMode: 'ao',
    denoiseEnabled: true,
    fullResolutionVbao: true,
    vbaoDenoiseFilter: 'custom-bilateral',
  })
})
