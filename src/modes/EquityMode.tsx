import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { EditableNumberField } from '../components/EditableNumberField'
import { HeroActionChips } from '../components/HeroActionChips'
import {
  getCardOptions,
  getPresetRangeWeights,
  getRangeCellWeight,
  getRangeGrid,
  listSelectedRangeCells,
  rangeRanks,
  type CardCode,
  type RangeSelectionWeights,
} from '../lib/combinatorics'
import {
  calculateEquity,
  getInputCombos,
  type EquityInputMode,
  type EquityResult,
} from '../lib/equity'
import { formatDecimal, formatInteger, formatShare } from '../lib/formatters'
import type { DisplayMode } from '../lib/pokerMath'

const suitGlyphMap = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
} as const

const boardLabels = ['Флоп 1', 'Флоп 2', 'Флоп 3', 'Тёрн', 'Ривер'] as const
const exactHandLabels = ['Карта 1', 'Карта 2'] as const
const rangeGrid = getRangeGrid()
const cardOptions = getCardOptions()
const rangeWeightSteps = [0.25, 0.5, 0.75, 1] as const

const equityHeroActions = [
  { href: '#equity-inputs', label: 'Ввод' },
  { href: '#equity-board', label: 'Борд' },
  { href: '#equity-results', label: 'Результат' },
]

const presetButtons = [
  { label: 'Очистить', preset: 'clear' as const },
  { label: 'Все руки', preset: 'all' as const },
  { label: 'Пары', preset: 'pairs' as const },
  { label: 'Suited', preset: 'suited' as const },
  { label: 'Broadways', preset: 'broadways' as const },
  { label: 'Axs', preset: 'axs' as const },
  { label: '99+', preset: '99plus' as const },
  { label: 'Suited connectors', preset: 'suited_connectors' as const },
] as const

type EquityModeProps = {
  displayMode: DisplayMode
  embedded?: boolean
  initialBoardCards?: Array<CardCode | ''>
  initialHeroMode?: EquityInputMode
  initialHeroRange?: RangeSelectionWeights
}

type EquityWorkerResponse = {
  requestId: number
  result: EquityResult
}

function sanitizeExactHand(
  hand: [CardCode | '', CardCode | ''],
  boardCards: Array<CardCode | ''>,
  otherMode: EquityInputMode,
  otherHand: [CardCode | '', CardCode | ''],
) {
  const blockedCards = new Set<CardCode>(boardCards.filter((card): card is CardCode => card !== ''))

  if (otherMode === 'hand') {
    for (const card of otherHand) {
      if (card !== '') {
        blockedCards.add(card)
      }
    }
  }

  const seenCards = new Set<CardCode>()
  const nextHand = [...hand] as [CardCode | '', CardCode | '']

  for (let index = 0; index < nextHand.length; index += 1) {
    const card = nextHand[index]

    if (card === '') {
      continue
    }

    if (blockedCards.has(card) || seenCards.has(card)) {
      nextHand[index] = ''
      continue
    }

    seenCards.add(card)
  }

  return nextHand
}

function handsDiffer(
  left: [CardCode | '', CardCode | ''],
  right: [CardCode | '', CardCode | ''],
) {
  return left[0] !== right[0] || left[1] !== right[1]
}

function formatCard(card: CardCode) {
  return `${card[0]}${suitGlyphMap[card[1] as keyof typeof suitGlyphMap]}`
}

function describeHand(cards: [CardCode | '', CardCode | '']) {
  const [firstCard, secondCard] = cards

  if (firstCard === '' || secondCard === '') {
    return 'рука не задана'
  }

  return `${formatCard(firstCard)} ${formatCard(secondCard)}`
}

function getBoardStageLabel(boardCount: number) {
  if (boardCount >= 5) {
    return 'Ривер'
  }

  if (boardCount === 4) {
    return 'Тёрн'
  }

  if (boardCount === 3) {
    return 'Флоп'
  }

  if (boardCount > 0) {
    return 'Префлоп + блокеры'
  }

  return 'Префлоп'
}

function formatWeightLabel(weight: number) {
  return `${Math.round(weight * 100)}%`
}

function sumComboWeights(combos: Array<{ weight: number }>) {
  return combos.reduce((total, combo) => total + combo.weight, 0)
}

function countSelectedRangeCells(selection: RangeSelectionWeights) {
  return listSelectedRangeCells(selection).length
}

export function EquityMode({
  displayMode,
  embedded = false,
  initialBoardCards,
  initialHeroMode = 'hand',
  initialHeroRange,
}: EquityModeProps) {
  const [heroMode, setHeroMode] = useState<EquityInputMode>(initialHeroMode)
  const [villainMode, setVillainMode] = useState<EquityInputMode>('range')
  const [heroHand, setHeroHand] = useState<[CardCode | '', CardCode | '']>(['Ah', 'Ad'])
  const [villainHand, setVillainHand] = useState<[CardCode | '', CardCode | '']>(['Kh', 'Kd'])
  const [heroRange, setHeroRange] = useState<RangeSelectionWeights>(() =>
    initialHeroRange === undefined ? getPresetRangeWeights('99plus') : { ...initialHeroRange },
  )
  const [villainRange, setVillainRange] = useState<RangeSelectionWeights>(() => ({
    ...getPresetRangeWeights('broadways'),
    ...getPresetRangeWeights('axs'),
  }))
  const [heroBrushWeight, setHeroBrushWeight] = useState<number>(1)
  const [villainBrushWeight, setVillainBrushWeight] = useState<number>(1)
  const [boardCards, setBoardCards] = useState<Array<CardCode | ''>>(() =>
    initialBoardCards === undefined ? ['', '', '', '', ''] : [...initialBoardCards],
  )
  const [iterations, setIterations] = useState(4000)
  const [isPending, setIsPending] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)

  const heroInput = useMemo(
    () => ({
      handCards: heroHand,
      mode: heroMode,
      rangeCells: listSelectedRangeCells(heroRange),
      rangeWeights: heroRange,
    }),
    [heroHand, heroMode, heroRange],
  )

  const villainInput = useMemo(
    () => ({
      handCards: villainHand,
      mode: villainMode,
      rangeCells: listSelectedRangeCells(villainRange),
      rangeWeights: villainRange,
    }),
    [villainHand, villainMode, villainRange],
  )

  const [result, setResult] = useState(() =>
    calculateEquity(heroInput, villainInput, boardCards, iterations),
  )

  const heroPreviewCombos = useMemo(
    () => getInputCombos(heroInput, boardCards),
    [boardCards, heroInput],
  )
  const villainPreviewCombos = useMemo(
    () => getInputCombos(villainInput, boardCards),
    [boardCards, villainInput],
  )
  const heroWeightedCombos = useMemo(
    () => sumComboWeights(heroPreviewCombos),
    [heroPreviewCombos],
  )
  const villainWeightedCombos = useMemo(
    () => sumComboWeights(villainPreviewCombos),
    [villainPreviewCombos],
  )
  const boardStageLabel = getBoardStageLabel(result.board.length)
  const calculationModeLabel = result.calculationMode === 'exact' ? 'Точный' : 'Monte Carlo'

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return
    }

    const worker = new Worker(new URL('../workers/equityWorker.ts', import.meta.url), {
      type: 'module',
    })

    worker.addEventListener('message', (event: MessageEvent<EquityWorkerResponse>) => {
      if (event.data.requestId !== requestIdRef.current) {
        return
      }

      setResult(event.data.result)
      setIsPending(false)
      setIsStale(false)
    })

    workerRef.current = worker

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  function markStale() {
    requestIdRef.current += 1
    setIsPending(false)
    setIsStale(true)
  }

  function syncHands(
    nextBoardCards: Array<CardCode | ''>,
    nextHeroMode: EquityInputMode,
    nextHeroHand: [CardCode | '', CardCode | ''],
    nextVillainMode: EquityInputMode,
    nextVillainHand: [CardCode | '', CardCode | ''],
  ) {
    let sanitizedHeroHand =
      nextHeroMode === 'hand'
        ? sanitizeExactHand(nextHeroHand, nextBoardCards, nextVillainMode, nextVillainHand)
        : nextHeroHand
    const sanitizedVillainHand =
      nextVillainMode === 'hand'
        ? sanitizeExactHand(nextVillainHand, nextBoardCards, nextHeroMode, sanitizedHeroHand)
        : nextVillainHand

    sanitizedHeroHand =
      nextHeroMode === 'hand'
        ? sanitizeExactHand(sanitizedHeroHand, nextBoardCards, nextVillainMode, sanitizedVillainHand)
        : sanitizedHeroHand

    if (handsDiffer(heroHand, sanitizedHeroHand)) {
      setHeroHand(sanitizedHeroHand)
    }

    if (handsDiffer(villainHand, sanitizedVillainHand)) {
      setVillainHand(sanitizedVillainHand)
    }
  }

  function recalculateEquity() {
    const nextRequestId = requestIdRef.current + 1
    requestIdRef.current = nextRequestId
    setIsPending(true)

    if (workerRef.current !== null) {
      workerRef.current.postMessage({
        boardSlots: boardCards,
        heroInput,
        iterations,
        requestId: nextRequestId,
        villainInput,
      })

      return
    }

    const nextResult = calculateEquity(heroInput, villainInput, boardCards, iterations)
    setResult(nextResult)
    setIsPending(false)
    setIsStale(false)
  }

  function applyRangePreset(
    side: 'hero' | 'villain',
    preset: (typeof presetButtons)[number]['preset'],
  ) {
    const nextSelection = getPresetRangeWeights(preset)

    if (side === 'hero') {
      setHeroRange(nextSelection)
    } else {
      setVillainRange(nextSelection)
    }

    markStale()
  }

  function toggleRangeCell(side: 'hero' | 'villain', label: string) {
    const setter = side === 'hero' ? setHeroRange : setVillainRange
    const activeWeight = side === 'hero' ? heroBrushWeight : villainBrushWeight

    setter((currentSelection) => {
      const currentWeight = currentSelection[label] ?? 0
      const nextSelection = { ...currentSelection }

      if (currentWeight === activeWeight) {
        delete nextSelection[label]
      } else {
        nextSelection[label] = activeWeight
      }

      return nextSelection
    })

    markStale()
  }

  function setBoardCard(slotIndex: number, nextValue: string) {
    const nextBoard = [...boardCards]
    nextBoard[slotIndex] = nextValue === '' ? '' : (nextValue as CardCode)
    setBoardCards(nextBoard)
    syncHands(nextBoard, heroMode, heroHand, villainMode, villainHand)
    markStale()
  }

  function clearBoard() {
    const emptyBoard: Array<CardCode | ''> = ['', '', '', '', '']
    setBoardCards(emptyBoard)
    syncHands(emptyBoard, heroMode, heroHand, villainMode, villainHand)
    markStale()
  }

  function setExactHandCard(
    side: 'hero' | 'villain',
    slotIndex: 0 | 1,
    nextValue: string,
  ) {
    const nextHeroHand = [...heroHand] as [CardCode | '', CardCode | '']
    const nextVillainHand = [...villainHand] as [CardCode | '', CardCode | '']
    const nextCard = nextValue === '' ? '' : (nextValue as CardCode)

    if (side === 'hero') {
      nextHeroHand[slotIndex] = nextCard
    } else {
      nextVillainHand[slotIndex] = nextCard
    }

    syncHands(boardCards, heroMode, nextHeroHand, villainMode, nextVillainHand)
    markStale()
  }

  function isCardDisabledForHand(
    side: 'hero' | 'villain',
    slotIndex: number,
    candidateCard: CardCode,
  ) {
    if (boardCards.includes(candidateCard)) {
      return true
    }

    const ownHand = side === 'hero' ? heroHand : villainHand
    const otherHand = side === 'hero' ? villainHand : heroHand
    const otherMode = side === 'hero' ? villainMode : heroMode

    if (ownHand.some((card, index) => index !== slotIndex && card === candidateCard)) {
      return true
    }

    if (otherMode === 'hand' && otherHand.includes(candidateCard)) {
      return true
    }

    return false
  }

  function isBoardCardDisabled(slotIndex: number, candidateCard: CardCode) {
    if (
      boardCards.some((selectedCard, selectedIndex) => {
        if (selectedIndex === slotIndex) {
          return false
        }

        return selectedCard === candidateCard
      })
    ) {
      return true
    }

    if (heroMode === 'hand' && heroHand.includes(candidateCard)) {
      return true
    }

    if (villainMode === 'hand' && villainHand.includes(candidateCard)) {
      return true
    }

    return false
  }

  function renderRangeMatrix(side: 'hero' | 'villain') {
    const rangeSelection = side === 'hero' ? heroRange : villainRange

    return (
      <div className="range-matrix-wrap">
        <div
          className="range-matrix"
          role="grid"
          aria-label={side === 'hero' ? 'Hero range grid' : 'Villain range grid'}
        >
          <div className="range-axis range-corner" aria-hidden="true" />
          {rangeRanks.map((rank) => (
            <div className="range-axis" key={`${side}-col-${rank}`}>
              {rank}
            </div>
          ))}

          {rangeGrid.map((row, rowIndex) => (
            <Fragment key={`${side}-row-${rangeRanks[rowIndex]}`}>
              <div className="range-axis">{rangeRanks[rowIndex]}</div>
              {row.map((cell) => {
                const weight = getRangeCellWeight(rangeSelection, cell.label)
                const selected = weight > 0

                return (
                  <button
                    aria-label={`Toggle ${side} ${cell.label}`}
                    aria-pressed={selected}
                    className={`range-cell ${cell.kind}${selected ? ' active' : ''}`}
                    key={`${side}-${cell.label}`}
                    onClick={() => toggleRangeCell(side, cell.label)}
                    type="button"
                  >
                    <span>{cell.label}</span>
                    {selected ? (
                      <small className="range-cell-weight">{formatWeightLabel(weight)}</small>
                    ) : null}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {embedded ? null : (
        <header className="hero-panel surface equity-hero">
          <div className="hero-copy">
            <p className="eyebrow">Эквити</p>
            <h1>Рука vs рука, рука vs рендж и рендж vs рендж.</h1>
            <p className="hero-text">
              Это уже PokerStove-подобный модуль: задаёшь hero, villain и борд, а калькулятор
              считает эквити с учётом блокеров, весов диапазона и доверительного интервала.
            </p>
            <HeroActionChips
              ariaLabel="Быстрые переходы equity-режима"
              items={equityHeroActions}
            />
          </div>

          <div className="hero-focus equity-focus">
            <p className="focus-label">Текущий спот</p>
            <p className="focus-size">
              {formatShare(result.heroEquity, displayMode)} /{' '}
              {formatShare(result.villainEquity, displayMode)}
            </p>
            <p className="focus-subtitle">
              Hero сейчас играет{' '}
              <strong>
                {heroMode === 'hand'
                  ? describeHand(heroHand)
                  : `${formatDecimal(heroWeightedCombos)} взвеш. комбо`}
              </strong>{' '}
              против{' '}
              <strong>
                {villainMode === 'hand'
                  ? describeHand(villainHand)
                  : `${formatDecimal(villainWeightedCombos)} взвеш. комбо`}
              </strong>
              .
            </p>
            <div className="focus-metrics">
              <div>
                <span>Валидных матчапов</span>
                <strong>{formatInteger(result.validMatchups)}</strong>
              </div>
              <div>
                <span>Точность</span>
                <strong>
                  {result.calculationMode === 'exact'
                    ? 'точно'
                    : `±${formatDecimal(result.confidenceInterval.halfWidth * 100)} п.п.`}
                </strong>
              </div>
              <div>
                <span>Статус</span>
                <strong>{isPending ? 'считает' : isStale ? 'нужно обновить' : 'актуально'}</strong>
              </div>
            </div>
          </div>
        </header>
      )}

      <section className="advanced-layout equity-layout jump-target" id="equity-inputs">
        <section className="surface equity-panel">
          <div className="section-head compact">
            <div>
              <p className="kicker">Hero</p>
              <h2>Твоя сторона расчёта</h2>
            </div>
            <p className="table-note">
              Можно задать конкретную руку или целый диапазон классами рук с весами.
            </p>
          </div>

          <div className="inventory-switch" role="group" aria-label="Hero input mode">
            <button
              aria-pressed={heroMode === 'hand'}
              className={heroMode === 'hand' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => {
                setHeroMode('hand')
                syncHands(boardCards, 'hand', heroHand, villainMode, villainHand)
                markStale()
              }}
              type="button"
            >
              Рука
            </button>
            <button
              aria-pressed={heroMode === 'range'}
              className={heroMode === 'range' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => {
                setHeroMode('range')
                syncHands(boardCards, 'range', heroHand, villainMode, villainHand)
                markStale()
              }}
              type="button"
            >
              Рендж
            </button>
          </div>

          {heroMode === 'hand' ? (
            <div className="board-control-grid equity-hand-grid">
              {exactHandLabels.map((label, index) => (
                <label className="board-field" key={label}>
                  <span>{label}</span>
                  <select
                    aria-label={`Hero ${label}`}
                    onChange={(event) =>
                      setExactHandCard('hero', index as 0 | 1, event.target.value)
                    }
                    value={heroHand[index]}
                  >
                    <option value="">—</option>
                    {cardOptions.map((card) => (
                      <option
                        disabled={isCardDisabledForHand('hero', index, card)}
                        key={card}
                        value={card}
                      >
                        {formatCard(card)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : (
            <>
              <div className="combo-presets" role="group" aria-label="Hero range presets">
                {presetButtons.map((preset) => (
                  <button
                    className="mode-chip"
                    key={`hero-${preset.label}`}
                    onClick={() => applyRangePreset('hero', preset.preset)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="combo-presets" role="group" aria-label="Hero weight brush">
                {rangeWeightSteps.map((weight) => (
                  <button
                    className={heroBrushWeight === weight ? 'mode-chip active' : 'mode-chip'}
                    key={`hero-weight-${weight}`}
                    onClick={() => setHeroBrushWeight(weight)}
                    type="button"
                  >
                    Кисть {formatWeightLabel(weight)}
                  </button>
                ))}
              </div>

              {renderRangeMatrix('hero')}
            </>
          )}

          <p className="footnote">
            Hero сейчас даёт <strong>{formatInteger(heroPreviewCombos.length)}</strong> live-комбо,
            эффективно <strong>{formatDecimal(heroWeightedCombos)}</strong>.
          </p>

          <div className="equity-side-summary" aria-label="Hero range summary">
            <div>
              <span>Режим</span>
              <strong>{heroMode === 'hand' ? 'Точная рука' : 'Диапазон'}</strong>
            </div>
            <div>
              <span>Стартовая точка</span>
              <strong>
                {heroMode === 'hand'
                  ? describeHand(heroHand)
                  : `${formatInteger(countSelectedRangeCells(heroRange))} классов рук`}
              </strong>
            </div>
            <div>
              <span>Живые комбо</span>
              <strong>{formatDecimal(heroWeightedCombos)}</strong>
            </div>
          </div>
        </section>

        <section className="surface equity-panel">
          <div className="section-head compact">
            <div>
              <p className="kicker">Villain</p>
              <h2>Оппонент</h2>
            </div>
            <p className="table-note">
              Тот же принцип: конкретная рука или диапазон с разной долей микса.
            </p>
          </div>

          <div className="inventory-switch" role="group" aria-label="Villain input mode">
            <button
              aria-pressed={villainMode === 'hand'}
              className={villainMode === 'hand' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => {
                setVillainMode('hand')
                syncHands(boardCards, heroMode, heroHand, 'hand', villainHand)
                markStale()
              }}
              type="button"
            >
              Рука
            </button>
            <button
              aria-pressed={villainMode === 'range'}
              className={villainMode === 'range' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => {
                setVillainMode('range')
                syncHands(boardCards, heroMode, heroHand, 'range', villainHand)
                markStale()
              }}
              type="button"
            >
              Рендж
            </button>
          </div>

          {villainMode === 'hand' ? (
            <div className="board-control-grid equity-hand-grid">
              {exactHandLabels.map((label, index) => (
                <label className="board-field" key={`villain-${label}`}>
                  <span>{label}</span>
                  <select
                    aria-label={`Villain ${label}`}
                    onChange={(event) =>
                      setExactHandCard('villain', index as 0 | 1, event.target.value)
                    }
                    value={villainHand[index]}
                  >
                    <option value="">—</option>
                    {cardOptions.map((card) => (
                      <option
                        disabled={isCardDisabledForHand('villain', index, card)}
                        key={`villain-card-${card}`}
                        value={card}
                      >
                        {formatCard(card)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : (
            <>
              <div className="combo-presets" role="group" aria-label="Villain range presets">
                {presetButtons.map((preset) => (
                  <button
                    className="mode-chip"
                    key={`villain-${preset.label}`}
                    onClick={() => applyRangePreset('villain', preset.preset)}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="combo-presets" role="group" aria-label="Villain weight brush">
                {rangeWeightSteps.map((weight) => (
                  <button
                    className={villainBrushWeight === weight ? 'mode-chip active' : 'mode-chip'}
                    key={`villain-weight-${weight}`}
                    onClick={() => setVillainBrushWeight(weight)}
                    type="button"
                  >
                    Кисть {formatWeightLabel(weight)}
                  </button>
                ))}
              </div>

              {renderRangeMatrix('villain')}
            </>
          )}

          <p className="footnote">
            Villain сейчас даёт <strong>{formatInteger(villainPreviewCombos.length)}</strong>{' '}
            live-комбо, эффективно <strong>{formatDecimal(villainWeightedCombos)}</strong>.
          </p>

          <div className="equity-side-summary" aria-label="Villain range summary">
            <div>
              <span>Режим</span>
              <strong>{villainMode === 'hand' ? 'Точная рука' : 'Диапазон'}</strong>
            </div>
            <div>
              <span>Стартовая точка</span>
              <strong>
                {villainMode === 'hand'
                  ? describeHand(villainHand)
                  : `${formatInteger(countSelectedRangeCells(villainRange))} классов рук`}
              </strong>
            </div>
            <div>
              <span>Живые комбо</span>
              <strong>{formatDecimal(villainWeightedCombos)}</strong>
            </div>
          </div>
        </section>
      </section>

      <section className="surface jump-target" id="equity-board">
        <div className="section-head compact">
          <div>
            <p className="kicker">Борд и запуск</p>
            <h2>Доска, блокеры и точность расчёта</h2>
          </div>
          <p className="table-note">
            Если exact enumeration укладывается в безопасный объём, движок считает точно даже
            на неполном борде. Иначе уходит в Monte Carlo с адаптивным числом сэмплов.
          </p>
        </div>

        <div className="advanced-meta-strip" aria-label="Сводка эквити">
          <div className="advanced-meta-pill">
            <span>Стадия</span>
            <strong>{boardStageLabel}</strong>
          </div>
          <div className="advanced-meta-pill">
            <span>Режим расчёта</span>
            <strong>{calculationModeLabel}</strong>
          </div>
          <div className="advanced-meta-pill">
            <span>Матчапы</span>
            <strong>
              {formatInteger(result.validMatchups)} / {formatDecimal(result.weightedMatchups)}
            </strong>
          </div>
          <div className="advanced-meta-pill">
            <span>Статус</span>
            <strong>{isPending ? 'Считает' : isStale ? 'Нужно обновить' : 'Актуально'}</strong>
          </div>
        </div>

        <div className="board-control-grid">
          {boardLabels.map((label, index) => (
            <label className="board-field" key={label}>
              <span>{label}</span>
              <select
                aria-label={label}
                onChange={(event) => setBoardCard(index, event.target.value)}
                value={boardCards[index]}
              >
                <option value="">—</option>
                {cardOptions.map((card) => (
                  <option
                    disabled={isBoardCardDisabled(index, card)}
                    key={`board-${card}`}
                    value={card}
                  >
                    {formatCard(card)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="equity-toolbar">
          <EditableNumberField
            className="number-field compact-field"
            inputMin={100}
            label="Базовый бюджет сэмплов"
            onValueChange={(nextValue) => {
              setIterations(nextValue)
              markStale()
            }}
            sanitizeMin={100}
            value={iterations}
          />

          <div className="combo-board-toolbar">
            <button className="mode-chip" onClick={clearBoard} type="button">
              Очистить борд
            </button>
            <button
              className="mode-chip active"
              disabled={isPending}
              onClick={recalculateEquity}
              type="button"
            >
              {isPending ? 'Считает…' : 'Пересчитать equity'}
            </button>
          </div>
        </div>

        <p
          aria-live="polite"
          className={result.validMatchups === 0 ? 'equity-status-note warning' : 'equity-status-note'}
        >
          {result.validMatchups === 0
            ? 'Сейчас нет валидных матчапов: проверь пересечения карт между hero, villain и бордом или пустой диапазон.'
            : isPending
              ? 'Идёт пересчёт equity в фоне.'
              : isStale
                ? 'Параметры изменились: текущие equity-цифры уже устарели, нажми «Пересчитать equity».'
                : 'Текущий результат соответствует выбранным рукам, диапазонам и борду.'}
        </p>

        <p className="igor-summary">
          Мнемоника: здесь уже важна не только точка equity, но и доверие к ней. Exact-режим даёт
          нулевой интервал ошибки, а Monte Carlo показывает, насколько ещё шумит оценка.
        </p>
      </section>

      <section className="summary-grid jump-target" id="equity-results">
        <article className="result-card primary">
          <p className="card-label">Hero equity</p>
          <h3>{formatShare(result.heroEquity, displayMode)}</h3>
          <p>
            Win <strong>{formatShare(result.heroWinRate, displayMode)}</strong>, tie{' '}
            <strong>{formatShare(result.tieRate, displayMode)}</strong>.
          </p>
        </article>

        <article className="result-card">
          <p className="card-label">Villain equity</p>
          <h3>{formatShare(result.villainEquity, displayMode)}</h3>
          <p>
            Win <strong>{formatShare(result.villainWinRate, displayMode)}</strong>, tie{' '}
            <strong>{formatShare(result.tieRate, displayMode)}</strong>.
          </p>
        </article>

        <article className="result-card">
          <p className="card-label">Confidence interval</p>
          <h3>
            {formatShare(result.confidenceInterval.low, displayMode)} -{' '}
            {formatShare(result.confidenceInterval.high, displayMode)}
          </h3>
          <p>
            {result.calculationMode === 'exact'
              ? 'Точный режим: интервал схлопнулся в одну точку.'
              : `Ширина сейчас около ±${formatDecimal(result.confidenceInterval.halfWidth * 100)} п.п.`}
          </p>
        </article>

        <article className="result-card">
          <p className="card-label">Сэмплы и план</p>
          <h3>{calculationModeLabel}</h3>
          <p>
            Использовано <strong>{formatInteger(result.sampledTrials)}</strong> из плана{' '}
            <strong>{formatInteger(result.plannedTrials)}</strong>.
          </p>
        </article>
      </section>
    </>
  )
}
