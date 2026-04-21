import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EditableNumberField } from './EditableNumberField'

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

    const input = screen.getByRole('spinbutton', { name: 'Test number field' })

    await user.click(input)
    await user.click(screen.getByRole('button', { name: 'Set to 100' }))

    expect(input).toHaveFocus()
    expect(input).toHaveValue(100)
  })
})
