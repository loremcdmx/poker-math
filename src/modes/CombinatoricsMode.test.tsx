import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CombinatoricsMode } from './CombinatoricsMode'

describe('CombinatoricsMode', () => {
  it('lets the user apply presets and enables postflop analysis once a flop is set', async () => {
    const user = userEvent.setup()

    render(<CombinatoricsMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: 'Очистить' }))
    expect(screen.getAllByText(/0 классов/).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'TT+' }))
    expect(screen.getAllByText(/5 классов/).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'A♥' }))
    await user.click(screen.getByRole('button', { name: 'K♦' }))
    await user.click(screen.getByRole('button', { name: '7♣' }))

    expect(screen.getByRole('heading', { name: 'Готовые руки' })).toBeInTheDocument()
  })

  it('picks cards via the grid and tolerates re-clicks to remove them', async () => {
    const user = userEvent.setup()

    render(<CombinatoricsMode displayMode="percent" />)

    const aceHearts = screen.getByRole('button', { name: 'A♥' })
    await user.click(aceHearts)

    expect(screen.getByRole('button', { name: 'A♥ выбрано' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'A♥ выбрано' }))

    expect(screen.getByRole('button', { name: 'A♥' })).toBeInTheDocument()
  })

  it('renders the outs widget in fraction mode', () => {
    render(<CombinatoricsMode displayMode="fraction" />)

    expect(screen.getByRole('heading', { name: 'Правило 4 и 2 в деле' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Outs count' })).toHaveValue('9')
    expect(screen.getByText('FD + стрит-дро')).toBeInTheDocument()
  })

  it('checks the outs drill and reveals the solution steps', async () => {
    const user = userEvent.setup()

    render(<CombinatoricsMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: 'Проверить' }))

    const solution = screen.getByLabelText('Решение по аутам')
    expect(solution).toBeInTheDocument()
    expect(solution).toHaveTextContent(/47 − 9/i)
    expect(solution).toHaveTextContent(/Equity = 1 − промах/i)
    expect(solution).toHaveTextContent(/35%/)
  })
})
