import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { sanitizeNumber } from '../lib/pokerMath'
import { parseInputNumber } from './editableNumberFieldUtils'

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
  const fieldRef = useRef<HTMLLabelElement | null>(null)
  const [draftValue, setDraftValue] = useState(String(value))
  const [isEditing, setIsEditing] = useState(false)
  const pendingInternalValueRef = useRef<number | null>(null)
  const skipBlurRef = useRef(false)

  useEffect(() => {
    if (pendingInternalValueRef.current === value) {
      pendingInternalValueRef.current = null
      return
    }

    pendingInternalValueRef.current = null
    setDraftValue(String(value))
  }, [value])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target

      if (!(target instanceof Node) || fieldRef.current?.contains(target)) {
        return
      }

      const parsedValue = parseInputNumber(draftValue)
      const normalizedValue =
        draftValue.trim() === ''
          ? sanitizeMin
          : parsedValue === null
            ? value
            : sanitizeNumber(parsedValue, value, sanitizeMin, sanitizeMax)

      skipBlurRef.current = true
      pendingInternalValueRef.current = normalizedValue
      onValueChange(normalizedValue)
      setDraftValue(String(normalizedValue))
      setIsEditing(false)
    }

    window.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [draftValue, isEditing, onValueChange, sanitizeMax, sanitizeMin, value])

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextRawValue = event.target.value
    setDraftValue(nextRawValue)

    const parsedValue = parseInputNumber(nextRawValue)

    if (parsedValue === null) {
      return
    }

    const sanitizedValue = sanitizeNumber(parsedValue, value, sanitizeMin, sanitizeMax)
    pendingInternalValueRef.current = sanitizedValue
    onValueChange(sanitizedValue)
  }

  function normalizeDraftValue() {
    const parsedValue = parseInputNumber(draftValue)
    const normalizedValue =
      draftValue.trim() === ''
        ? sanitizeMin
        : parsedValue === null
          ? value
          : sanitizeNumber(parsedValue, value, sanitizeMin, sanitizeMax)

    pendingInternalValueRef.current = normalizedValue
    onValueChange(normalizedValue)
    setDraftValue(String(normalizedValue))
    setIsEditing(false)
  }

  return (
    <label className={className} ref={fieldRef}>
      <span>{label}</span>
      <input
        aria-label={ariaLabel}
        autoComplete="off"
        inputMode="decimal"
        max={inputMax}
        min={inputMin}
        onBlur={() => {
          if (skipBlurRef.current) {
            skipBlurRef.current = false
            return
          }

          normalizeDraftValue()
        }}
        onFocus={() => {
          setDraftValue(String(value))
          setIsEditing(true)
        }}
        onChange={handleChange}
        step={step}
        type="text"
        value={isEditing ? draftValue : String(value)}
      />
    </label>
  )
}
