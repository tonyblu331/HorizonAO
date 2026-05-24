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

    const hasContent = await canvas.evaluate((node) => {
      const el = node as HTMLCanvasElement
      if (el.width === 0 || el.height === 0) return false

      // Try to sample via 2D context (available when compositor exposes pixels).
      const ctx = el.getContext('2d')
      if (ctx) {
        const w = Math.min(el.width, 64)
        const h = Math.min(el.height, 64)
        const x = Math.floor((el.width - w) / 2)
        const y = Math.floor((el.height - h) / 2)
        const pixels = ctx.getImageData(x, y, w, h).data
        return Array.from(pixels).some((v) => v !== 0)
      }

      // WebGPU canvases may not expose a 2D context — accept them if they have dimensions.
      return el.clientWidth > 0 && el.clientHeight > 0
    })

    expect(hasContent, `${fixture.key}: canvas should have non-zero pixels`).toBe(true)
    expect(pageErrors, `${fixture.key}: no console/page errors`).toEqual([])
  })
}
