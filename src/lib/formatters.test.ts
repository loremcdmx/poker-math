import { describe, expect, it } from 'vitest'
import { formatRatio, pluralizeRu } from './formatters'

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
