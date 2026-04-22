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

    await user.click(screen.getByRole('tab', { name: 'Комбинаторика' }))

    expect(screen.getByText(/Текущий диапазон/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Режим Игоря' }))

    expect(screen.getAllByText('4/5 банка').length).toBeGreaterThan(0)

    expect(screen.queryByRole('tab', { name: 'Адвансд мод' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Advanced mode' }))
    await user.click(screen.getByRole('tab', { name: 'Адвансд мод' }))

    expect(screen.getByText(/Режим закрыт паролем/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Пароль адвансд мода'), '123')
    await user.click(screen.getByRole('button', { name: 'Открыть адвансд' }))

    expect(screen.getByText(/Hero equity/i)).toBeInTheDocument()
  })

  it('moves focus with arrow-key tab navigation', async () => {
    const user = userEvent.setup()

    render(<App />)

    const quickTab = screen.getByRole('tab', { name: 'Базовые формулы шансов' })
    quickTab.focus()

    await user.keyboard('{ArrowRight}')

    const comboTab = screen.getByRole('tab', { name: 'Комбинаторика' })
    expect(comboTab).toHaveFocus()
    expect(comboTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')

    expect(quickTab).toHaveFocus()
    expect(quickTab).toHaveAttribute('aria-selected', 'true')
  })
})
