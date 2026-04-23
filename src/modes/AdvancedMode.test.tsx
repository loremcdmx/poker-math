import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AdvancedMode } from './AdvancedMode'

describe('AdvancedMode', () => {
  it('lets the user apply presets and enables postflop analysis once a flop is set', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

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

    render(<AdvancedMode displayMode="percent" />)

    const aceHearts = screen.getByRole('button', { name: 'A♥' })
    await user.click(aceHearts)

    expect(screen.getByRole('button', { name: 'A♥ выбрано' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'A♥ выбрано' }))

    expect(screen.getByRole('button', { name: 'A♥' })).toBeInTheDocument()
  })

  it('lets the user target a specific board slot and replace that card', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: /Тёрн — пусто/i }))
    await user.click(screen.getByRole('button', { name: 'A♥' }))

    expect(screen.getByRole('button', { name: /Тёрн: A♥/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Тёрн: A♥/i }))
    await user.click(screen.getByRole('button', { name: 'K♦' }))

    expect(screen.getByRole('button', { name: /Тёрн: K♦/i })).toBeInTheDocument()
  })

  it('renders share summaries in fraction mode', () => {
    render(<AdvancedMode displayMode="fraction" />)

    expect(screen.getByText(/25 классов · 1/i)).toBeInTheDocument()
    expect(screen.getByText(/190 · 1/i)).toBeInTheDocument()
    expect(screen.getByText(/0 · 0/i)).toBeInTheDocument()
  })

  it('passes the current combinatorics range and board into embedded equity', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: 'Очистить' }))
    await user.click(screen.getByRole('button', { name: 'TT+' }))
    await user.click(screen.getByRole('button', { name: 'A♥' }))
    await user.click(screen.getByRole('button', { name: 'K♦' }))
    await user.click(screen.getByRole('button', { name: '7♣' }))
    await user.click(screen.getByRole('button', { name: 'Эквити' }))

    expect(screen.getByRole('combobox', { name: 'Флоп 1' })).toHaveValue('Ah')
    expect(screen.getByRole('combobox', { name: 'Флоп 2' })).toHaveValue('Kd')
    expect(screen.getByRole('combobox', { name: 'Флоп 3' })).toHaveValue('7c')
    expect(screen.getByRole('group', { name: 'Hero range presets' })).toBeInTheDocument()
    expect(screen.getByText('5 классов рук')).toBeInTheDocument()
  })

  it('accepts a custom weight and applies exact fill percentage to a range cell', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: 'Очистить' }))

    const customWeight = screen.getByRole('textbox', { name: 'Кастомный вес кисти' })
    await user.click(customWeight)
    await user.clear(customWeight)
    await user.type(customWeight, '37')

    const aksButton = screen.getByRole('button', { name: 'Toggle AKs' })
    await user.click(aksButton)

    expect(aksButton.getAttribute('style')).toContain('--range-weight-percent: 37%')
    expect(screen.getByText('AKs · 37%')).toBeInTheDocument()
  })

  it('supports drag-paint add and remove across the range matrix', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: 'Очистить' }))

    const aksButton = screen.getByRole('button', { name: 'Toggle AKs' })
    const aqsButton = screen.getByRole('button', { name: 'Toggle AQs' })
    const ajsButton = screen.getByRole('button', { name: 'Toggle AJs' })

    fireEvent.pointerDown(aksButton)
    fireEvent.pointerEnter(aqsButton)
    fireEvent.pointerEnter(ajsButton)
    fireEvent.pointerUp(window)

    expect(screen.getByText('AKs · 100%')).toBeInTheDocument()
    expect(screen.getByText('AQs · 100%')).toBeInTheDocument()
    expect(screen.getByText('AJs · 100%')).toBeInTheDocument()

    fireEvent.pointerDown(aksButton)
    fireEvent.pointerEnter(aqsButton)
    fireEvent.pointerEnter(ajsButton)
    fireEvent.pointerUp(window)

    expect(screen.queryByText('AKs · 100%')).not.toBeInTheDocument()
    expect(screen.queryByText('AQs · 100%')).not.toBeInTheDocument()
    expect(screen.queryByText('AJs · 100%')).not.toBeInTheDocument()
  })
})
