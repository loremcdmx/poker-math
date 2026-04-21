import { useState, type ChangeEvent } from 'react'
import { sanitizeNumber } from '../lib/pokerMath'

type EditableNumberFieldProps = {
  ariaLabel?: string
  className?: string
  inputMax?: number
  inputMin?: number
  label: string
  onValueChange: (value: number) => void
  sanitizeMax?: number
  sanitizeMin?: number
  step?: number
  value: number
}

export function EditableNumberField({
  ariaLabel,
  className = 'number-field',
  inputMax,
  inputMin,
  label,
  onValueChange,
  sanitizeMax = 100000,
  sanitizeMin = 0.01,
  step = 1,
  value,
}: EditableNumberFieldProps) {
  const [draftValue, setDraftValue] = useState(String(value))
  const [isEditing, setIsEditing] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextRawValue = event.target.value
    setDraftValue(nextRawValue)

    if (nextRawValue === '') {
      return
    }

    onValueChange(sanitizeNumber(Number(nextRawValue), value, sanitizeMin, sanitizeMax))
  }

  function normalizeDraftValue() {
    const normalizedValue =
      draftValue.trim() === ''
        ? sanitizeMin
        : sanitizeNumber(Number(draftValue), value, sanitizeMin, sanitizeMax)

    onValueChange(normalizedValue)
    setDraftValue(String(normalizedValue))
    setIsEditing(false)
  }

  return (
    <label className={className}>
      <span>{label}</span>
      <input
        aria-label={ariaLabel}
        max={inputMax}
        min={inputMin}
        onBlur={normalizeDraftValue}
        onFocus={() => {
          setDraftValue(String(value))
          setIsEditing(true)
        }}
        onChange={handleChange}
        step={step}
        type="number"
        value={isEditing ? draftValue : String(value)}
      />
    </label>
  )
}
