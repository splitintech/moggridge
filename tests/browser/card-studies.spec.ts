import { test, expect } from '@playwright/test';

test('original specimens share expansion, slide boundaries, reversal and focus restoration', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Card studies', exact: true }).click();
  for (const kind of ['listing', 'button', 'pill']) {
    const trigger = page.getByRole('button', { name: `Open ${kind} study`, exact: true });
    await trigger.scrollIntoViewIfNeeded();
    const source = await trigger.boundingBox();
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: `${kind} study`, exact: true });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.locator('img').first().evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(dialog.getByRole('button', { name: 'Previous slide' })).toBeDisabled();
    const next = dialog.getByRole('button', { name: 'Next slide' });
    await next.click(); await next.click();
    await expect(next).toBeDisabled();
    const track = dialog.getByTestId('card-study-track');
    await expect.poll(() => track.evaluate(el => {
      const transform = new DOMMatrix(getComputedStyle(el).transform);
      return Math.abs(transform.m41 / el.getBoundingClientRect().width + 2);
    })).toBeLessThan(0.002);
    await dialog.getByRole('button', { name: 'Previous slide' }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => track.evaluate(el => {
      const transform = new DOMMatrix(getComputedStyle(el).transform);
      return Math.abs(transform.m41 / el.getBoundingClientRect().width + 1);
    })).toBeLessThan(0.002);
    await expect.poll(() => dialog.locator('img').first().evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBe(1);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    const returned = await trigger.boundingBox();
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(returned![key]).toBeCloseTo(source![key], 1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  expect(errors).toEqual([]);
});
