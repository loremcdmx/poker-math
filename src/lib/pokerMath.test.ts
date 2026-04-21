import { describe, expect, it } from 'vitest'
import {
  approximateFraction,
  calculateBluffWithEquity,
  calculateIgorInventory,
  calculateMetrics,
  calculateRaiseMetrics,
} from './pokerMath'

describe('poker math helpers', () => {
  it('computes the standard 1/2 pot numbers', () => {
    const result = calculateMetrics(0.5)

    expect(result.breakEvenFe).toBeCloseTo(1 / 3, 6)
    expect(result.bluffShare).toBeCloseTo(0.25, 6)
    expect(result.mdf).toBeCloseTo(2 / 3, 6)
    expect(result.valueToBluff).toEqual({ numerator: 3, denominator: 1 })
  })

  it('converts client-pot input into clean-pot math', () => {
    const result = calculateIgorInventory(150, 50, 'client', 'value', 15)

    expect(result.safePotInput).toBe(150)
    expect(result.safePot).toBe(100)
    expect(result.clientPot).toBe(150)
    expect(result.bluffCount).toBeCloseTo(5, 6)
    expect(result.betPercentOfPot).toBeCloseTo(0.5, 6)
  })

  it('computes raise-vs-callbot math from the Igor example', () => {
    const result = calculateRaiseMetrics(8, 5, 23)

    expect(result.callAmount).toBe(18)
    expect(result.finalPotIfCall).toBe(54)
    expect(result.feNeeded).toBeCloseTo(23 / 36, 6)
    expect(result.callerEqRequired).toBeCloseTo(1 / 3, 6)
  })

  it('keeps value:bluff sane for small bets below the usual fraction grid', () => {
    const result = calculateMetrics(0.02)

    expect(result.betFraction).toEqual({ numerator: 1, denominator: 50 })
    expect(result.valueToBluff).toEqual({ numerator: 51, denominator: 1 })
    expect(result.breakEvenFe).toBeCloseTo(1 / 51, 6)
  })

  it('falls back to 1/round(1/value) when the denominator grid rounds to zero', () => {
    expect(approximateFraction(0.02)).toEqual({ numerator: 1, denominator: 50 })
    expect(approximateFraction(0.01)).toEqual({ numerator: 1, denominator: 100 })
  })

  it('reduces required fold equity when the bluff has 25% equity', () => {
    const result = calculateBluffWithEquity(100, 50, 25)

    expect(result.pureFe).toBeCloseTo(1 / 3, 6)
    expect(result.noFoldEquity).toBeCloseTo(0.25, 6)
    expect(result.feWithEquity).toBe(0)
    expect(result.savedFe).toBeCloseTo(1 / 3, 6)
  })
})
