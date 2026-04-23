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
    expect(result.calculationMode).toBe('exact')
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
      ['', '', '', '', ''],
      1200,
    )

    expect(result.validMatchups).toBeGreaterThan(0)
    expect(result.calculationMode).toBe('monte_carlo')
    expect(result.plannedTrials).toBeGreaterThanOrEqual(1200)
    expect(result.sampledTrials).toBeGreaterThanOrEqual(result.plannedTrials)
    expect(result.heroEquity + result.villainEquity).toBeCloseTo(1, 6)
  })

  it('switches to exact enumeration on the turn when the state space is small', () => {
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
      ['2c', '3d', '4h', '5s', ''],
      4000,
    )

    expect(result.calculationMode).toBe('exact')
    expect(result.sampledTrials).toBe(44)
    expect(result.confidenceInterval.halfWidth).toBe(0)
  })

  it('respects range weights in combo and matchup counts', () => {
    const result = calculateEquity(
      {
        handCards: ['', ''],
        mode: 'range',
        rangeCells: ['AA'],
        rangeWeights: { AA: 0.25 },
      },
      {
        handCards: ['', ''],
        mode: 'range',
        rangeCells: ['KK'],
      },
      ['2c', '3d', '4h', '5s', '7c'],
      1000,
    )

    expect(result.heroWeightedComboCount).toBeCloseTo(1.5, 6)
    expect(result.weightedMatchups).toBeCloseTo(9, 6)
    expect(result.heroEquity).toBe(1)
  })
})
