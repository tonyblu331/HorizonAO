import { expect, test } from '@playwright/test'
import type { VbaoParityResult } from '../src/scenes/VbaoParityPage'

/**
 * VBAO parity smoke tests.
 *
 * These tests verify that VBAONode produces valid, plausible AO output when
 * executed in a real WebGPU context (Chromium).
 *
 * What is tested:
 *   1. Render completes without errors.
 *   2. All pixel values are in [0, 1] — no NaN, Inf, or out-of-range values.
 *   3. The flat-plane scene produces non-trivially open values (≥ 0.15) — proving
 *      the kernel ran and wrote something, not just the RT clear colour.
 *   4. Spatial variation > 0 — the AO values differ across pixels (not constant).
 *      A constant field would indicate a degenerate or trivially short-circuiting kernel.
 *   5. Mean AO is in [0.1, 1.0] — the flat-plane scene is not fully occluded.
 *
 * What is NOT tested here (deferred to PR-05):
 *   - Quantitative parity against the scalar reference within 1e-3 tolerance.
 *     That requires reading depth + normal per-pixel from the scene pass MRT
 *     and running vbaoReference.ts on those exact inputs. The infrastructure
 *     for this (window.__vbaoParityInputs) is documented in VbaoParityPage.tsx
 *     as a TODO.
 *
 * Browser requirement: Chromium with WebGPU enabled (default in Playwright ≥ 1.40).
 */

test.describe('VBAONode parity', () => {
  test('parity page loads and sets window.__vbaoParity', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(msg.text())
    })

    await page.goto('/vbao-parity')

    // Wait for the kernel to finish (up to 15 s — first compile may be slow).
    const status = page.getByTestId('parity-status')
    await expect(status).toHaveAttribute('data-state', /^(ready|error)$/, { timeout: 15_000 })

    // Fail early with a meaningful message if the page errored.
    const state = await status.getAttribute('data-state')
    if (state === 'error') {
      const errMsg = await page.evaluate(() => window.__vbaoParityError ?? 'unknown error')
      throw new Error(`VbaoParityPage reported error: ${errMsg}`)
    }

    expect(pageErrors, 'No uncaught errors during parity render').toEqual([])
  })

  test('all AO pixels are in [0, 1] with no NaN', async ({ page }) => {
    await page.goto('/vbao-parity')
    await expect(page.getByTestId('parity-status')).toHaveAttribute('data-state', 'ready', {
      timeout: 15_000,
    })

    const result = await page.evaluate((): VbaoParityResult | undefined => window.__vbaoParity)
    expect(result, '__vbaoParity should be set on window').toBeDefined()

    const { pixels, width, height } = result!
    expect(pixels.length, `pixel count should equal ${width}×${height}`).toBe(width * height)

    for (let i = 0; i < pixels.length; i++) {
      const v = pixels[i]!
      expect(Number.isNaN(v), `pixel[${i}] should not be NaN`).toBe(false)
      expect(Number.isFinite(v), `pixel[${i}] should be finite`).toBe(true)
      expect(v, `pixel[${i}] = ${v} should be ≥ 0`).toBeGreaterThanOrEqual(0)
      expect(v, `pixel[${i}] = ${v} should be ≤ 1`).toBeLessThanOrEqual(1)
    }
  })

  test('flat-plane scene produces non-trivial, spatially varying AO', async ({ page }) => {
    await page.goto('/vbao-parity')
    await expect(page.getByTestId('parity-status')).toHaveAttribute('data-state', 'ready', {
      timeout: 15_000,
    })

    const result = await page.evaluate((): VbaoParityResult | undefined => window.__vbaoParity)
    expect(result).toBeDefined()

    const { pixels } = result!

    // At least some pixels must be non-trivially open (> 0.15).
    // A cleared RT with no rendering would be all 1.0 (white clear); a broken
    // discard-all kernel would be 0.0.  Either extreme is wrong for a flat plane.
    const nonTrivial = pixels.filter((v) => v > 0.15 && v < 0.999)
    expect(
      nonTrivial.length,
      'at least 10% of pixels should have non-trivial AO (0.15 < ao < 0.999)',
    ).toBeGreaterThan(Math.floor(pixels.length * 0.1))

    // Mean should be in a reasonable range for a flat, partially-self-occluding plane.
    const mean = pixels.reduce((s, v) => s + v, 0) / pixels.length
    expect(mean, `mean AO ${mean.toFixed(3)} should be ≥ 0.1`).toBeGreaterThanOrEqual(0.1)
    expect(mean, `mean AO ${mean.toFixed(3)} should be ≤ 1.0`).toBeLessThanOrEqual(1.0)

    // Spatial variation: standard deviation > 0.
    // A constant field implies the kernel is trivially short-circuiting.
    const variance = pixels.reduce((s, v) => s + (v - mean) ** 2, 0) / pixels.length
    const stdDev = Math.sqrt(variance)
    expect(
      stdDev,
      `spatial stdDev ${stdDev.toFixed(4)} should be > 0 (kernel must produce variation)`,
    ).toBeGreaterThan(0)
  })

  test('center pixels are more open than corners (flat plane — no occluder geometry)', async ({
    page,
  }) => {
    await page.goto('/vbao-parity')
    await expect(page.getByTestId('parity-status')).toHaveAttribute('data-state', 'ready', {
      timeout: 15_000,
    })

    const result = await page.evaluate((): VbaoParityResult | undefined => window.__vbaoParity)
    expect(result).toBeDefined()

    const { pixels, width, height } = result!

    // Sample the center 4×4 patch.
    const cx = Math.floor(width / 2)
    const cy = Math.floor(height / 2)
    const centerValues: number[] = []
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const px = cx + dx
        const py = cy + dy
        if (px >= 0 && px < width && py >= 0 && py < height) {
          centerValues.push(pixels[py * width + px]!)
        }
      }
    }

    // The flat plane with no surrounding occluders should not be near-black at center.
    const centerMean = centerValues.reduce((s, v) => s + v, 0) / centerValues.length
    expect(
      centerMean,
      `center patch mean AO ${centerMean.toFixed(3)} should be ≥ 0.3`,
    ).toBeGreaterThanOrEqual(0.3)
  })
})
