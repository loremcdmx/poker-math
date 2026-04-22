import { Hand } from 'pokersolver'
import { expandRangeCell, getCardOptions, type CardCode, type ConcreteCombo } from './combinatorics'

export type EquityInputMode = 'hand' | 'range'

export type EquityInput = {
  handCards: [CardCode | '', CardCode | '']
  mode: EquityInputMode
  rangeCells: string[]
}

export type EquityResult = {
  board: CardCode[]
  heroComboCount: number
  heroEquity: number
  heroWinRate: number
  sampledTrials: number
  tieRate: number
  validMatchups: number
  villainComboCount: number
  villainEquity: number
  villainWinRate: number
}

const fullDeck = getCardOptions()

type MatchupBucket = {
  cumulativeCount: number
  heroCombo: ConcreteCombo
  villainCombos: ConcreteCombo[]
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

function buildMatchupBuckets(heroCombos: ConcreteCombo[], villainCombos: ConcreteCombo[]) {
  const buckets: MatchupBucket[] = []
  let validMatchups = 0

  for (const heroCombo of heroCombos) {
    const compatibleVillains = villainCombos.filter(
      (villainCombo) => !combosShareCard(heroCombo, villainCombo),
    )

    if (compatibleVillains.length === 0) {
      continue
    }

    validMatchups += compatibleVillains.length
    buckets.push({
      cumulativeCount: validMatchups,
      heroCombo,
      villainCombos: compatibleVillains,
    })
  }

  return {
    buckets,
    validMatchups,
  }
}

function pickRandomValidMatchup(buckets: MatchupBucket[], validMatchups: number) {
  const targetIndex = randomInt(validMatchups)
  let previousCount = 0

  for (const bucket of buckets) {
    if (targetIndex < bucket.cumulativeCount) {
      return {
        heroCombo: bucket.heroCombo,
        villainCombo: bucket.villainCombos[targetIndex - previousCount],
      }
    }

    previousCount = bucket.cumulativeCount
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
      } satisfies ConcreteCombo,
    ]
  }

  return input.rangeCells
    .flatMap((cell) => expandRangeCell(cell))
    .filter((combo) => !comboOverlaps(combo, boardSet))
}

export function countValidMatchups(heroCombos: ConcreteCombo[], villainCombos: ConcreteCombo[]) {
  return buildMatchupBuckets(heroCombos, villainCombos).validMatchups
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
  const { buckets, validMatchups } = buildMatchupBuckets(heroCombos, villainCombos)

  if (heroCombos.length === 0 || villainCombos.length === 0 || validMatchups === 0) {
    return {
      board,
      heroComboCount: heroCombos.length,
      heroEquity: 0,
      heroWinRate: 0,
      sampledTrials: 0,
      tieRate: 0,
      validMatchups,
      villainComboCount: villainCombos.length,
      villainEquity: 0,
      villainWinRate: 0,
    } satisfies EquityResult
  }

  const boardCardsNeeded = Math.max(0, 5 - board.length)
  const trials = boardCardsNeeded === 0 ? validMatchups : Math.max(1000, iterations)
  let heroWins = 0
  let villainWins = 0
  let ties = 0
  let sampledTrials = 0

  if (boardCardsNeeded === 0) {
    for (const bucket of buckets) {
      for (const villainCombo of bucket.villainCombos) {
        const heroCombo = bucket.heroCombo
        const heroHand = Hand.solve([...heroCombo.cards, ...board])
        const villainHand = Hand.solve([...villainCombo.cards, ...board])
        const winners = Hand.winners([heroHand, villainHand])

        if (winners.length === 2) {
          ties += 1
        } else if (winners[0] === villainHand) {
          villainWins += 1
        } else {
          heroWins += 1
        }

        sampledTrials += 1
      }
    }
  } else {
    for (let trial = 0; trial < trials; trial += 1) {
      const { heroCombo, villainCombo } = pickRandomValidMatchup(buckets, validMatchups)

      const deadCards = new Set<CardCode>([...board, ...heroCombo.cards, ...villainCombo.cards])
      const runout = drawRunout(deadCards, boardCardsNeeded)
      const finalBoard = [...board, ...runout]
      const heroHand = Hand.solve([...heroCombo.cards, ...finalBoard])
      const villainHand = Hand.solve([...villainCombo.cards, ...finalBoard])
      const winners = Hand.winners([heroHand, villainHand])

      if (winners.length === 2) {
        ties += 1
      } else if (winners[0] === villainHand) {
        villainWins += 1
      } else {
        heroWins += 1
      }

      sampledTrials += 1
    }
  }

  const safeTrials = Math.max(1, sampledTrials)
  const heroWinRate = heroWins / safeTrials
  const villainWinRate = villainWins / safeTrials
  const tieRate = ties / safeTrials

  return {
    board,
    heroComboCount: heroCombos.length,
    heroEquity: heroWinRate + tieRate / 2,
    heroWinRate,
    sampledTrials,
    tieRate,
    validMatchups,
    villainComboCount: villainCombos.length,
    villainEquity: villainWinRate + tieRate / 2,
    villainWinRate,
  } satisfies EquityResult
}
