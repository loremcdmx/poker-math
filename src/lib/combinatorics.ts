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
export type BackdoorCategory = 'backdoor_flush' | 'backdoor_straight'
export type EmptyCategory = 'air'
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

export type WeightedConcreteCombo = ConcreteCombo & {
  weight: number
}

export type RangeSelectionWeights = Record<string, number>

export type CategorySummary<TCategory extends string> = {
  category: TCategory
  count: number
  examples: string[]
  share: number
}

export type BoardTextureTag = {
  description: string
  label: string
}

export type BoardTextureSummary = {
  airShare: number
  drawShare: number
  pairPlusShare: number
  strongMadeHandShare: number
  tags: BoardTextureTag[]
  topPairPlusShare: number
}

export type RangeAnalysis = {
  backdoorSummaries: CategorySummary<BackdoorCategory>[]
  blockedComboCount: number
  board: CardCode[]
  boardTexture: BoardTextureSummary | null
  drawSummaries: CategorySummary<DrawCategory>[]
  emptySummary: CategorySummary<EmptyCategory> | null
  liveComboCount: number
  madeHandSummaries: CategorySummary<MadeHandCategory>[]
  postflopReady: boolean
  rawComboCount: number
  selectedCellCount: number
  street: 'preflop' | 'flop' | 'turn' | 'river'
  weightedBlockedComboCount: number
  weightedLiveComboCount: number
  weightedRawComboCount: number
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
]

const drawOrder: DrawCategory[] = ['combo_draw', 'flush_draw', 'oesd', 'gutshot']
const backdoorOrder: BackdoorCategory[] = ['backdoor_flush', 'backdoor_straight']

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

function getStraightDrawCompleters(values: number[]) {
  const uniqueValues = Array.from(new Set(values))
  const lowAwareValues = uniqueValues.includes(14) ? [1, ...uniqueValues] : uniqueValues
  const valueSet = new Set(lowAwareValues)
  const completers = new Set<number>()

  for (let start = 1; start <= 10; start += 1) {
    const windowValues = [start, start + 1, start + 2, start + 3, start + 4]
    const missingValues = windowValues.filter((value) => !valueSet.has(value))

    if (missingValues.length === 1) {
      completers.add(missingValues[0])
    }
  }

  return completers
}

function hasOpenEndedStraightDraw(values: number[]) {
  return getStraightDrawCompleters(values).size >= 2
}

function hasGutshot(values: number[]) {
  return getStraightDrawCompleters(values).size === 1
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

function getBackdoorFlags(cards: CardCode[], boardLength: number) {
  if (boardLength !== 3) {
    return { backdoor_flush: false, backdoor_straight: false }
  }

  const ranks = cards.map((card) => card[0] as RangeRank)
  const suits = cards.map((card) => card[1] as CardSuit)
  const suitCounts = Array.from(countBy(suits).values())
  const values = ranks.map(getRankValue)

  const maxSuit = Math.max(0, ...suitCounts)
  const backdoorFlush = maxSuit === 3

  const backdoorStraight = (() => {
    const unique = Array.from(new Set(values)).sort((left, right) => left - right)
    if (unique.length < 3) {
      return false
    }

    const expanded = unique.includes(14) ? [...unique, 1] : unique
    const sorted = Array.from(new Set(expanded)).sort((left, right) => left - right)

    for (let index = 0; index <= sorted.length - 3; index += 1) {
      if (sorted[index + 2] - sorted[index] <= 4) {
        return true
      }
    }

    return false
  })()

  return {
    backdoor_flush: backdoorFlush,
    backdoor_straight: backdoorStraight,
  }
}

function clampWeight(weight: number) {
  if (!Number.isFinite(weight)) {
    return 0
  }

  return Math.min(1, Math.max(0, weight))
}

function sumComboWeights<TCombo extends { weight?: number }>(combos: TCombo[]) {
  return combos.reduce((total, combo) => total + (combo.weight ?? 1), 0)
}

function getRangeSelectionEntries(selection: string[] | RangeSelectionWeights) {
  if (Array.isArray(selection)) {
    return selection.map((label) => [label, 1] as const)
  }

  return Object.entries(selection)
    .map(([label, weight]) => [label, clampWeight(weight)] as const)
    .filter(([, weight]) => weight > 0)
}

function isStrongMadeHand(category: MadeHandCategory) {
  return (
    category === 'straight_flush' ||
    category === 'quads' ||
    category === 'full_house' ||
    category === 'flush' ||
    category === 'straight' ||
    category === 'trips' ||
    category === 'two_pair'
  )
}

function hasTopPairOrBetter(
  combo: WeightedConcreteCombo,
  board: CardCode[],
  madeHand: MadeHandCategory,
) {
  if (madeHand !== 'pair') {
    return madeHand !== 'high_card'
  }

  const boardTopRank = Math.max(...board.map((card) => getRankValue(card[0] as RangeRank)))
  const heroRanks = combo.cards.map((card) => getRankValue(card[0] as RangeRank))
  const pocketPair = heroRanks[0] === heroRanks[1]

  if (pocketPair && heroRanks[0] > boardTopRank) {
    return true
  }

  return heroRanks.some((rank) => rank === boardTopRank)
}

function describeSuitTexture(board: CardCode[]): BoardTextureTag {
  const suitCounts = Array.from(countBy(board.map((card) => card[1] as CardSuit)).values()).sort(
    (left, right) => right - left,
  )
  const highestCount = suitCounts[0] ?? 0

  if (highestCount >= 4) {
    return {
      description: 'На борде уже четыре карты одной масти, флешевые runout-ы сильно зажаты.',
      label: '4 к масти',
    }
  }

  if (highestCount === 3) {
    return {
      description: 'Монотонный борд: флеши и флеш-дро приходят сразу.',
      label: 'монотонный',
    }
  }

  if (highestCount === 2) {
    return {
      description: 'Двухмастный борд: часть диапазона получает flush draw прямо сейчас.',
      label: 'двухмастный',
    }
  }

  return {
    description: 'Радужный борд: по мастям текстура пока сухая.',
    label: 'радужный',
  }
}

function describePairTexture(board: CardCode[]): BoardTextureTag {
  const rankCounts = Array.from(countBy(board.map((card) => card[0] as RangeRank)).values()).sort(
    (left, right) => right - left,
  )

  if ((rankCounts[0] ?? 0) >= 3) {
    return {
      description: 'На борде уже три карты одного достоинства, диапазоны резко поляризуются по кикерам.',
      label: 'трипс на борде',
    }
  }

  if (rankCounts.filter((count) => count >= 2).length >= 2) {
    return {
      description: 'Две пары на борде: value-часть диапазона быстро уплотняется.',
      label: 'двойной спаренный',
    }
  }

  if ((rankCounts[0] ?? 0) === 2) {
    return {
      description: 'Спаренный борд усиливает trips/full house-ветки.',
      label: 'спаренный',
    }
  }

  return {
    description: 'Несдвоенный борд: value чаще строится вокруг top pair, overpair и дро.',
    label: 'неспаренный',
  }
}

function describeConnectivity(board: CardCode[]): BoardTextureTag {
  const values = Array.from(
    new Set(board.map((card) => getRankValue(card[0] as RangeRank))),
  ).sort((left, right) => left - right)
  const span = (values[values.length - 1] ?? 0) - (values[0] ?? 0)

  if (values.length >= 3 && span <= 4) {
    return {
      description: 'Карты стоят близко друг к другу, поэтому straight draw-ветки очень живые.',
      label: 'связный',
    }
  }

  if (values.length >= 3 && span <= 7) {
    return {
      description: 'Есть средняя связность: часть стрит-дро появляется, но не массово.',
      label: 'полусвязный',
    }
  }

  return {
    description: 'Разрывов много, поэтому борд в основном играет через пары и оверпары.',
    label: 'сухой по стритам',
  }
}

function describeBoardHeight(board: CardCode[]): BoardTextureTag {
  const highestRank = Math.max(...board.map((card) => getRankValue(card[0] as RangeRank)))

  if (highestRank >= 14) {
    return {
      description: 'A-high текстура сильнее давит на capped-части диапазонов.',
      label: 'A-high',
    }
  }

  if (highestRank >= 12) {
    return {
      description: 'Бродвейный верх борда усиливает broadway-ветки и top-pair value.',
      label: 'broadway-high',
    }
  }

  if (highestRank <= 9) {
    return {
      description: 'Низкий борд чаще делит диапазоны между оверпарами, сетами и дро.',
      label: 'low board',
    }
  }

  return {
    description: 'Средний борд часто даёт смесь equity и middling pair-веток.',
    label: 'mid board',
  }
}

function describeBoardTexture(
  board: CardCode[],
  combosWithHands: Array<
    WeightedConcreteCombo & {
      backdoorFlags?: ReturnType<typeof getBackdoorFlags>
      drawFlags: ReturnType<typeof getDrawFlags>
      isAir?: boolean
      madeHand: MadeHandCategory
    }
  >,
) {
  const totalWeight = sumComboWeights(combosWithHands)

  if (board.length < 3 || totalWeight === 0) {
    return null
  }

  let pairPlusWeight = 0
  let topPairPlusWeight = 0
  let strongMadeHandWeight = 0
  let drawWeight = 0
  let airWeight = 0

  for (const combo of combosWithHands) {
    const comboWeight = combo.weight
    const hasAnyDraw =
      combo.drawFlags.combo_draw ||
      combo.drawFlags.flush_draw ||
      combo.drawFlags.oesd ||
      combo.drawFlags.gutshot

    if (combo.madeHand !== 'high_card') {
      pairPlusWeight += comboWeight
    }

    if (hasTopPairOrBetter(combo, board, combo.madeHand)) {
      topPairPlusWeight += comboWeight
    }

    if (isStrongMadeHand(combo.madeHand)) {
      strongMadeHandWeight += comboWeight
    }

    if (hasAnyDraw) {
      drawWeight += comboWeight
    }

    if (combo.isAir ?? (combo.madeHand === 'high_card' && !hasAnyDraw)) {
      airWeight += comboWeight
    }
  }

  return {
    airShare: airWeight / totalWeight,
    drawShare: drawWeight / totalWeight,
    pairPlusShare: pairPlusWeight / totalWeight,
    strongMadeHandShare: strongMadeHandWeight / totalWeight,
    tags: [
      describeBoardHeight(board),
      describeSuitTexture(board),
      describePairTexture(board),
      describeConnectivity(board),
    ],
    topPairPlusShare: topPairPlusWeight / totalWeight,
  } satisfies BoardTextureSummary
}

function summarizeCategories<
  TCategory extends string,
  TCombo extends ConcreteCombo & { weight?: number },
>(
  categories: readonly TCategory[],
  combos: TCombo[],
  bucketSelector: (combo: TCombo) => TCategory[],
): CategorySummary<TCategory>[] {
  const buckets = new Map<TCategory, { count: number; examples: ConcreteCombo[] }>()
  const totalWeight = sumComboWeights(combos)

  for (const category of categories) {
    buckets.set(category, {
      count: 0,
      examples: [],
    })
  }

  for (const combo of combos) {
    const comboCategories = bucketSelector(combo)
    const comboWeight = (combo as ConcreteCombo & { weight?: number }).weight ?? 1

    for (const category of comboCategories) {
      const bucket = buckets.get(category)

      if (bucket === undefined) {
        continue
      }

      bucket.count += comboWeight

      if (bucket.examples.length < 3) {
        bucket.examples.push(combo)
      }
    }
  }

  return categories
    .map((category) => {
      const bucket = buckets.get(category)

      return {
        category,
        count: bucket?.count ?? 0,
        examples: (bucket?.examples ?? []).map((combo) => combo.combo),
        share: totalWeight === 0 ? 0 : (bucket?.count ?? 0) / totalWeight,
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

export function createRangeSelectionWeights(
  labels: string[],
  weight = 1,
) {
  const normalizedWeight = clampWeight(weight)
  const selection: RangeSelectionWeights = {}

  for (const label of labels) {
    selection[label] = normalizedWeight
  }

  return selection
}

export function getRangeCellWeight(
  selection: string[] | RangeSelectionWeights,
  label: string,
) {
  const entry = getRangeSelectionEntries(selection).find(([entryLabel]) => entryLabel === label)
  return entry?.[1] ?? 0
}

export function listSelectedRangeCells(selection: string[] | RangeSelectionWeights) {
  return getRangeSelectionEntries(selection).map(([label]) => label)
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

export function getPresetRangeWeights(preset: RangePreset, weight = 1) {
  return createRangeSelectionWeights(getPresetRangeCells(preset), weight)
}

export function getCardOptions() {
  return rangeRanks.flatMap((rank) => cardSuits.map((suit) => makeCard(rank, suit)))
}

export function expandWeightedRangeSelection(selection: string[] | RangeSelectionWeights) {
  return getRangeSelectionEntries(selection).flatMap(([label, weight]) =>
    expandRangeCell(label).map(
      (combo) =>
        ({
          ...combo,
          weight,
        }) satisfies WeightedConcreteCombo,
    ),
  )
}

export function analyzeRange(
  selectedCells: string[] | RangeSelectionWeights,
  boardSlots: ReadonlyArray<CardCode | ''>,
) {
  const board = boardSlots.filter((card): card is CardCode => card !== '')
  const boardSet = new Set(board)
  const rawCombos = expandWeightedRangeSelection(selectedCells)
  const liveCombos = rawCombos.filter(
    (combo) => !combo.cards.some((card) => boardSet.has(card)),
  )

  const street: RangeAnalysis['street'] =
    board.length === 5
      ? 'river'
      : board.length === 4
        ? 'turn'
        : board.length === 3
          ? 'flop'
          : 'preflop'

  const combosWithHands =
    board.length >= 3
      ? liveCombos.map((combo) => {
          const allCards = [...combo.cards, ...board]
          const drawFlags = getDrawFlags(allCards, board.length)
          const backdoorFlags = getBackdoorFlags(allCards, board.length)
          const madeHand = getMadeHandCategory(allCards)
          const hasAnyDraw =
            drawFlags.combo_draw || drawFlags.flush_draw || drawFlags.oesd || drawFlags.gutshot
          const hasAnyBackdoor = backdoorFlags.backdoor_flush || backdoorFlags.backdoor_straight
          const isAir = madeHand === 'high_card' && !hasAnyDraw && !hasAnyBackdoor

          return {
            ...combo,
            backdoorFlags,
            drawFlags,
            isAir,
            madeHand,
          }
        })
      : []
  const madeCombos = combosWithHands.filter((combo) => combo.madeHand !== 'high_card')
  const airCombos = combosWithHands.filter((combo) => combo.isAir)
  const emptyWeight = sumComboWeights(airCombos)
  const totalPostflopWeight = sumComboWeights(combosWithHands)

  const emptySummary: CategorySummary<EmptyCategory> | null =
    board.length >= 3 && emptyWeight > 0
      ? {
          category: 'air',
          count: emptyWeight,
          examples: airCombos.slice(0, 3).map((combo) => combo.combo),
          share: totalPostflopWeight === 0 ? 0 : emptyWeight / totalPostflopWeight,
        }
      : null

  return {
    backdoorSummaries:
      board.length === 3
        ? summarizeCategories(backdoorOrder, combosWithHands, (combo) =>
            backdoorOrder.filter((category) => combo.backdoorFlags[category]),
          )
        : [],
    blockedComboCount: rawCombos.length - liveCombos.length,
    board,
    boardTexture: describeBoardTexture(board, combosWithHands),
    drawSummaries:
      board.length >= 3
        ? summarizeCategories(drawOrder, combosWithHands, (combo) =>
            drawOrder.filter((category) => combo.drawFlags[category]),
          )
        : [],
    emptySummary,
    liveComboCount: liveCombos.length,
    madeHandSummaries:
      board.length >= 3
        ? summarizeCategories(madeHandOrder, madeCombos, (combo) => [combo.madeHand])
        : [],
    postflopReady: board.length >= 3,
    rawComboCount: rawCombos.length,
    selectedCellCount: listSelectedRangeCells(selectedCells).length,
    street,
    weightedBlockedComboCount: sumComboWeights(rawCombos) - sumComboWeights(liveCombos),
    weightedLiveComboCount: sumComboWeights(liveCombos),
    weightedRawComboCount: sumComboWeights(rawCombos),
  } satisfies RangeAnalysis
}

export function getBackdoorLabel(category: BackdoorCategory) {
  switch (category) {
    case 'backdoor_flush':
      return 'Бекдор-флеш'
    case 'backdoor_straight':
      return 'Бекдор-стрит'
  }
}

export function getEmptyLabel(category: EmptyCategory) {
  if (category === 'air') {
    return 'Воздух'
  }
  return category
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
