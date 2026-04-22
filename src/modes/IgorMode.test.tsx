import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { IgorMode } from './IgorMode'

describe('IgorMode', () => {
  it('makes the hero chips actionable instead of decorative', async () => {
    const user = userEvent.setup()

    render(<IgorMode displayMode="percent" />)

    expect(screen.getByText('Текущий спот')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Пот как в клиенте' }))

    expect(screen.getByText('Спот в формате клиента')).toBeInTheDocument()
    expect(screen.getByText('Банк в клиенте')).toBeInTheDocument()
  })

  it('stores the current spot in local memory', async () => {
    const user = userEvent.setup()

    render(<IgorMode displayMode="percent" />)

    await user.click(screen.getByRole('button', { name: 'Запомнить в историю' }))

    expect(screen.getAllByText(/чистый 24 \/ 19/i).length).toBeGreaterThan(0)
  })

  it('renders the multi-street line builder summary', () => {
    render(<IgorMode displayMode="percent" />)

    expect(screen.getByRole('heading', { name: /Собери c-bet \/ barrel \/ jam/i })).toBeInTheDocument()
    expect(screen.getAllByText('581').length).toBeGreaterThan(0)
  })
})
