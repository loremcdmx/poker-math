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
    expect(screen.queryByRole('button', { name: 'Advanced mode' })).toBeNull()
  })

  it('moves focus with arrow-key tab navigation', async () => {
    const user = userEvent.setup()

    render(<App />)

    const quickTab = screen.getByRole('tab', { name: 'Формулы шансов' })
    quickTab.focus()

    await user.keyboard('{ArrowRight}')

    const comboTab = screen.getByRole('tab', { name: 'Комбинаторика' })
    expect(comboTab).toHaveFocus()
    expect(comboTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')

    expect(quickTab).toHaveFocus()
    expect(quickTab).toHaveAttribute('aria-selected', 'true')
  })

  it('does not expose advanced tab from persisted storage when the feature flag is off', () => {
    const storedValues = new Map<string, string>([
      ['pokermath.advanced.toggle', 'true'],
      ['pokermath.app.mode', '"advanced"'],
    ])

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => storedValues.clear(),
        getItem: (key: string) => storedValues.get(key) ?? null,
        key: (index: number) => Array.from(storedValues.keys())[index] ?? null,
        get length() {
          return storedValues.size
        },
        removeItem: (key: string) => {
          storedValues.delete(key)
        },
        setItem: (key: string, value: string) => {
          storedValues.set(key, value)
        },
      } satisfies Storage,
    })

    render(<App />)

    expect(screen.queryByRole('tab', { name: 'Адвансд мод' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Advanced mode' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Формулы шансов' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
