import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('keeps the bet input in sync with slider updates while focused', async () => {
    const user = userEvent.setup()

    function QuickModeHarness() {
      const [betPercent, setBetPercent] = useState(50)

      return (
        <QuickMode
          betPercent={betPercent}
          displayMode="percent"
          onBetPercentChange={setBetPercent}
          onDisplayModeChange={vi.fn()}
        />
      )
    }

    render(<QuickModeHarness />)

    const input = screen.getByRole('spinbutton', { name: 'Bet size percent' })
    const slider = screen.getByRole('slider', { name: 'Bet size slider' })

    await user.click(input)
    await user.clear(input)
    await user.type(input, '140')

    fireEvent.change(slider, { target: { value: '100' } })

    expect(input).toHaveValue(100)
  })
})
