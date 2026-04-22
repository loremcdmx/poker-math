import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('applies the global display toggle across all modes', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Дроби' }))

    expect(screen.getAllByText('1/2 банка').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('tab', { name: 'Режим Игоря' }))

    expect(screen.getAllByText('4/5 банка').length).toBeGreaterThan(0)
    expect(screen.queryByRole('tab', { name: 'Адвансд мод' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Advanced mode' })).toBeNull()
  })

  it('moves focus with arrow-key tab navigation', async () => {
    const user = userEvent.setup()

    render(<App />)

    const quickTab = screen.getByRole('tab', { name: 'Быстрый калькулятор' })
    quickTab.focus()

    await user.keyboard('{ArrowRight}')

    const igorTab = screen.getByRole('tab', { name: 'Режим Игоря' })
    expect(igorTab).toHaveFocus()
    expect(igorTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')

    expect(quickTab).toHaveFocus()
    expect(quickTab).toHaveAttribute('aria-selected', 'true')
  })
})
