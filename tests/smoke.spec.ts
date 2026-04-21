import { expect, test, devices } from '@playwright/test'

test('quick mode hero chips navigate to useful sections', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Дроби' }).click()
  await expect(page.locator('#quick-panel .focus-size')).toHaveText('1/2 банка')

  const input = page.getByRole('textbox', { name: 'Bet size percent' })
  const slider = page.getByRole('slider', { name: 'Bet size slider' })

  await input.click()
  await input.fill('140')
  await slider.evaluate((element) => {
    const range = element as HTMLInputElement
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setValue?.call(range, '100')
    range.dispatchEvent(new Event('input', { bubbles: true }))
    range.dispatchEvent(new Event('change', { bubbles: true }))
  })

  await expect(input).toHaveValue('100')

  await page.getByRole('link', { name: 'К шпаргалке' }).click()

  await expect(page).toHaveURL(/#quick-cheatsheet$/)
  await expect(page.locator('#quick-cheatsheet')).toBeVisible()
})

test('igor mode mobile layout stays narrow and hero actions are useful', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await context.newPage()

  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Дроби' }).click()
  await page.getByRole('tab', { name: 'Режим Игоря' }).click()
  await page.getByRole('button', { name: 'Пот как в клиенте' }).click()

  await expect(page.getByText('Спот в формате клиента')).toBeVisible()
  await expect(page.getByText('Банк в клиенте')).toBeVisible()
  await expect(page.locator('#igor-panel .focus-metrics strong').nth(2)).toHaveText('4/5 банка')

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(layout.scrollWidth).toBe(layout.clientWidth)
  expect(consoleErrors).toEqual([])

  await context.close()
})
