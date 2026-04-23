import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { IgorMode } from './IgorMode'

describe('IgorMode', () => {
  it('starts with onboarding guidance and still lets hero chips switch to client-mode math', async () => {
    const user = userEvent.setup()

    render(<IgorMode displayMode="percent" />)

    expect(screen.getByText('С чего начать')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Пот как в клиенте' }))

    expect(screen.getByText('Пример на цифрах из клиента')).toBeInTheDocument()
    expect(screen.getByText('Банк в клиенте')).toBeInTheDocument()
  })

  it('removes the old spot memory section from the screen', () => {
    render(<IgorMode displayMode="percent" />)

    expect(screen.queryByRole('heading', { name: 'Последние споты и избранные пресеты' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Запомнить в историю' })).not.toBeInTheDocument()
  })

  it('renders the multi-street line builder summary', () => {
    render(<IgorMode displayMode="percent" />)

    expect(screen.getByRole('heading', { name: /Собери c-bet \/ barrel \/ jam/i })).toBeInTheDocument()
    expect(screen.getAllByText('581').length).toBeGreaterThan(0)
  })

  it('explains the normalized sizing reference instead of a mysterious bank 100 mode', () => {
    render(<IgorMode displayMode="percent" />)

    expect(screen.getByRole('heading', { name: /Стандартные сайзинги на одной шкале/i })).toBeInTheDocument()
    expect(screen.getByText(/33% = 33/i)).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Если банк = 100' })).toBeInTheDocument()
  })
})
