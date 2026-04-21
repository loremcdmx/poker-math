export function parseInputNumber(rawValue: string) {
  const trimmedValue = rawValue.trim()

  if (trimmedValue === '') {
    return null
  }

  const normalizedValue = trimmedValue.replace(',', '.')
  const parsedValue = Number(normalizedValue)

  if (Number.isNaN(parsedValue) || !Number.isFinite(parsedValue)) {
    return null
  }

  return parsedValue
}
