import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EditableNumberField } from './EditableNumberField'
import { normalizeInputNumberDraft, parseInputNumber } from './editableNumberFieldUtils'

function EditableNumberFieldHarness() {
  const [value, setValue] = useState(140)

  return (
    <>
      <EditableNumberField
        ariaLabel="Test number field"
        label="Test number field"
        onValueChange={setValue}
        sanitizeMax={300}
        sanitizeMin={1}
        value={value}
      />
      <button
        onMouseDown={(event) => {
          event.preventDefault()
          setValue(100)
        }}
        type="button"
      >
        Set to 100
      </button>
    </>
  )
}

describe('EditableNumberField', () => {
  it('syncs focused input when value changes externally', async () => {
    const user = userEvent.setup()

    render(<EditableNumberFieldHarness />)

    const input = screen.getByRole('textbox', { name: 'Test number field' })

    await user.click(input)
    await user.click(screen.getByRole('button', { name: 'Set to 100' }))

    expect(input).toHaveFocus()
    expect(input).toHaveValue('100')
  })

  it('parses comma decimals as numeric input', () => {
    expect(parseInputNumber('140,5')).toBe(140.5)
    expect(parseInputNumber('140.5')).toBe(140.5)
    expect(parseInputNumber('')).toBeNull()
  })

  it('drops leading zeros from integer drafts while preserving decimals', () => {
    expect(normalizeInputNumberDraft('050')).toBe('50')
    expect(normalizeInputNumberDraft('000')).toBe('0')
    expect(normalizeInputNumberDraft('005,5')).toBe('5,5')
    expect(normalizeInputNumberDraft('005.5')).toBe('5.5')
    expect(normalizeInputNumberDraft('0.5')).toBe('0.5')
  })

  it('removes leading zeros while typing into the input', async () => {
    const user = userEvent.setup()

    render(<EditableNumberFieldHarness />)

    const input = screen.getByRole('textbox', { name: 'Test number field' })

    await user.click(input)
    await user.clear(input)
    await user.type(input, '050')

    expect(input).toHaveValue('50')
  })
})
