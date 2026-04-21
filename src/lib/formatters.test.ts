import { describe, expect, it } from 'vitest'
import {
  describeRatioAccuracy,
  formatExactRatio,
  formatRatio,
  pluralizeRu,
} from './formatters'

describe('formatRatio', () => {
  it('keeps already clean ratios intact', () => {
    expect(formatRatio(12, 7)).toBe('12:7')
    expect(formatRatio(3, 2)).toBe('3:2')
  })

  it('rounds noisy raw ratios to mnemonic-friendly parts', () => {
    expect(formatRatio(1467, 967)).toBe('3:2')
    expect(formatRatio(1999, 999)).toBe('2:1')
  })
})

describe('describeRatioAccuracy', () => {
  it('reports zero error when the approximation equals the exact value', () => {
    const result = describeRatioAccuracy(3, 1, 3)
    expect(result.exactValue).toBe(3)
    expect(result.errorPercent).toBe(0)
  })

  it('reports the relative error between approximation and exact value', () => {
    const exact = (1 + 1.41) / 1.41
    const result = describeRatioAccuracy(12, 7, exact)
    expect(result.exactValue).toBeCloseTo(1.7092, 4)
    expect(result.errorPercent).toBeCloseTo(0.34, 1)
  })

  it('returns zeroed values when inputs are degenerate', () => {
    expect(describeRatioAccuracy(1, 0, 1)).toEqual({ exactValue: 0, errorPercent: 0 })
    expect(describeRatioAccuracy(1, 1, 0)).toEqual({ exactValue: 0, errorPercent: 0 })
  })
})

describe('formatExactRatio', () => {
  it('renders decimal ratios with ru-RU locale', () => {
    expect(formatExactRatio(1.709)).toBe('1,71:1')
    expect(formatExactRatio(3)).toBe('3:1')
  })
})

describe('pluralizeRu', () => {
  const parts = ['часть', 'части', 'частей'] as const

  it('picks singular for 1 and 21', () => {
    expect(pluralizeRu(1, parts)).toBe('часть')
    expect(pluralizeRu(21, parts)).toBe('часть')
  })

  it('picks paucal (2-4) form for 2, 3, 4, 22', () => {
    expect(pluralizeRu(2, parts)).toBe('части')
    expect(pluralizeRu(3, parts)).toBe('части')
    expect(pluralizeRu(4, parts)).toBe('части')
    expect(pluralizeRu(22, parts)).toBe('части')
  })

  it('picks genitive plural for 5-20 and 25', () => {
    expect(pluralizeRu(5, parts)).toBe('частей')
    expect(pluralizeRu(11, parts)).toBe('частей')
    expect(pluralizeRu(13, parts)).toBe('частей')
    expect(pluralizeRu(20, parts)).toBe('частей')
    expect(pluralizeRu(25, parts)).toBe('частей')
    expect(pluralizeRu(51, parts)).toBe('часть')
  })
})
