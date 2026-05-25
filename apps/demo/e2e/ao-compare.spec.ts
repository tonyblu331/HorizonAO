import { expect, test } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { PARITY_SCENES } from '../src/parityScenes'

const AO_MODES = ['off', 'gtao', 'ssao', 'vbao', 'n8ao'] as const

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

for (const fixture of Object.values(PARITY_SCENES)) {
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
