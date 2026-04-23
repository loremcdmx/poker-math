import { expect, test, type Page } from '@playwright/test'

type ScrollPerfMetrics = {
  avgFrameMs: number
  clientWidth: number
  contentVisibilityAuto: number
  contentVisibilityTargets: number
  frames: number
  longTaskCount: number
  longestLongTaskMs: number
  maxFrameMs: number
  nestedContentVisibilityAuto: number
  nestedContentVisibilityTargets: number
  over20: number
  over32: number
  p95FrameMs: number
  scrollWidth: number
  slowFrameRatio: number
}

async function unlockAdvancedMode(page: Page) {
  await page.getByRole('button', { name: 'Advanced mode' }).click()
  await page.getByRole('tab', { name: 'Адвансд мод' }).click()
  await page.getByLabel('Пароль адвансд мода').fill('123')
  await page.getByRole('button', { name: 'Открыть адвансд' }).click()
}

async function collectScrollPerf(
  page: Page,
  panelSelector: string,
): Promise<ScrollPerfMetrics> {
  return page.evaluate(async (selector) => {
    const panel = document.querySelector<HTMLElement>(selector)

    if (!panel) {
      throw new Error(`Panel ${selector} not found`)
    }

    const longTasks: number[] = []
    let observer: PerformanceObserver | null = null

    if (
      'PerformanceObserver' in window &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('longtask')
    ) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push(entry.duration)
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    }

    const visibleChildren = [...panel.children].filter((child) => {
      const element = child as HTMLElement
      return getComputedStyle(element).display !== 'none'
    })

    const contentVisibilityValues = visibleChildren.map((child) => {
      return getComputedStyle(child as HTMLElement).contentVisibility
    })
    const nestedVisibilitySelectors = [
      '.igor-stack > *',
      '.summary-grid > *',
      '.lesson-grid > *',
      '.advanced-layout > *',
      '.combo-guide-grid > *',
      '.combo-table-stack > *',
    ]
    const nestedVisibilityValues = nestedVisibilitySelectors.flatMap((nestedSelector) => {
      return [...panel.querySelectorAll<HTMLElement>(nestedSelector)]
        .filter((element) => getComputedStyle(element).display !== 'none')
        .map((element) => getComputedStyle(element).contentVisibility)
    })

    const panelTop = Math.max(0, Math.floor(window.scrollY + panel.getBoundingClientRect().top - 24))
    const documentMax = Math.max(panelTop, document.documentElement.scrollHeight - window.innerHeight)

    window.scrollTo(0, panelTop)
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

    const frameDeltas: number[] = []
    let lastFrame = performance.now()
    const start = lastFrame
    const duration = 1800

    await new Promise<void>((resolve) => {
      function step(now: number) {
        const delta = now - lastFrame

        if (delta > 0 && delta < 100) {
          frameDeltas.push(delta)
        }

        lastFrame = now

        const elapsed = now - start
        const progress = Math.min(1, elapsed / duration)
        const sweep = progress < 0.5 ? progress * 2 : (1 - progress) * 2
        window.scrollTo(0, panelTop + (documentMax - panelTop) * sweep)

        if (elapsed < duration) {
          requestAnimationFrame(step)
          return
        }

        resolve()
      }

      requestAnimationFrame(step)
    })

    observer?.disconnect()

    const sortedDeltas = [...frameDeltas].sort((left, right) => left - right)
    const p95Index = Math.min(sortedDeltas.length - 1, Math.floor(sortedDeltas.length * 0.95))
    const total = frameDeltas.reduce((sum, delta) => sum + delta, 0)
    const avgFrameMs = frameDeltas.length > 0 ? total / frameDeltas.length : Number.POSITIVE_INFINITY
    const p95FrameMs = sortedDeltas.length > 0 ? sortedDeltas[p95Index] : Number.POSITIVE_INFINITY
    const maxFrameMs = frameDeltas.length > 0 ? Math.max(...frameDeltas) : Number.POSITIVE_INFINITY
    const over20 = frameDeltas.filter((delta) => delta > 20).length
    const over32 = frameDeltas.filter((delta) => delta > 32).length

    return {
      avgFrameMs,
      clientWidth: document.documentElement.clientWidth,
      contentVisibilityAuto: contentVisibilityValues.filter((value) => value === 'auto').length,
      contentVisibilityTargets: contentVisibilityValues.length,
      frames: frameDeltas.length,
      longTaskCount: longTasks.length,
      longestLongTaskMs: longTasks.length > 0 ? Math.max(...longTasks) : 0,
      maxFrameMs,
      nestedContentVisibilityAuto: nestedVisibilityValues.filter((value) => value === 'auto').length,
      nestedContentVisibilityTargets: nestedVisibilityValues.length,
      over20,
      over32,
      p95FrameMs,
      scrollWidth: document.documentElement.scrollWidth,
      slowFrameRatio: frameDeltas.length > 0 ? over20 / frameDeltas.length : 1,
    }
  }, panelSelector)
}

function assertScrollPerf(metrics: ScrollPerfMetrics) {
  expect(metrics.contentVisibilityTargets).toBeGreaterThan(0)
  expect(metrics.contentVisibilityAuto).toBe(metrics.contentVisibilityTargets)
  if (metrics.nestedContentVisibilityTargets > 0) {
    expect(metrics.nestedContentVisibilityAuto).toBe(metrics.nestedContentVisibilityTargets)
  }
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  expect(metrics.frames).toBeGreaterThan(90)
  expect(metrics.longTaskCount).toBe(0)
  expect(metrics.longestLongTaskMs).toBeLessThan(50)
  expect(metrics.avgFrameMs).toBeLessThan(18)
  expect(metrics.p95FrameMs).toBeLessThan(18)
  expect(metrics.maxFrameMs).toBeLessThan(48)
  expect(metrics.slowFrameRatio).toBeLessThan(0.05)
  expect(metrics.over32).toBeLessThanOrEqual(1)
}

test('quick and igor tabs keep scroll performance guardrails', async ({ page }) => {
  await page.goto('/')

  const quickMetrics = await collectScrollPerf(page, '#quick-panel')
  assertScrollPerf(quickMetrics)

  await page.getByRole('tab', { name: 'Режим Игоря' }).click()

  const igorMetrics = await collectScrollPerf(page, '#igor-panel')
  assertScrollPerf(igorMetrics)
})

test('advanced tab keeps scroll performance guardrails after unlock', async ({ page }) => {
  await page.goto('/')
  await unlockAdvancedMode(page)

  const combinatoricsMetrics = await collectScrollPerf(page, '#advanced-panel')
  assertScrollPerf(combinatoricsMetrics)

  await page.getByRole('button', { name: 'Эквити' }).click()

  const equityMetrics = await collectScrollPerf(page, '#advanced-panel')
  assertScrollPerf(equityMetrics)
})
