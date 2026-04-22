import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AdvancedMode } from './AdvancedMode'

describe('AdvancedMode', () => {
  it('lets the user apply presets and enables postflop analysis once a flop is set', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(screen.getByText(/0 классов/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'TT+' }))
    expect(screen.getByText(/5 классов/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'A♥' }))
    await user.click(screen.getByRole('button', { name: 'K♦' }))
    await user.click(screen.getByRole('button', { name: '7♣' }))

    expect(screen.getByText('Готовые руки в текущем диапазоне.')).toBeInTheDocument()
  })

  it('picks cards via the grid and tolerates re-clicks to remove them', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

    const aceHearts = screen.getByRole('button', { name: 'A♥' })
    await user.click(aceHearts)

    expect(screen.getByRole('button', { name: 'A♥ выбрано' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'A♥ выбрано' }))

    expect(screen.getByRole('button', { name: 'A♥' })).toBeInTheDocument()
  })
})
