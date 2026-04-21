import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickMode } from './QuickMode'

describe('QuickMode', () => {
  it('renders quick hero chips as real section links', () => {
    render(
      <QuickMode
        betPercent={50}
        displayMode="percent"
        onBetPercentChange={vi.fn()}
        onDisplayModeChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: 'К калькулятору' })).toHaveAttribute(
      'href',
      '#quick-calculator',
    )
    expect(screen.getByRole('link', { name: 'К шпаргалке' })).toHaveAttribute(
      'href',
      '#quick-cheatsheet',
    )
  })
})
