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

  const fraction = approximateFraction(value)

  if (fraction.denominator === 1) {
    if (fraction.numerator === 1) {
      return '1 банк'
    }

    return `${fraction.numerator} банка`
  }

  return `${fraction.numerator}/${fraction.denominator} банка`
}

export function formatRatio(left: number, right: number) {
  return `${left}:${right}`
}
