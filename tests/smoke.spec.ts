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

test('all tabs stay scrollable and console-clean through the main flows', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/')

  await page.mouse.wheel(0, 1600)
  await page.mouse.wheel(0, -1600)

  await page.getByRole('tab', { name: 'Комбинаторика' }).click()
  await page.mouse.wheel(0, 1800)

  await page.getByRole('tab', { name: 'Режим Игоря' }).click()
  await page.mouse.wheel(0, 1800)

  await page.getByRole('button', { name: 'Advanced mode' }).click()
  await page.getByRole('tab', { name: 'Адвансд мод' }).click()
  await page.getByLabel('Пароль адвансд мода').fill('123')
  await page.getByRole('button', { name: 'Открыть адвансд' }).click()
  await page.mouse.wheel(0, 1800)

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
  expect(consoleErrors).toEqual([])
})

test('combinatorics mode exposes range grid and board analysis', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Комбинаторика' }).click()

  await expect(page.getByText('Комбинаторика, блокеры и разбор диапазона по борду.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Toggle AKs' })).toBeVisible()

  await page.getByRole('button', { name: 'Очистить', exact: true }).click()
  await page.getByRole('button', { name: 'TT+' }).click()

  await page.getByRole('button', { name: 'A♥', exact: true }).click()
  await page.getByRole('button', { name: 'K♦', exact: true }).click()
  await page.getByRole('button', { name: '7♣', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Готовые руки', exact: true })).toBeVisible()
  await expect(page.locator('#combinatorics-panel')).toContainText('Живые комбо')
})

test('advanced equity mode calculates deterministic river equity', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Advanced mode' }).click()
  await page.getByRole('tab', { name: 'Адвансд мод' }).click()
  await page.getByLabel('Пароль адвансд мода').fill('123')
  await page.getByRole('button', { name: 'Открыть адвансд' }).click()

  await page.getByRole('button', { name: 'Рука', exact: true }).nth(1).click()

  await page.getByRole('combobox', { name: 'Флоп 1' }).selectOption('2c')
  await page.getByRole('combobox', { name: 'Флоп 2' }).selectOption('3d')
  await page.getByRole('combobox', { name: 'Флоп 3' }).selectOption('4h')
  await page.getByRole('combobox', { name: 'Тёрн' }).selectOption('5s')
  await page.getByRole('combobox', { name: 'Ривер' }).selectOption('7c')
  await page.getByRole('button', { name: 'Пересчитать equity' }).click()

  await expect(page.locator('#equity-results')).toContainText('100%')
  await expect(page.locator('#equity-results')).toContainText('Точный')
})
