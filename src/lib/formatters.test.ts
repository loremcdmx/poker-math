import { describe, expect, it } from 'vitest'
import { formatRatio } from './formatters'

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
