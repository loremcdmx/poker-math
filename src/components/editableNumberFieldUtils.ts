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

export function normalizeInputNumberDraft(rawValue: string) {
  const trimmedValue = rawValue.trim()

  if (trimmedValue === '') {
    return ''
  }

  const sign =
    trimmedValue.startsWith('-') || trimmedValue.startsWith('+') ? trimmedValue[0] : ''
  const unsignedValue = sign === '' ? trimmedValue : trimmedValue.slice(1)

  if (!/^\d*([.,]\d*)?$/.test(unsignedValue)) {
    return trimmedValue
  }

  const separatorMatch = unsignedValue.match(/[.,]/)

  if (separatorMatch === null) {
    return `${sign}${unsignedValue.replace(/^0+(?=\d)/, '')}`
  }

  const separatorIndex = separatorMatch.index ?? unsignedValue.length
  const integerPart = unsignedValue.slice(0, separatorIndex)
  const fractionalPart = unsignedValue.slice(separatorIndex + 1)
  const separator = separatorMatch[0]

  if (integerPart === '') {
    return trimmedValue
  }

  return `${sign}${integerPart.replace(/^0+(?=\d)/, '')}${separator}${fractionalPart}`
}
