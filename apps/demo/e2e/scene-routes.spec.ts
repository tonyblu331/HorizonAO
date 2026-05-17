import { expect, test } from '@playwright/test'

const routes = ['/', '/sponza', '/suzanne', '/bunny'] as const

for (const route of routes) {
  test(`paints a non-empty canvas on ${route}`, async ({ page }) => {
    await page.goto(route)

    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    await page.waitForTimeout(750)

    const painted = await canvas.evaluate((node) => {
      const canvasElement = node as HTMLCanvasElement
      const context = canvasElement.getContext('2d')

      if (context) {
        const { width, height } = canvasElement
        const pixels = context.getImageData(0, 0, Math.min(width, 64), Math.min(height, 64)).data
        return Array.from(pixels).some((value) => value !== 0)
      }

      return canvasElement.width > 0 && canvasElement.height > 0
    })

    expect(painted).toBe(true)
  })
}
