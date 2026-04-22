export const rangeRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
export const cardSuits = ['s', 'h', 'd', 'c'] as const

export type RangeRank = (typeof rangeRanks)[number]
export type CardSuit = (typeof cardSuits)[number]
export type CardCode = `${RangeRank}${CardSuit}`
export type RangeCellKind = 'pair' | 'suited' | 'offsuit'
export type MadeHandCategory =
  | 'straight_flush'
  | 'quads'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'trips'
  | 'two_pair'
  | 'pair'
  | 'high_card'
export type DrawCategory = 'flush_draw' | 'oesd' | 'gutshot' | 'combo_draw'
export type RangePreset =
  | 'clear'
  | 'all'
  | 'pairs'
  | 'suited'
  | 'offsuit'
  | 'broadways'
  | 'axs'
  | '99plus'
  | 'ttplus'
  | 'suited_connectors'

export type RangeGridCell = {
  kind: RangeCellKind
  label: string
}

export type ConcreteCombo = {
  cards: [CardCode, CardCode]
  combo: string
  label: string
}

export type CategorySummary<TCategory extends string> = {
  category: TCategory
  count: number
  examples: string[]
  share: number
}

export type RangeAnalysis = {
  blockedComboCount: number
  board: CardCode[]
  drawSummaries: CategorySummary<DrawCategory>[]
  liveComboCount: number
  madeHandSummaries: CategorySummary<MadeHandCategory>[]
  postflopReady: boolean
  rawComboCount: number
  selectedCellCount: number
}

const rankValueMap: Record<RangeRank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2,
}

const madeHandOrder: MadeHandCategory[] = [
  'straight_flush',
  'quads',
  'full_house',
  'flush',
  'straight',
  'trips',
  'two_pair',
  'pair',
  'high_card',
]

const drawOrder: DrawCategory[] = ['combo_draw', 'flush_draw', 'oesd', 'gutshot']

function getRankValue(rank: RangeRank) {
  return rankValueMap[rank]
}

function makeCard(rank: RangeRank, suit: CardSuit) {
  return `${rank}${suit}` as CardCode
}

function parseCellLabel(label: string) {
  const rankA = label[0] as RangeRank
  const rankB = label[1] as RangeRank
  const suffix = label[2]

  if (!rankA || !rankB) {
    throw new Error(`Invalid range cell label: ${label}`)
  }

  if (rankA === rankB) {
    return {
      kind: 'pair' as const,
      rankA,
      rankB,
    }
  }

  if (suffix !== 's' && suffix !== 'o') {
    throw new Error(`Invalid range cell label: ${label}`)
  }

  return {
    kind: suffix === 's' ? ('suited' as const) : ('offsuit' as const),
    rankA,
    rankB,
  }
}

function countBy<TValue extends string | number>(items: TValue[]) {
  const counts = new Map<TValue, number>()

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }

  return counts
}

function hasStraight(values: number[]) {
  const uniqueValues = Array.from(new Set(values)).sort((left, right) => left - right)
  const lowAwareValues = uniqueValues.includes(14) ? [1, ...uniqueValues] : uniqueValues

  let streak = 1

  for (let index = 1; index < lowAwareValues.length; index += 1) {
    const previous = lowAwareValues[index - 1]
    const current = lowAwareValues[index]

    if (current === previous + 1) {
      streak += 1
      if (streak >= 5) {
        return true
      }
    } else if (current !== previous) {
      streak = 1
    }
  }

  return false
}

function hasOpenEndedStraightDraw(values: number[]) {
  const uniqueValues = Array.from(new Set(values))
  const lowAwareValues = uniqueValues.includes(14) ? [1, ...uniqueValues] : uniqueValues
  const valueSet = new Set(lowAwareValues)

  for (let start = 1; start <= 11; start += 1) {
    if (
      valueSet.has(start) &&
      valueSet.has(start + 1) &&
      valueSet.has(start + 2) &&
      valueSet.has(start + 3)
    ) {
      return true
    }
  }

  return false
}

function hasGutshot(values: number[]) {
  const uniqueValues = Array.from(new Set(values))
  const lowAwareValues = uniqueValues.includes(14) ? [1, ...uniqueValues] : uniqueValues
  const valueSet = new Set(lowAwareValues)

  for (let start = 1; start <= 10; start += 1) {
    let matches = 0

    for (let offset = 0; offset < 5; offset += 1) {
      if (valueSet.has(start + offset)) {
        matches += 1
      }
    }

    if (matches === 4) {
      return true
    }
  }

  return false
}

function getMadeHandCategory(cards: CardCode[]): MadeHandCategory {
  const ranks = cards.map((card) => card[0] as RangeRank)
  const suits = cards.map((card) => card[1] as CardSuit)
  const rankCounts = Array.from(countBy(ranks).values()).sort((left, right) => right - left)
  const suitCounts = countBy(suits)
  const values = ranks.map(getRankValue)
  const flushSuit = Array.from(suitCounts.entries()).find(([, count]) => count >= 5)?.[0]
  const flushValues = flushSuit
    ? cards
        .filter((card) => card[1] === flushSuit)
        .map((card) => getRankValue(card[0] as RangeRank))
    : []

  if (flushSuit && hasStraight(flushValues)) {
    return 'straight_flush'
  }

  if (rankCounts[0] === 4) {
    return 'quads'
  }

  if (rankCounts[0] === 3 && rankCounts[1] && rankCounts[1] >= 2) {
    return 'full_house'
  }

  if (flushSuit) {
    return 'flush'
  }

  if (hasStraight(values)) {
    return 'straight'
  }

  if (rankCounts[0] === 3) {
    return 'trips'
  }

  if (rankCounts.filter((count) => count >= 2).length >= 2) {
    return 'two_pair'
  }

  if (rankCounts[0] === 2) {
    return 'pair'
  }

  return 'high_card'
}

function getDrawFlags(cards: CardCode[], boardLength: number) {
  if (boardLength < 3 || boardLength >= 5) {
    return {
      combo_draw: false,
      flush_draw: false,
      gutshot: false,
      oesd: false,
    }
  }

  const ranks = cards.map((card) => card[0] as RangeRank)
  const suits = cards.map((card) => card[1] as CardSuit)
  const suitCounts = Array.from(countBy(suits).values())
  const values = ranks.map(getRankValue)
  const alreadyMadeStraight = hasStraight(values)
  const alreadyMadeFlush = suitCounts.some((count) => count >= 5)
  const flushDraw = !alreadyMadeFlush && suitCounts.some((count) => count === 4)
  const oesd = !alreadyMadeStraight && hasOpenEndedStraightDraw(values)
  const gutshot = !alreadyMadeStraight && !oesd && hasGutshot(values)

  return {
    combo_draw: flushDraw && (oesd || gutshot),
    flush_draw: flushDraw,
    gutshot,
    oesd,
  }
}

function summarizeCategories<TCategory extends string, TCombo extends ConcreteCombo>(
  categories: readonly TCategory[],
  combos: TCombo[],
  bucketSelector: (combo: TCombo) => TCategory[],
): CategorySummary<TCategory>[] {
  const buckets = new Map<TCategory, ConcreteCombo[]>()

  for (const category of categories) {
    buckets.set(category, [])
  }

  for (const combo of combos) {
    const comboCategories = bucketSelector(combo)

    for (const category of comboCategories) {
      buckets.get(category)?.push(combo)
    }
  }

  return categories
    .map((category) => {
      const bucket = buckets.get(category) ?? []

      return {
        category,
        count: bucket.length,
        examples: bucket.slice(0, 3).map((combo) => combo.combo),
        share: combos.length === 0 ? 0 : bucket.length / combos.length,
      }
    })
    .filter((summary) => summary.count > 0)
}

export function getRangeCell(rowIndex: number, columnIndex: number): RangeGridCell {
  const rowRank = rangeRanks[rowIndex]
  const columnRank = rangeRanks[columnIndex]

  if (rowRank === undefined || columnRank === undefined) {
    throw new Error(`Range grid indices out of bounds: ${rowIndex}, ${columnIndex}`)
  }

  if (rowIndex === columnIndex) {
    return {
      kind: 'pair',
      label: `${rowRank}${columnRank}`,
    }
  }

  if (rowIndex < columnIndex) {
    return {
      kind: 'suited',
      label: `${rowRank}${columnRank}s`,
    }
  }

  return {
    kind: 'offsuit',
    label: `${columnRank}${rowRank}o`,
  }
}

export function getRangeGrid() {
  return rangeRanks.map((_, rowIndex) =>
    rangeRanks.map((__, columnIndex) => getRangeCell(rowIndex, columnIndex)),
  )
}

export function expandRangeCell(label: string): ConcreteCombo[] {
  const { kind, rankA, rankB } = parseCellLabel(label)

  if (kind === 'pair') {
    const combos: ConcreteCombo[] = []

    for (let firstIndex = 0; firstIndex < cardSuits.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < cardSuits.length; secondIndex += 1) {
        const firstCard = makeCard(rankA, cardSuits[firstIndex])
        const secondCard = makeCard(rankB, cardSuits[secondIndex])

        combos.push({
          cards: [firstCard, secondCard],
          combo: `${firstCard}${secondCard}`,
          label,
        })
      }
    }

    return combos
  }

  if (kind === 'suited') {
    return cardSuits.map((suit) => {
      const firstCard = makeCard(rankA, suit)
      const secondCard = makeCard(rankB, suit)

      return {
        cards: [firstCard, secondCard],
        combo: `${firstCard}${secondCard}`,
        label,
      }
    })
  }

  const combos: ConcreteCombo[] = []

  for (const firstSuit of cardSuits) {
    for (const secondSuit of cardSuits) {
      if (firstSuit === secondSuit) {
        continue
      }

      const firstCard = makeCard(rankA, firstSuit)
      const secondCard = makeCard(rankB, secondSuit)

      combos.push({
        cards: [firstCard, secondCard],
        combo: `${firstCard}${secondCard}`,
        label,
      })
    }
  }

  return combos
}

export function getPresetRangeCells(preset: RangePreset) {
  const selected = new Set<string>()

  for (let rowIndex = 0; rowIndex < rangeRanks.length; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < rangeRanks.length; columnIndex += 1) {
      const cell = getRangeCell(rowIndex, columnIndex)
      const [rankA, rankB] = cell.label
      const rankAValue = getRankValue(rankA as RangeRank)
      const rankBValue = getRankValue(rankB as RangeRank)
      const broadway = rankAValue >= 10 && rankBValue >= 10
      const suitedConnector =
        cell.kind === 'suited' && rankA !== rankB && Math.abs(rankAValue - rankBValue) === 1

      switch (preset) {
        case 'clear':
          break
        case 'all':
          selected.add(cell.label)
          break
        case 'pairs':
          if (cell.kind === 'pair') {
            selected.add(cell.label)
          }
          break
        case 'suited':
          if (cell.kind === 'suited') {
            selected.add(cell.label)
          }
          break
        case 'offsuit':
          if (cell.kind === 'offsuit') {
            selected.add(cell.label)
          }
          break
        case 'broadways':
          if (broadway) {
            selected.add(cell.label)
          }
          break
        case 'axs':
          if (cell.kind === 'suited' && rankA === 'A') {
            selected.add(cell.label)
          }
          break
        case '99plus':
          if (cell.kind === 'pair' && rankAValue >= 9) {
            selected.add(cell.label)
          }
          break
        case 'ttplus':
          if (cell.kind === 'pair' && rankAValue >= 10) {
            selected.add(cell.label)
          }
          break
        case 'suited_connectors':
          if (suitedConnector) {
            selected.add(cell.label)
          }
          break
      }
    }
  }

  return Array.from(selected)
}

export function getCardOptions() {
  return rangeRanks.flatMap((rank) => cardSuits.map((suit) => makeCard(rank, suit)))
}

export function analyzeRange(selectedCells: string[], boardSlots: ReadonlyArray<CardCode | ''>) {
  const board = boardSlots.filter((card): card is CardCode => card !== '')
  const boardSet = new Set(board)
  const rawCombos = selectedCells.flatMap((cell) => expandRangeCell(cell))
  const liveCombos = rawCombos.filter(
    (combo) => !combo.cards.some((card) => boardSet.has(card)),
  )

  const combosWithHands = board.length >= 3
    ? liveCombos.map((combo) => ({
        ...combo,
        drawFlags: getDrawFlags([...combo.cards, ...board], board.length),
        madeHand: getMadeHandCategory([...combo.cards, ...board]),
      }))
    : []

  return {
    blockedComboCount: rawCombos.length - liveCombos.length,
    board,
    drawSummaries:
      board.length >= 3
        ? summarizeCategories(drawOrder, combosWithHands, (combo) =>
            drawOrder.filter((category) => combo.drawFlags[category]),
          )
        : [],
    liveComboCount: liveCombos.length,
    madeHandSummaries:
      board.length >= 3
        ? summarizeCategories(madeHandOrder, combosWithHands, (combo) => [combo.madeHand])
        : [],
    postflopReady: board.length >= 3,
    rawComboCount: rawCombos.length,
    selectedCellCount: selectedCells.length,
  } satisfies RangeAnalysis
}

export function getMadeHandLabel(category: MadeHandCategory) {
  switch (category) {
    case 'straight_flush':
      return 'Стрит-флеш'
    case 'quads':
      return 'Каре'
    case 'full_house':
      return 'Фулл-хаус'
    case 'flush':
      return 'Флеш'
    case 'straight':
      return 'Стрит'
    case 'trips':
      return 'Трипс / сет'
    case 'two_pair':
      return 'Две пары'
    case 'pair':
      return 'Одна пара'
    case 'high_card':
      return 'Хай-кард'
  }
}

export function getDrawLabel(category: DrawCategory) {
  switch (category) {
    case 'combo_draw':
      return 'Комбо-дро'
    case 'flush_draw':
      return 'Флеш-дро'
    case 'oesd':
      return 'Стрит-дро'
    case 'gutshot':
      return 'Гатшот'
  }
}
