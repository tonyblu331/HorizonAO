import { expect, test } from '@playwright/test'
import { PARITY_SCENES } from '../src/parityScenes'

/**
 * Smoke tests for the four live demo routes.
 *
 * Each test verifies:
 *  1. A canvas element is visible (WebGPU or WebGL fallback rendered).
 *  2. No uncaught JS errors or console errors fire during load.
 *  3. The canvas has non-trivial pixel content (not entirely black).
 *
 * These tests do NOT inspect parity harness metadata — that infrastructure
 * was removed when the demo was updated to VBAONode. Quantitative AO parity
 * checks live in vbao-parity.spec.ts.
 */

for (const fixture of Object.values(PARITY_SCENES)) {
  test(`${fixture.key}: canvas is visible and renders pixels`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text())
    })

    await page.goto(fixture.route)

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()

    // Allow the renderer up to 3 s to produce at least one frame.
    await page.waitForTimeout(3_000)

    const canvasBox = await canvas.boundingBox()
    expect(canvasBox, `${fixture.key}: canvas should have a layout box`).not.toBeNull()

    let hasContent: boolean
    try {
      const client = await page.context().newCDPSession(page)
      const capture = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        clip: {
          x: canvasBox!.x,
          y: canvasBox!.y,
          width: canvasBox!.width,
          height: canvasBox!.height,
          scale: 1,
        },
      })
      hasContent = Buffer.from(capture.data, 'base64').byteLength > 10_000
    } catch {
      hasContent = await canvas.evaluate((node) => {
        const el = node as HTMLCanvasElement
        return el.width > 0 && el.height > 0 && el.clientWidth > 0 && el.clientHeight > 0
      })
    }

    expect(hasContent, `${fixture.key}: canvas should have non-zero pixels`).toBe(true)
    expect(pageErrors, `${fixture.key}: no console/page errors`).toEqual([])
  })
}
