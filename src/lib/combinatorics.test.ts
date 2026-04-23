import { describe, expect, it } from 'vitest'
import { analyzeRange, expandRangeCell } from './combinatorics'

describe('combinatorics', () => {
  it('expands standard preflop classes into the right combo counts', () => {
    expect(expandRangeCell('AA')).toHaveLength(6)
    expect(expandRangeCell('AKs')).toHaveLength(4)
    expect(expandRangeCell('AKo')).toHaveLength(12)
  })

  it('applies board blockers to live combos', () => {
    const board = ['Ah', 'Kd', '7c', '', ''] as const

    expect(analyzeRange(['AKs'], board).liveComboCount).toBe(2)
    expect(analyzeRange(['AKo'], board).liveComboCount).toBe(7)
    expect(analyzeRange(['AA'], board).liveComboCount).toBe(3)
  })

  it('classifies made hands on the board', () => {
    const analysis = analyzeRange(['AKs', 'AKo'], ['Ah', 'Kd', '7c', '', ''])
    const twoPair = analysis.madeHandSummaries.find((summary) => summary.category === 'two_pair')

    expect(twoPair?.count).toBe(9)
  })

  it('detects straight and flush draw overlays', () => {
    const analysis = analyzeRange(['QJs'], ['Ts', '9d', '2s', '', ''])

    expect(analysis.drawSummaries.find((summary) => summary.category === 'oesd')?.count).toBe(4)
    expect(analysis.drawSummaries.find((summary) => summary.category === 'flush_draw')?.count).toBe(1)
    expect(analysis.drawSummaries.find((summary) => summary.category === 'combo_draw')?.count).toBe(1)
  })

  it('classifies wheel and broadway edge draws as one-card gutshots, not OESD', () => {
    const wheelAnalysis = analyzeRange({ A4s: 1 }, ['2h', '3d', '9c', '', ''])
    const broadwayAnalysis = analyzeRange({ QJs: 1 }, ['Ah', 'Kd', '2c', '', ''])

    expect(wheelAnalysis.drawSummaries.find((summary) => summary.category === 'oesd')).toBeUndefined()
    expect(broadwayAnalysis.drawSummaries.find((summary) => summary.category === 'oesd')).toBeUndefined()
    expect(wheelAnalysis.drawSummaries.find((summary) => summary.category === 'gutshot')?.count).toBe(4)
    expect(broadwayAnalysis.drawSummaries.find((summary) => summary.category === 'gutshot')?.count).toBe(4)
  })

  it('supports weighted ranges and reports board texture summaries', () => {
    const analysis = analyzeRange({ AKs: 0.5, AKo: 0.25 }, ['Ah', 'Kd', '7c', '', ''])

    expect(analysis.weightedRawComboCount).toBeCloseTo(5, 6)
    expect(analysis.weightedLiveComboCount).toBeCloseTo(2.75, 6)
    expect(analysis.boardTexture?.tags.map((tag) => tag.label)).toContain('A-high')
    expect(analysis.boardTexture?.pairPlusShare).toBeGreaterThan(0)
  })
})
