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

    await user.click(screen.getByRole('tab', { name: 'Адвансд мод' }))

    expect(screen.getByText(/Доля живых/i)).toBeInTheDocument()
  })
})
