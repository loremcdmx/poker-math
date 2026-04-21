import { render, screen, within } from '@testing-library/react'
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

    await user.selectOptions(screen.getByRole('combobox', { name: 'Флоп 1' }), 'Ah')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Флоп 2' }), 'Kd')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Флоп 3' }), '7c')

    expect(screen.getByText('Made hand breakdown текущего диапазона.')).toBeInTheDocument()
  })

  it('disables duplicate board cards across slots', async () => {
    const user = userEvent.setup()

    render(<AdvancedMode displayMode="percent" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Флоп 1' }), 'Ah')

    const flopTwo = screen.getByRole('combobox', { name: 'Флоп 2' })
    const aceHeartsOption = within(flopTwo).getByRole('option', { name: 'A♥' })

    expect(aceHeartsOption).toBeDisabled()
  })
})
