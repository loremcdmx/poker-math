import { Hand } from 'pokersolver'
import {
  expandWeightedRangeSelection,
  getCardOptions,
  type CardCode,
  type ConcreteCombo,
  type RangeSelectionWeights,
  type WeightedConcreteCombo,
} from './combinatorics'

export type EquityInputMode = 'hand' | 'range'
export type EquityCalculationMode = 'exact' | 'monte_carlo'

export type EquityConfidenceInterval = {
  halfWidth: number
  high: number
  low: number
}

export type EquityInput = {
  handCards: [CardCode | '', CardCode | '']
  mode: EquityInputMode
  rangeCells: string[]
  rangeWeights?: RangeSelectionWeights
}

export type EquityResult = {
  board: CardCode[]
  calculationMode: EquityCalculationMode
  confidenceInterval: EquityConfidenceInterval
  heroComboCount: number
  heroEquity: number
  heroWeightedComboCount: number
  heroWinRate: number
  plannedTrials: number
  sampledTrials: number
  tieRate: number
  validMatchups: number
  villainComboCount: number
  villainEquity: number
  villainWeightedComboCount: number
  villainWinRate: number
  weightedMatchups: number
}

const fullDeck = getCardOptions()
const EXACT_ENUMERATION_LIMIT = 180_000
const MIN_MONTE_CARLO_TRIALS = 1_000
const MAX_MONTE_CARLO_TRIALS = 60_000
const CONFIDENCE_TARGET_HALF_WIDTH = 0.0075

type MatchupBucket = {
  cumulativeCount: number
  cumulativeWeight: number
  heroCombo: WeightedConcreteCombo
  villainCombos: WeightedConcreteCombo[]
  villainCumulativeWeights: number[]
  villainWeightSum: number
}

function randomInt(max: number) {
  return Math.floor(Math.random() * max)
}

function comboOverlaps(combo: ConcreteCombo, deadCards: Set<CardCode>) {
  return combo.cards[0] === combo.cards[1] || combo.cards.some((card) => deadCards.has(card))
}

function combosShareCard(firstCombo: ConcreteCombo, secondCombo: ConcreteCombo) {
  const firstCardSet = new Set(firstCombo.cards)
  return secondCombo.cards.some((card) => firstCardSet.has(card))
}

function sumComboWeights(combos: WeightedConcreteCombo[]) {
  return combos.reduce((total, combo) => total + combo.weight, 0)
}

function clampShare(value: number) {
  return Math.min(1, Math.max(0, value))
}

function choose(n: number, k: number) {
  if (k < 0 || n < k) {
    return 0
  }

  if (k === 0 || n === k) {
    return 1
  }

  const smaller = Math.min(k, n - k)
  let result = 1

  for (let index = 1; index <= smaller; index += 1) {
    result = (result * (n - smaller + index)) / index
  }

  return result
}

function getMonteCarloFloor(boardCardsNeeded: number) {
  switch (boardCardsNeeded) {
    case 5:
      return 12_000
    case 4:
      return 10_000
    case 3:
      return 8_000
    case 2:
      return 5_000
    case 1:
      return 3_000
    default:
      return MIN_MONTE_CARLO_TRIALS
  }
}

function getMonteCarloCap(
  requestedIterations: number,
  boardCardsNeeded: number,
  validMatchups: number,
) {
  const stageMultiplier =
    boardCardsNeeded >= 4 ? 3 : boardCardsNeeded === 3 ? 2.6 : boardCardsNeeded === 2 ? 2.2 : 2
  const matchupMultiplier = validMatchups >= 1_000 ? 2 : validMatchups >= 200 ? 1.5 : 1.2

  return Math.min(
    MAX_MONTE_CARLO_TRIALS,
    Math.max(requestedIterations, Math.round(requestedIterations * stageMultiplier * matchupMultiplier)),
  )
}

function buildConfidenceInterval(
  mean: number,
  secondMoment: number,
  sampleSize: number,
) {
  if (sampleSize <= 1) {
    return {
      halfWidth: 0,
      high: clampShare(mean),
      low: clampShare(mean),
    } satisfies EquityConfidenceInterval
  }

  const variance = Math.max(0, secondMoment - mean * mean)
  const halfWidth = 1.96 * Math.sqrt(variance / sampleSize)

  return {
    halfWidth,
    high: clampShare(mean + halfWidth),
    low: clampShare(mean - halfWidth),
  } satisfies EquityConfidenceInterval
}

function resolveCalculationPlan(
  boardLength: number,
  boardCardsNeeded: number,
  validMatchups: number,
  requestedIterations: number,
) {
  if (validMatchups === 0) {
    return {
      maxTrials: 0,
      mode: 'exact' as const,
      plannedTrials: 0,
    }
  }

  if (boardCardsNeeded === 0) {
    return {
      maxTrials: validMatchups,
      mode: 'exact' as const,
      plannedTrials: validMatchups,
    }
  }

  const availableCards = 52 - boardLength - 4
  const runoutCount = choose(availableCards, boardCardsNeeded)
  const exactTrials = runoutCount * validMatchups

  if (boardCardsNeeded <= 2 && exactTrials <= EXACT_ENUMERATION_LIMIT) {
    return {
      maxTrials: exactTrials,
      mode: 'exact' as const,
      plannedTrials: exactTrials,
    }
  }

  const plannedTrials = Math.max(
    requestedIterations,
    getMonteCarloFloor(boardCardsNeeded),
    MIN_MONTE_CARLO_TRIALS,
  )

  return {
    maxTrials: getMonteCarloCap(plannedTrials, boardCardsNeeded, validMatchups),
    mode: 'monte_carlo' as const,
    plannedTrials,
  }
}

function buildMatchupBuckets(heroCombos: WeightedConcreteCombo[], villainCombos: WeightedConcreteCombo[]) {
  const buckets: MatchupBucket[] = []
  let validMatchups = 0
  let weightedMatchups = 0

  for (const heroCombo of heroCombos) {
    const compatibleVillains = villainCombos.filter(
      (villainCombo) => !combosShareCard(heroCombo, villainCombo),
    )

    if (compatibleVillains.length === 0) {
      continue
    }

    let villainWeightSum = 0
    const villainCumulativeWeights: number[] = []

    for (const villainCombo of compatibleVillains) {
      villainWeightSum += villainCombo.weight
      villainCumulativeWeights.push(villainWeightSum)
    }

    validMatchups += compatibleVillains.length
    weightedMatchups += villainWeightSum * heroCombo.weight
    buckets.push({
      cumulativeCount: validMatchups,
      cumulativeWeight: weightedMatchups,
      heroCombo,
      villainCombos: compatibleVillains,
      villainCumulativeWeights,
      villainWeightSum,
    })
  }

  return {
    buckets,
    validMatchups,
    weightedMatchups,
  }
}

function pickRandomWeightedIndex(cumulativeWeights: number[], targetWeight: number) {
  for (let index = 0; index < cumulativeWeights.length; index += 1) {
    if (targetWeight < cumulativeWeights[index]) {
      return index
    }
  }

  return cumulativeWeights.length - 1
}

function pickRandomValidMatchup(buckets: MatchupBucket[], weightedMatchups: number) {
  const targetWeight = Math.random() * weightedMatchups
  let previousWeight = 0

  for (const bucket of buckets) {
    if (targetWeight < bucket.cumulativeWeight) {
      const weightInsideBucket = (targetWeight - previousWeight) / bucket.heroCombo.weight
      const villainIndex = pickRandomWeightedIndex(
        bucket.villainCumulativeWeights,
        Math.max(0, weightInsideBucket),
      )

      return {
        heroCombo: bucket.heroCombo,
        villainCombo: bucket.villainCombos[villainIndex],
      }
    }

    previousWeight = bucket.cumulativeWeight
  }

  const fallbackBucket = buckets[buckets.length - 1]

  return {
    heroCombo: fallbackBucket.heroCombo,
    villainCombo: fallbackBucket.villainCombos[fallbackBucket.villainCombos.length - 1],
  }
}

function drawRunout(deadCards: Set<CardCode>, cardsNeeded: number) {
  const availableCards = fullDeck.filter((card) => !deadCards.has(card))
  const runout: CardCode[] = []

  for (let index = 0; index < cardsNeeded; index += 1) {
    const swapIndex = index + randomInt(availableCards.length - index)
    const selectedCard = availableCards[swapIndex]
    availableCards[swapIndex] = availableCards[index]
    availableCards[index] = selectedCard
    runout.push(selectedCard)
  }

  return runout
}

export function getInputCombos(input: EquityInput, boardSlots: ReadonlyArray<CardCode | ''>) {
  const board = boardSlots.filter((card): card is CardCode => card !== '')
  const boardSet = new Set(board)

  if (input.mode === 'hand') {
    const [firstCard, secondCard] = input.handCards

    if (firstCard === '' || secondCard === '' || firstCard === secondCard) {
      return []
    }

    if (boardSet.has(firstCard) || boardSet.has(secondCard)) {
      return []
    }

    return [
      {
        cards: [firstCard, secondCard],
        combo: `${firstCard}${secondCard}`,
        label: 'hand',
        weight: 1,
      } satisfies WeightedConcreteCombo,
    ]
  }

  const rangeWeights =
    input.rangeWeights ??
    input.rangeCells.reduce((selection, cell) => {
      selection[cell] = 1
      return selection
    }, {} as RangeSelectionWeights)

  return expandWeightedRangeSelection(rangeWeights).filter(
    (combo) => !comboOverlaps(combo, boardSet),
  )
}

export function countValidMatchups(heroCombos: WeightedConcreteCombo[], villainCombos: WeightedConcreteCombo[]) {
  return buildMatchupBuckets(heroCombos, villainCombos).validMatchups
}

function enumerateRunouts(
  availableCards: CardCode[],
  cardsNeeded: number,
  visitor: (runout: CardCode[]) => void,
  startIndex = 0,
  currentRunout: CardCode[] = [],
) {
  if (cardsNeeded === 0) {
    visitor([...currentRunout])
    return
  }

  for (let index = startIndex; index <= availableCards.length - cardsNeeded; index += 1) {
    currentRunout.push(availableCards[index])
    enumerateRunouts(availableCards, cardsNeeded - 1, visitor, index + 1, currentRunout)
    currentRunout.pop()
  }
}

export function calculateEquity(
  heroInput: EquityInput,
  villainInput: EquityInput,
  boardSlots: ReadonlyArray<CardCode | ''>,
  iterations = 4000,
) {
  const board = boardSlots.filter((card): card is CardCode => card !== '')
  const heroCombos = getInputCombos(heroInput, boardSlots)
  const villainCombos = getInputCombos(villainInput, boardSlots)
  const { buckets, validMatchups, weightedMatchups } = buildMatchupBuckets(heroCombos, villainCombos)
  const boardCardsNeeded = Math.max(0, 5 - board.length)
  const plan = resolveCalculationPlan(board.length, boardCardsNeeded, validMatchups, iterations)

  if (
    heroCombos.length === 0 ||
    villainCombos.length === 0 ||
    validMatchups === 0 ||
    weightedMatchups === 0
  ) {
    return {
      board,
      calculationMode: plan.mode,
      confidenceInterval: {
        halfWidth: 0,
        high: 0,
        low: 0,
      },
      heroComboCount: heroCombos.length,
      heroEquity: 0,
      heroWeightedComboCount: sumComboWeights(heroCombos),
      heroWinRate: 0,
      plannedTrials: plan.plannedTrials,
      sampledTrials: 0,
      tieRate: 0,
      validMatchups,
      villainComboCount: villainCombos.length,
      villainEquity: 0,
      villainWeightedComboCount: sumComboWeights(villainCombos),
      villainWinRate: 0,
      weightedMatchups,
    } satisfies EquityResult
  }

  let heroWins = 0
  let villainWins = 0
  let ties = 0
  let sampledTrials = 0
  let totalOutcomeWeight = 0
  let heroPointSum = 0
  let heroPointSquareSum = 0

  if (plan.mode === 'exact') {
    for (const bucket of buckets) {
      for (const villainCombo of bucket.villainCombos) {
        const heroCombo = bucket.heroCombo
        const deadCards = new Set<CardCode>([...board, ...heroCombo.cards, ...villainCombo.cards])
        const availableCards = fullDeck.filter((card) => !deadCards.has(card))
        const outcomeWeight = heroCombo.weight * villainCombo.weight

        enumerateRunouts(availableCards, boardCardsNeeded, (runout) => {
          const finalBoard = [...board, ...runout]
          const heroHand = Hand.solve([...heroCombo.cards, ...finalBoard])
          const villainHand = Hand.solve([...villainCombo.cards, ...finalBoard])
          const winners = Hand.winners([heroHand, villainHand])

          sampledTrials += 1
          totalOutcomeWeight += outcomeWeight

          if (winners.length === 2) {
            ties += outcomeWeight
            heroPointSum += outcomeWeight * 0.5
          } else if (winners[0] === villainHand) {
            villainWins += outcomeWeight
          } else {
            heroWins += outcomeWeight
            heroPointSum += outcomeWeight
          }
        })
      }
    }
  } else {
    for (let trial = 0; trial < plan.maxTrials; trial += 1) {
      const { heroCombo, villainCombo } = pickRandomValidMatchup(buckets, weightedMatchups)

      const deadCards = new Set<CardCode>([...board, ...heroCombo.cards, ...villainCombo.cards])
      const runout = drawRunout(deadCards, boardCardsNeeded)
      const finalBoard = [...board, ...runout]
      const heroHand = Hand.solve([...heroCombo.cards, ...finalBoard])
      const villainHand = Hand.solve([...villainCombo.cards, ...finalBoard])
      const winners = Hand.winners([heroHand, villainHand])
      let heroPoint = 0

      if (winners.length === 2) {
        ties += 1
        heroPoint = 0.5
      } else if (winners[0] === villainHand) {
        villainWins += 1
      } else {
        heroWins += 1
        heroPoint = 1
      }

      sampledTrials += 1
      totalOutcomeWeight += 1
      heroPointSum += heroPoint
      heroPointSquareSum += heroPoint * heroPoint

      if (sampledTrials >= plan.plannedTrials && sampledTrials % 250 === 0) {
        const confidenceInterval = buildConfidenceInterval(
          heroPointSum / sampledTrials,
          heroPointSquareSum / sampledTrials,
          sampledTrials,
        )

        if (confidenceInterval.halfWidth <= CONFIDENCE_TARGET_HALF_WIDTH) {
          break
        }
      }
    }
  }

  const safeWeight = Math.max(1e-9, totalOutcomeWeight)
  const heroWinRate = heroWins / safeWeight
  const villainWinRate = villainWins / safeWeight
  const tieRate = ties / safeWeight
  const heroEquity = heroPointSum / safeWeight
  const confidenceInterval =
    plan.mode === 'exact'
      ? {
          halfWidth: 0,
          high: heroEquity,
          low: heroEquity,
        }
      : buildConfidenceInterval(
          heroPointSum / Math.max(1, sampledTrials),
          heroPointSquareSum / Math.max(1, sampledTrials),
          Math.max(1, sampledTrials),
        )

  return {
    board,
    calculationMode: plan.mode,
    confidenceInterval,
    heroComboCount: heroCombos.length,
    heroEquity,
    heroWeightedComboCount: sumComboWeights(heroCombos),
    heroWinRate,
    plannedTrials: plan.plannedTrials,
    sampledTrials,
    tieRate,
    validMatchups,
    villainComboCount: villainCombos.length,
    villainEquity: villainWinRate + tieRate / 2,
    villainWeightedComboCount: sumComboWeights(villainCombos),
    villainWinRate,
    weightedMatchups,
  } satisfies EquityResult
}
