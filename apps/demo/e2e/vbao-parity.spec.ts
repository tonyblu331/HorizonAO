import { expect, test } from '@playwright/test'
import type { VbaoParityResult } from '../src/scenes/VbaoParityPage'

const webGpuParityEnabled = process.env.E2E_WEBGPU_PARITY === '1'

async function waitForParityReady(page: import('@playwright/test').Page): Promise<void> {
  const status = page.getByTestId('parity-status')
  await expect(status).toHaveAttribute('data-state', /^(ready|error)$/, { timeout: 30_000 })

  const state = await status.getAttribute('data-state')
  if (state === 'ready') return

  const errMsg = await page.evaluate(() => window.__vbaoParityError ?? 'unknown error')
  const progress = await page.evaluate(() => window.__vbaoParityProgress ?? 'unknown progress')
  throw new Error(`VbaoParityPage reported error: ${errMsg}; progress=${progress}`)
}

test.describe('VBAO validation scaffold', () => {
  test.skip(!webGpuParityEnabled, 'Set E2E_WEBGPU_PARITY=1 to run the VBAO validation route smoke tests')

  test('loads and explicitly marks placeholder output as non-evidence', async ({ page }) => {
    await page.goto('/vbao-parity')
    await waitForParityReady(page)

    const result = await page.evaluate((): VbaoParityResult | undefined => window.__vbaoParity)
    expect(result).toBeDefined()
    expect(result!.status).toBe('non-evidence-placeholder')
    expect(result!.evidence).toBe(false)
    expect(result!.reason).toContain('not committed evidence')
  })

  test('lists the modern GT-VBAO++ validation scene set and metrics', async ({ page }) => {
    await page.goto('/vbao-parity')
    await waitForParityReady(page)

    const result = await page.evaluate((): VbaoParityResult | undefined => window.__vbaoParity)
    expect(result).toBeDefined()
    test.skip(
      result!.status === 'non-evidence-placeholder',
      'Placeholder parity rows are scaffold-only and must not gate GPU/readback evidence.',
    )
    expect(result!.metrics.map((row) => row.sceneId)).toEqual([
      'flat-plane',
      'sphere-contact-on-plane',
      'thin-pole-fence',
      'grazing-wall',
      'depth-edge',
      'screen-edge',
      'large-open-view',
      'normal-mismatch',
    ])

    for (const row of result!.metrics) {
      expect(Number.isFinite(row.edgeLeakage)).toBe(true)
      expect(Number.isFinite(row.thinOccluderHalo)).toBe(true)
      expect(Number.isFinite(row.staticStability)).toBe(true)
      expect(Number.isFinite(row.cameraMotionShimmer)).toBe(true)
    }
  })

  test('keeps placeholder pixels finite and bounded', async ({ page }) => {
    await page.goto('/vbao-parity')
    await waitForParityReady(page)

    const result = await page.evaluate((): VbaoParityResult | undefined => window.__vbaoParity)
    expect(result).toBeDefined()
    test.skip(
      result!.status === 'non-evidence-placeholder',
      'Placeholder pixels are synthetic and must not be treated as GPU parity/readback evidence.',
    )

    const pixels = result!.fixturePixels['flat-plane']
    expect(pixels).toBeDefined()
    expect(pixels!.length).toBe(result!.width * result!.height)

    for (const value of pixels!) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})
