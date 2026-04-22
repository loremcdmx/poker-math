import { describe, expect, it } from 'vitest'
import { calculateEquity, countValidMatchups, getInputCombos } from './equity'

describe('equity', () => {
  it('filters hero hand against board blockers', () => {
    const combos = getInputCombos(
      {
        handCards: ['Ah', 'Ad'],
        mode: 'hand',
        rangeCells: [],
      },
      ['Ah', '', '', '', ''],
    )

    expect(combos).toHaveLength(0)
  })

  it('returns exact river equity for hand versus hand', () => {
    const result = calculateEquity(
      {
        handCards: ['Ah', 'Ad'],
        mode: 'hand',
        rangeCells: [],
      },
      {
        handCards: ['Kh', 'Kd'],
        mode: 'hand',
        rangeCells: [],
      },
      ['2c', '3d', '4h', '5s', '7c'],
      1000,
    )

    expect(result.sampledTrials).toBe(1)
    expect(result.heroEquity).toBe(1)
    expect(result.villainEquity).toBe(0)
    expect(result.validMatchups).toBe(1)
  })

  it('returns zero when hands fully overlap', () => {
    const result = calculateEquity(
      {
        handCards: ['Ah', 'Ad'],
        mode: 'hand',
        rangeCells: [],
      },
      {
        handCards: ['Ah', 'Ad'],
        mode: 'hand',
        rangeCells: [],
      },
      ['', '', '', '', ''],
      1000,
    )

    expect(result.validMatchups).toBe(0)
    expect(result.sampledTrials).toBe(0)
  })

  it('counts only non-overlapping range matchups', () => {
    const heroCombos = getInputCombos(
      {
        handCards: ['', ''],
        mode: 'range',
        rangeCells: ['AA'],
      },
      ['', '', '', '', ''],
    )

    const villainCombos = getInputCombos(
      {
        handCards: ['', ''],
        mode: 'range',
        rangeCells: ['AA'],
      },
      ['', '', '', '', ''],
    )

    expect(countValidMatchups(heroCombos, villainCombos)).toBe(6)
  })

  it('uses every requested Monte Carlo trial from valid matchups', () => {
    const result = calculateEquity(
      {
        handCards: ['', ''],
        mode: 'range',
        rangeCells: ['AA', 'AKs', 'AKo'],
      },
      {
        handCards: ['', ''],
        mode: 'range',
        rangeCells: ['AA', 'AKs', 'AKo'],
      },
      ['2c', '3d', '4h', '', ''],
      1200,
    )

    expect(result.validMatchups).toBeGreaterThan(0)
    expect(result.sampledTrials).toBe(1200)
    expect(result.heroEquity + result.villainEquity).toBeCloseTo(1, 6)
  })
})
