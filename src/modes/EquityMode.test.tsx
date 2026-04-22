import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EquityMode } from './EquityMode'

describe('EquityMode', () => {
  it('does not block opposite exact-hand cards while the other side is in range mode', () => {
    render(<EquityMode displayMode="percent" embedded />)

    const heroSecondCard = screen.getByRole('combobox', { name: 'Hero Карта 2' })
    const kingHeartsOption = within(heroSecondCard).getByRole('option', { name: 'K♥' })

    expect(kingHeartsOption).toBeEnabled()
  })

  it('blocks opposite exact-hand cards once the other side switches to hand mode', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    await user.click(screen.getAllByRole('button', { name: 'Рука' })[1])

    const heroSecondCard = screen.getByRole('combobox', { name: 'Hero Карта 2' })
    const kingHeartsOption = within(heroSecondCard).getByRole('option', { name: 'K♥' })

    expect(kingHeartsOption).toBeDisabled()
  })

  it('blocks board cards that collide with exact hands', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    let flopOne = screen.getByRole('combobox', { name: 'Флоп 1' })
    expect(within(flopOne).getByRole('option', { name: 'A♥' })).toBeDisabled()
    expect(within(flopOne).getByRole('option', { name: 'A♦' })).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: 'Рука' })[1])

    flopOne = screen.getByRole('combobox', { name: 'Флоп 1' })
    expect(within(flopOne).getByRole('option', { name: 'K♥' })).toBeDisabled()
    expect(within(flopOne).getByRole('option', { name: 'K♦' })).toBeDisabled()
  })

  it('clears hidden exact-hand blockers when switching a side from range to hand', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Флоп 1' }), 'Kh')
    await user.click(screen.getAllByRole('button', { name: 'Рука' })[1])

    expect(screen.getByRole('combobox', { name: 'Villain Карта 1' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Villain Карта 2' })).toHaveValue('Kd')
  })

  it('marks results as stale after changing the board and explains empty matchups', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    expect(
      screen.getByText(/Текущий результат соответствует выбранным рукам/i),
    ).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Флоп 1' }), '2c')

    expect(screen.getByText(/equity-цифры уже устарели/i)).toBeInTheDocument()

    const villainPresets = screen.getByRole('group', { name: 'Villain range presets' })
    await user.click(within(villainPresets).getByRole('button', { name: 'Очистить' }))
    await user.click(screen.getByRole('button', { name: 'Пересчитать equity' }))

    expect(screen.getByText(/нет валидных матчапов/i)).toBeInTheDocument()
  })
})
