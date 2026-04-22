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
    expect(screen.getByRole('link', { name: 'К дриллу' })).toHaveAttribute(
      'href',
      '#quick-drill',
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
        />
      )
    }

    render(<QuickModeHarness />)

    const input = screen.getByRole('textbox', { name: 'Bet size percent' })
    const slider = screen.getByRole('slider', { name: 'Bet size slider' })

    await user.click(input)
    await user.clear(input)
    await user.type(input, '140')

    fireEvent.change(slider, { target: { value: '100' } })

    expect(input).toHaveValue('100')
  })

  it('rounds fractional bet input to an integer and locks the slider to it', () => {
    function QuickModeHarness() {
      const [betPercent, setBetPercent] = useState(50)

      return (
        <QuickMode
          betPercent={betPercent}
          displayMode="percent"
          onBetPercentChange={setBetPercent}
        />
      )
    }

    render(<QuickModeHarness />)

    const input = screen.getByRole('textbox', { name: 'Bet size percent' })
    const slider = screen.getByRole('slider', { name: 'Bet size slider' }) as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '140.5' } })

    expect(slider.value).toBe('141')
  })

  it('checks the quick drill answer and reveals the correct FE', async () => {
    const user = userEvent.setup()

    render(
      <QuickMode
        betPercent={50}
        displayMode="percent"
        onBetPercentChange={vi.fn()}
      />,
    )

    await user.clear(screen.getByRole('textbox', { name: 'Drill fold equity guess' }))
    await user.type(screen.getByRole('textbox', { name: 'Drill fold equity guess' }), '43')
    await user.click(screen.getByRole('button', { name: 'Проверить' }))

    expect(screen.getByText('Попал')).toBeInTheDocument()
    expect(screen.getAllByText('42,9%').length).toBeGreaterThan(0)
  })

  it('merges call odds and value-to-bluff into one explanation card', () => {
    render(
      <QuickMode
        betPercent={50}
        displayMode="percent"
        onBetPercentChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Колл и value:bluff')).toBeInTheDocument()
    expect(screen.getByText(/\(банк \+ ставка\) : ставка/i)).toBeInTheDocument()
    expect(screen.queryByText('Шансы банка на колл')).not.toBeInTheDocument()
    expect(screen.queryByText('Сколько value на 1 bluff')).not.toBeInTheDocument()
  })
})
