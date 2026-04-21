import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { IgorMode } from './IgorMode'

describe('IgorMode', () => {
  it('makes the hero chips actionable instead of decorative', async () => {
    const user = userEvent.setup()

    render(<IgorMode />)

    expect(screen.getByText('Текущий спот')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Пот как в клиенте' }))

    expect(screen.getByText('Спот в формате клиента')).toBeInTheDocument()
    expect(screen.getByText('Банк в клиенте')).toBeInTheDocument()
  })
})
