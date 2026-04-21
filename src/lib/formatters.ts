import { approximateFraction, type DisplayMode } from './pokerMath'

const percentFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const decimalFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPercent(value: number) {
  return `${percentFormatter.format(value * 100)}%`
}

export function formatFraction(value: number, maxDenominator = 10) {
  const fraction = approximateFraction(value, maxDenominator)

  if (fraction.denominator === 1) {
    return integerFormatter.format(fraction.numerator)
  }

  return `${integerFormatter.format(fraction.numerator)}/${integerFormatter.format(
    fraction.denominator,
  )}`
}

export function formatShare(value: number, mode: DisplayMode, maxDenominator = 10) {
  if (mode === 'percent') {
    return formatPercent(value)
  }

  return formatFraction(value, maxDenominator)
}

export function formatPotUnits(value: number) {
  return `${decimalFormatter.format(value)} банка`
}

export function formatDecimal(value: number) {
  return decimalFormatter.format(value)
}

export function formatInteger(value: number) {
  return integerFormatter.format(value)
}

export function formatSheetPercent(value: number) {
  return percentFormatter.format(value * 100)
}

export function formatSheetRoundedPercent(value: number) {
  return integerFormatter.format(value * 100)
}

export function formatBetLabel(value: number, mode: DisplayMode) {
  if (mode === 'percent') {
    return `${percentFormatter.format(value * 100)}% банка`
  }

  const fraction = approximateFraction(value, 10)

  if (fraction.denominator === 1) {
    if (fraction.numerator === 1) {
      return '1 банк'
    }

    return `${fraction.numerator} банка`
  }

  return `${fraction.numerator}/${fraction.denominator} банка`
}

export function formatRatio(left: number, right: number) {
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) {
    return `${integerFormatter.format(0)}:${integerFormatter.format(0)}`
  }

  const ratio = approximateFraction(left / right, 10)

  return `${integerFormatter.format(ratio.numerator)}:${integerFormatter.format(
    ratio.denominator,
  )}`
}
