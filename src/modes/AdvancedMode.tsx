import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { EditableNumberField } from '../components/EditableNumberField'
import { HeroActionChips } from '../components/HeroActionChips'
import { formatDecimal, formatInteger, formatShare } from '../lib/formatters'
import {
  analyzeRange,
  cardSuits,
  getPresetRangeWeights,
  getRangeCellWeight,
  getDrawLabel,
  getMadeHandLabel,
  getRangeGrid,
  listSelectedRangeCells,
  rangeRanks,
  type CardCode,
  type CardSuit,
  type RangeSelectionWeights,
} from '../lib/combinatorics'
import { useLocalStorageState } from '../lib/storage'
import type { DisplayMode } from '../lib/pokerMath'
import { EquityMode } from './EquityMode'

const suitGlyphMap = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
} as const

const suitLabelMap: Record<CardSuit, string> = {
  c: 'Трефы',
  d: 'Бубны',
  h: 'Червы',
  s: 'Пики',
}

const boardLabels = ['Флоп 1', 'Флоп 2', 'Флоп 3', 'Тёрн', 'Ривер'] as const
const boardStreetGroups = [
  { label: 'Флоп', slots: [0, 1, 2] as const },
  { label: 'Тёрн', slots: [3] as const },
  { label: 'Ривер', slots: [4] as const },
] as const
const rangeGrid = getRangeGrid()
const rangeGridCells = rangeGrid.flat()
const rangeCellKinds = new Map(rangeGridCells.map((cell) => [cell.label, cell.kind]))
const rangeWeightSteps = [0.25, 0.5, 0.75, 1] as const
const weightComparisonTolerance = 0.0005

type DragMode =
  | {
      kind: 'remove'
    }
  | {
      kind: 'set'
      weight: number
    }
  | null

const presetButtons = [
  { label: 'Очистить', preset: 'clear' as const },
  { label: 'Все руки', preset: 'all' as const },
  { label: 'Пары', preset: 'pairs' as const },
  { label: 'Suited', preset: 'suited' as const },
  { label: 'Offsuit', preset: 'offsuit' as const },
  { label: 'Broadways', preset: 'broadways' as const },
  { label: 'Axs', preset: 'axs' as const },
  { label: '99+', preset: '99plus' as const },
  { label: 'TT+', preset: 'ttplus' as const },
  { label: 'Suited connectors', preset: 'suited_connectors' as const },
] as const

function formatCard(card: CardCode) {
  return `${card[0]}${suitGlyphMap[card[1] as keyof typeof suitGlyphMap]}`
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

function getCardTone(card: CardCode) {
  return card[1] === 'h' || card[1] === 'd' ? 'red' : 'dark'
}

function formatWeightLabel(weight: number) {
  const percent = weight * 100

  if (Math.abs(percent - Math.round(percent)) < 0.001) {
    return `${Math.round(percent)}%`
  }

  if (Math.abs(percent * 10 - Math.round(percent * 10)) < 0.001) {
    return `${percent.toFixed(1)}%`
  }

  return `${percent.toFixed(2)}%`
}

function normalizeWeightPercent(percent: number) {
  if (!Number.isFinite(percent)) {
    return 100
  }

  return Math.min(100, Math.max(0.1, Number(percent.toFixed(2))))
}

function isSameWeight(left: number, right: number) {
  return Math.abs(left - right) < weightComparisonTolerance
}

function getRangeWeightState(weight: number) {
  if (weight >= 0.995) {
    return 'full'
  }

  if (weight >= 0.75) {
    return 'heavy'
  }

  if (weight >= 0.5) {
    return 'medium'
  }

  return 'light'
}

function getRangeWeightFill(weight: number) {
  if (weight >= 0.995) {
    return 'linear-gradient(180deg, rgba(24, 92, 76, 0.96), rgba(15, 58, 48, 0.92))'
  }

  if (weight >= 0.75) {
    return 'linear-gradient(180deg, rgba(52, 132, 118, 0.9), rgba(32, 96, 84, 0.84))'
  }

  if (weight >= 0.5) {
    return 'linear-gradient(180deg, rgba(222, 183, 104, 0.96), rgba(194, 140, 48, 0.88))'
  }

  return 'linear-gradient(180deg, rgba(240, 203, 137, 0.96), rgba(222, 163, 74, 0.9))'
}

function getRangeCellStyle(weight: number): CSSProperties {
  return {
    '--range-weight-fill': getRangeWeightFill(weight),
    '--range-weight-percent': formatWeightLabel(weight),
  } as CSSProperties
}

function ComboCard({ card }: { card: CardCode }) {
  const rank = card[0]
  const suit = card[1] as keyof typeof suitGlyphMap

  return (
    <span className={`combo-card-chip ${getCardTone(card)}`}>
      <span className="combo-card-rank">{rank}</span>
      <span className="combo-card-suit">{suitGlyphMap[suit]}</span>
    </span>
  )
}

function ComboExamples({ examples }: { examples: readonly string[] }) {
  return (
    <div className="combo-examples">
      {examples.map((combo) => {
        const firstCard = combo.slice(0, 2) as CardCode
        const secondCard = combo.slice(2, 4) as CardCode

        return (
          <span className="combo-pair" key={combo}>
            <ComboCard card={firstCard} />
            <ComboCard card={secondCard} />
          </span>
        )
      })}
    </div>
  )
}

type AdvancedModeProps = {
  displayMode: DisplayMode
}

export function AdvancedMode({ displayMode }: AdvancedModeProps) {
  const [advancedSection, setAdvancedSection] = useState<'combos' | 'equity'>('combos')
  const [selectedRange, setSelectedRange] = useLocalStorageState<RangeSelectionWeights>(
    'pokermath.advanced.range',
    () => getPresetRangeWeights('broadways'),
  )
  const [boardCards, setBoardCards] = useLocalStorageState<Array<CardCode | ''>>(
    'pokermath.advanced.board',
    ['', '', '', '', ''],
  )
  const [activeBoardSlot, setActiveBoardSlot] = useState(() => {
    const firstEmpty = boardCards.indexOf('')
    return firstEmpty === -1 ? 0 : firstEmpty
  })
  const [activeWeight, setActiveWeight] = useLocalStorageState<number>(
    'pokermath.advanced.weight-brush',
    1,
  )
  const dragModeRef = useRef<DragMode>(null)
  const [isDragging, setIsDragging] = useState(false)

  const selectedCellLabels = useMemo(() => listSelectedRangeCells(selectedRange), [selectedRange])
  const analysis = useMemo(
    () => analyzeRange(selectedRange, boardCards),
    [boardCards, selectedRange],
  )
  const selectedKindCounts = useMemo(() => {
    const counts = {
      offsuit: 0,
      pair: 0,
      suited: 0,
    }

    for (const label of selectedCellLabels) {
      const kind = rangeCellKinds.get(label)

      if (kind !== undefined) {
        counts[kind] += 1
      }
    }

    return counts
  }, [selectedCellLabels])
  const selectedPreview = useMemo(
    () => selectedCellLabels.slice().sort((left, right) => left.localeCompare(right)).slice(0, 12),
    [selectedCellLabels],
  )
  const selectedWeightTotal = useMemo(
    () =>
      selectedCellLabels.reduce(
        (total, label) => total + getRangeCellWeight(selectedRange, label),
        0,
      ),
    [selectedCellLabels, selectedRange],
  )
  const activeWeightPercent = useMemo(
    () => normalizeWeightPercent(activeWeight * 100),
    [activeWeight],
  )
  const liveComboShare = analysis.weightedLiveComboCount / Math.max(0.0001, analysis.weightedRawComboCount)
  const blockedComboShare =
    analysis.weightedBlockedComboCount / Math.max(0.0001, analysis.weightedRawComboCount)
  const selectionWeightShare =
    analysis.selectedCellCount === 0 ? 0 : selectedWeightTotal / analysis.selectedCellCount
  const boardSummary =
    analysis.board.length === 0 ? 'борд пока пустой' : analysis.board.map(formatCard).join(' ')
  const boardCardSet = new Set(analysis.board)
  const activeBoardLabel = boardLabels[activeBoardSlot]
  const activeBoardCard = boardCards[activeBoardSlot]
  const activeBoardHint =
    activeBoardCard === ''
      ? `${activeBoardLabel} сейчас пуст. Клик по карте ниже поставит её именно в этот слот.`
      : `${activeBoardLabel} сейчас ${formatCard(activeBoardCard)}. Выбери другую карту, чтобы заменить её, или очисти слот.`
  const boardStageLabel = getBoardStageLabel(analysis.board.length)
  const advancedHeroActions =
    advancedSection === 'combos'
      ? [
          { href: '#advanced-guide', label: 'Шпаргалка' },
          { href: '#advanced-grid', label: 'Матрица' },
          { href: '#advanced-board', label: 'Борд' },
          { href: '#advanced-texture', label: 'Texture' },
          { href: '#advanced-categories', label: 'Категории' },
        ]
      : [
          { href: '#equity-inputs', label: 'Ввод' },
          { href: '#equity-board', label: 'Борд' },
          { href: '#equity-results', label: 'Результат' },
        ]

  useEffect(() => {
    if (!isDragging) {
      return
    }

    function endDrag() {
      dragModeRef.current = null
      setIsDragging(false)
    }

    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)

    return () => {
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [isDragging])

  function applyCellMode(label: string, mode: Exclude<DragMode, null>) {
    setSelectedRange((currentSelection) => {
      const currentWeight = currentSelection[label] ?? 0

      if (mode.kind === 'remove') {
        if (currentWeight === 0) {
          return currentSelection
        }

        const nextSelection = { ...currentSelection }
        delete nextSelection[label]
        return nextSelection
      }

      if (isSameWeight(currentWeight, mode.weight)) {
        return currentSelection
      }

      return {
        ...currentSelection,
        [label]: mode.weight,
      }
    })
  }

  function handleCellPointerDown(event: ReactPointerEvent<HTMLButtonElement>, label: string) {
    event.preventDefault()
    const currentWeight = getRangeCellWeight(selectedRange, label)
    const mode: Exclude<DragMode, null> =
      isSameWeight(currentWeight, activeWeight)
        ? { kind: 'remove' }
        : {
            kind: 'set',
            weight: activeWeight,
          }
    dragModeRef.current = mode
    setIsDragging(true)
    applyCellMode(label, mode)
  }

  function handleCellPointerEnter(label: string) {
    const mode = dragModeRef.current

    if (mode === null) {
      return
    }

    applyCellMode(label, mode)
  }

  function applyPreset(preset: (typeof presetButtons)[number]['preset']) {
    setSelectedRange(getPresetRangeWeights(preset))
  }

  function getNextBoardSlot(board: Array<CardCode | ''>, slotIndex: number, shouldAdvance: boolean) {
    if (!shouldAdvance) {
      return slotIndex
    }

    for (let nextIndex = slotIndex + 1; nextIndex < board.length; nextIndex += 1) {
      if (board[nextIndex] === '') {
        return nextIndex
      }
    }

    const firstEmpty = board.indexOf('')
    return firstEmpty === -1 ? slotIndex : firstEmpty
  }

  function toggleBoardCard(card: CardCode) {
    const existingIndex = boardCards.indexOf(card)

    if (existingIndex !== -1) {
      clearBoardSlot(existingIndex)
      return
    }

    const nextBoard = [...boardCards]
    const slotHadCard = nextBoard[activeBoardSlot] !== ''
    nextBoard[activeBoardSlot] = card

    setBoardCards(nextBoard)
    setActiveBoardSlot(getNextBoardSlot(nextBoard, activeBoardSlot, !slotHadCard))
  }

  function clearBoardSlot(slotIndex: number) {
    if (boardCards[slotIndex] === '') {
      setActiveBoardSlot(slotIndex)
      return
    }

    const nextBoard = [...boardCards]
    nextBoard[slotIndex] = ''
    setBoardCards(nextBoard)
    setActiveBoardSlot(slotIndex)
  }

  function clearBoard() {
    setBoardCards(['', '', '', '', ''])
    setActiveBoardSlot(0)
  }

  return (
    <>
      <header className="hero-panel surface advanced-hero">
        <div className="hero-copy">
          <p className="eyebrow">Адвансд мод</p>
          <h1>
            {advancedSection === 'combos'
              ? 'Комбинаторика, блокеры и разбор диапазона по борду.'
              : 'Эквити, матчапы и board-aware расчёт против диапазона.'}
          </h1>
          <p className="hero-text">
            {advancedSection === 'combos'
              ? 'Здесь живёт flopzilla-подобная часть: сколько в диапазоне живых комбо, какие руки доезжают на конкретном борде и как блокеры режут сырые префлопные числа.'
              : 'Здесь живёт stove-подобная часть: рука против руки, рука против диапазона и диапазон против диапазона с учётом блокеров, борда и showdown-equity.'}
          </p>
          <HeroActionChips
            ariaLabel="Быстрые переходы адвансд-режима"
            items={advancedHeroActions}
          />
        </div>

        <div className="hero-focus advanced-focus">
          {advancedSection === 'combos' ? (
            <div className="advanced-range-dashboard">
              <div className="advanced-range-topline">
                <div className="advanced-range-summary-block">
                  <p className="focus-label">Текущий диапазон</p>
                  <div className="advanced-range-headline">
                    <div>
                      <strong>{formatInteger(analysis.selectedCellCount)}</strong>
                      <span>классов</span>
                    </div>
                    <div>
                      <strong>{formatDecimal(analysis.weightedRawComboCount)}</strong>
                      <span>комбо</span>
                    </div>
                  </div>
                </div>

                <div className="advanced-range-boardline">
                  <span>Борд</span>
                  <strong>{boardSummary}</strong>
                  <small>{analysis.postflopReady ? 'постфлоп-анализ включён' : 'ждём флоп'}</small>
                </div>
              </div>

              <div className="advanced-range-splits" aria-label="Состав диапазона">
                <div className="advanced-range-split">
                  <span>Пары</span>
                  <strong>{formatInteger(selectedKindCounts.pair)}</strong>
                </div>
                <div className="advanced-range-split">
                  <span>Suited</span>
                  <strong>{formatInteger(selectedKindCounts.suited)}</strong>
                </div>
                <div className="advanced-range-split">
                  <span>Offsuit</span>
                  <strong>{formatInteger(selectedKindCounts.offsuit)}</strong>
                </div>
              </div>

              <div className="advanced-range-bars" aria-label="Сводка живых и заблокированных комбо">
                <div className="advanced-range-bar-row">
                  <div className="advanced-range-bar-head">
                    <span>Эффективный вес диапазона</span>
                    <strong>
                      {formatDecimal(selectedWeightTotal)} классов ·{' '}
                      {formatShare(selectionWeightShare, displayMode)}
                    </strong>
                  </div>
                  <div aria-hidden="true" className="advanced-range-bar-track">
                    <span
                      className="advanced-range-bar-fill gold"
                      style={{ width: `${Math.min(100, Math.max(0, selectionWeightShare * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="advanced-range-bar-row">
                  <div className="advanced-range-bar-head">
                    <span>Живые комбо</span>
                    <strong>
                      {formatDecimal(analysis.weightedLiveComboCount)} ·{' '}
                      {formatShare(liveComboShare, displayMode)}
                    </strong>
                  </div>
                  <div aria-hidden="true" className="advanced-range-bar-track">
                    <span
                      className="advanced-range-bar-fill green"
                      style={{ width: `${Math.min(100, Math.max(0, liveComboShare * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="advanced-range-bar-row">
                  <div className="advanced-range-bar-head">
                    <span>Умерло от блокеров</span>
                    <strong>
                      {formatDecimal(analysis.weightedBlockedComboCount)} ·{' '}
                      {formatShare(blockedComboShare, displayMode)}
                    </strong>
                  </div>
                  <div aria-hidden="true" className="advanced-range-bar-track">
                    <span
                      className="advanced-range-bar-fill amber"
                      style={{ width: `${Math.min(100, Math.max(0, blockedComboShare * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="focus-label">Продвинутая зона</p>
              <p className="focus-size">Flopzilla + Stove</p>
              <p className="focus-subtitle">
                Комбинаторика и эквити теперь собраны в одном месте. Сначала смотри на hit range
                и блокеры, потом сразу переходи к equity на тех же руках и борде.
              </p>
              <div className="focus-metrics">
                <div>
                  <span>Комбинаторика</span>
                  <strong>внутри</strong>
                </div>
                <div>
                  <span>Эквити</span>
                  <strong>внутри</strong>
                </div>
                <div>
                  <span>Логика</span>
                  <strong>одна зона</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <section className="surface advanced-switch-panel">
        <div className="advanced-switch-layout">
          <div className="inventory-switch" role="group" aria-label="Advanced section mode">
            <button
              aria-pressed={advancedSection === 'combos'}
              className={advancedSection === 'combos' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => setAdvancedSection('combos')}
              type="button"
            >
              Комбинаторика
            </button>
            <button
              aria-pressed={advancedSection === 'equity'}
              className={advancedSection === 'equity' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => setAdvancedSection('equity')}
              type="button"
            >
              Эквити
            </button>
          </div>

          <p className="advanced-switch-note">
            {advancedSection === 'combos'
              ? 'Сначала сужай диапазон и смотри, какие комбо вообще доживают до борда. Потом уже переходи в эквити.'
              : 'Здесь уже showdown-математика: те же руки и блокеры, но теперь вопрос не “что доехало”, а “кто сколько выигрывает”.'}
          </p>
        </div>
      </section>

      {advancedSection === 'equity' ? (
        <EquityMode
          displayMode={displayMode}
          embedded
          initialBoardCards={boardCards}
          initialHeroMode="range"
          initialHeroRange={selectedRange}
        />
      ) : (
        <>
          <section className="surface jump-target" id="advanced-guide">
            <div className="section-head compact">
              <div>
                <p className="kicker">Шпаргалка</p>
                <h2>Опорные числа префлоп-комбо</h2>
              </div>
              <p className="table-note">
                Эти цифры конечны и быстро запоминаются. Идея простая: не пересчитывать с нуля
                каждый раз, а держать в голове пару опорных шаблонов и лестницу блокеров.
              </p>
            </div>

            <div className="combo-guide-grid">
              <article className="result-card">
                <p className="card-label">Непарная рука</p>
                <h3>16 комбо</h3>
                <p>
                  Любая непарная рука начинается с <strong>16</strong>: это <strong>4 suited</strong>{' '}
                  + <strong>12 offsuit</strong>.
                </p>
              </article>
              <article className="result-card">
                <p className="card-label">Карманка</p>
                <h3>6 комбо</h3>
                <p>
                  У любой пары всего <strong>6</strong> комбинаций. Потом блокеры режут её по
                  лестнице <strong>6 → 3 → 1 → 0</strong>.
                </p>
              </article>
              <article className="result-card">
                <p className="card-label">Одна карта нужного достоинства</p>
                <h3>16 → 12</h3>
                <p>
                  Если на борде лежит <strong>туз</strong> или <strong>король</strong>, у{' '}
                  <strong>AK</strong> остаётся <strong>12</strong> комбо вместо{' '}
                  <strong>16</strong>.
                </p>
              </article>
              <article className="result-card">
                <p className="card-label">И туз, и король уже на борде</p>
                <h3>16 → 9</h3>
                <p>
                  Если на борде уже лежат и <strong>туз</strong>, и <strong>король</strong>, у{' '}
                  <strong>AK</strong> живых комбо остаётся <strong>9</strong> из{' '}
                  <strong>16</strong>.
                </p>
              </article>
            </div>
          </section>

          <section className="surface jump-target" id="advanced-grid">
            <div className="section-head compact">
              <div>
                <p className="kicker">Матрица</p>
                <h2>Собери диапазон классами рук и смотри на реальные комбо</h2>
              </div>
              <p className="table-note">
                Диагональ это пары, верхний треугольник suited, нижний offsuit. Каждая кнопка
                включает целый класс рук вроде <strong>AKs</strong> или <strong>99</strong>.
              </p>
            </div>

            <div className="advanced-range-summary" aria-label="Сводка диапазона">
              <div className="advanced-range-stage">
                <span>Стадия</span>
                <strong>{boardStageLabel}</strong>
              </div>

              <div className="advanced-range-stats" aria-label="Структура диапазона">
                <div className="advanced-range-stat">
                  <span>Пары</span>
                  <strong>{formatInteger(selectedKindCounts.pair)}</strong>
                </div>
                <div className="advanced-range-stat">
                  <span>Suited</span>
                  <strong>{formatInteger(selectedKindCounts.suited)}</strong>
                </div>
                <div className="advanced-range-stat">
                  <span>Offsuit</span>
                  <strong>{formatInteger(selectedKindCounts.offsuit)}</strong>
                </div>
              </div>
            </div>

            <div className="advanced-brush-toolbar">
              <div className="combo-presets" role="group" aria-label="Range weight brush">
                {rangeWeightSteps.map((weight) => (
                  <button
                    className={isSameWeight(activeWeight, weight) ? 'mode-chip active' : 'mode-chip'}
                    key={weight}
                    onClick={() => setActiveWeight(weight)}
                    type="button"
                  >
                    Кисть {formatWeightLabel(weight)}
                  </button>
                ))}
              </div>

              <div className="advanced-custom-weight">
                <EditableNumberField
                  ariaLabel="Кастомный вес кисти"
                  className="number-field advanced-weight-field"
                  inputMax={100}
                  inputMin={0}
                  label="Кастомный вес, %"
                  onValueChange={(value) => setActiveWeight(normalizeWeightPercent(value) / 100)}
                  sanitizeMax={100}
                  sanitizeMin={0.1}
                  step={0.1}
                  value={activeWeightPercent}
                />
                <p className="advanced-weight-note">
                  Любой процент от <strong>0,1%</strong> до <strong>100%</strong>. Клетка
                  зальётся ровно на эту долю.
                </p>
              </div>
            </div>

            <div className="combo-presets" role="group" aria-label="Range presets">
              {presetButtons.map((preset) => (
                <button
                  className="mode-chip"
                  key={preset.label}
                  onClick={() => applyPreset(preset.preset)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="range-matrix-wrap">
              <div
                aria-label="Preflop range grid"
                className={isDragging ? 'range-matrix dragging' : 'range-matrix'}
                role="grid"
              >
                <div className="range-axis range-corner" aria-hidden="true" />
                {rangeRanks.map((rank) => (
                  <div className="range-axis" key={`col-${rank}`}>
                    {rank}
                  </div>
                ))}

                {rangeGrid.map((row, rowIndex) => (
                  <Fragment key={`row-${rangeRanks[rowIndex]}`}>
                    <div className="range-axis">{rangeRanks[rowIndex]}</div>
                    {row.map((cell) => {
                      const weight = getRangeCellWeight(selectedRange, cell.label)
                      const selected = weight > 0
                      const weightState = selected ? getRangeWeightState(weight) : 'empty'

                      return (
                        <button
                          aria-label={`Toggle ${cell.label}`}
                          aria-pressed={selected}
                          className={`range-cell ${cell.kind}${selected ? ' active' : ''}`}
                          data-weight-state={weightState}
                          key={cell.label}
                          onClick={(event) => {
                            if (event.detail !== 0) {
                              return
                            }

                            applyCellMode(
                              cell.label,
                              isSameWeight(weight, activeWeight)
                                ? { kind: 'remove' }
                                : {
                                    kind: 'set',
                                    weight: activeWeight,
                                  },
                            )
                          }}
                          onPointerDown={(event) => handleCellPointerDown(event, cell.label)}
                          onPointerEnter={() => handleCellPointerEnter(cell.label)}
                          style={selected ? getRangeCellStyle(weight) : undefined}
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
              <p className="range-matrix-hint">
                Клик — один класс. Зажми и веди — выделяй/снимай диапазоны сразу.
              </p>
            </div>

            <p className="footnote">
              Сейчас выбрано <strong>{formatInteger(analysis.selectedCellCount)}</strong> классов,
              что даёт <strong>{formatDecimal(analysis.weightedRawComboCount)}</strong> эффективных
              префлоп-комбо до учёта борда.
            </p>

            <div className="range-selection-preview" aria-label="Превью выбранных классов">
              {selectedPreview.length > 0 ? (
                <>
                  {selectedPreview.map((label) => (
                    <span className="range-selection-chip" key={label}>
                      {label} · {formatWeightLabel(getRangeCellWeight(selectedRange, label))}
                    </span>
                  ))}
                  {selectedCellLabels.length > selectedPreview.length ? (
                    <span className="range-selection-more">
                      +{selectedCellLabels.length - selectedPreview.length}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="range-selection-empty">Диапазон пуст — выбери пресет или кликай по матрице.</span>
              )}
            </div>
          </section>

          <section className="advanced-layout">
            <section className="surface jump-target" id="advanced-board">
              <div className="section-head compact">
                <div>
                  <p className="kicker">Борд</p>
                  <h2>Поставь флоп, тёрн и ривер — увидишь живые комбо</h2>
                </div>
                <p className="table-note">
                  Здесь матрица перестаёт быть абстракцией: борд сразу выбивает мёртвые комбо и
                  показывает, какие готовые руки и дро остались в твоём диапазоне.
                </p>
              </div>

              <div className="board-composer">
                <div className="board-street-groups" role="group" aria-label="Board slots">
                  {boardStreetGroups.map((group) => {
                    const groupIsActive = group.slots.some((slotIndex) => slotIndex === activeBoardSlot)
                    const filledCount = group.slots.filter((slotIndex) => boardCards[slotIndex] !== '').length

                    return (
                      <section
                        className={`board-street-group${groupIsActive ? ' active' : ''}`}
                        key={group.label}
                      >
                        <div className="board-street-head">
                          <span className="board-street-name">{group.label}</span>
                          <span className="board-street-count">
                            {filledCount}/{group.slots.length}
                          </span>
                        </div>

                        <div
                          className={`board-street-slots slots-${group.slots.length}`}
                          role="group"
                          aria-label={`${group.label} slots`}
                        >
                          {group.slots.map((slotIndex) => {
                            const card = boardCards[slotIndex]
                            const filled = card !== ''
                            const active = activeBoardSlot === slotIndex

                            return (
                              <button
                                aria-label={
                                  filled
                                    ? `${boardLabels[slotIndex]}: ${formatCard(card)}${
                                        active ? ' — активный слот' : ''
                                      }`
                                    : `${boardLabels[slotIndex]} — пусто${
                                        active ? ' — активный слот' : ''
                                      }`
                                }
                                aria-pressed={active}
                                className={`board-slot${filled ? ' filled' : ''}${active ? ' active' : ''}`}
                                key={boardLabels[slotIndex]}
                                onClick={() => setActiveBoardSlot(slotIndex)}
                                type="button"
                              >
                                <span className="board-slot-label">{boardLabels[slotIndex]}</span>
                                {filled ? (
                                  <span className={`board-slot-card ${getCardTone(card)}`}>
                                    {formatCard(card)}
                                  </span>
                                ) : (
                                  <span aria-hidden="true" className="board-slot-card empty">
                                    +
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}
                </div>

                <div className="board-picker-panel">
                  <p className="board-picker-kicker">Сейчас выбираешь</p>
                  <div className="board-picker-active">
                    <span className="board-picker-active-label">{activeBoardLabel}</span>
                    <strong>{activeBoardCard === '' ? 'Выбери карту' : formatCard(activeBoardCard)}</strong>
                  </div>
                  <p aria-live="polite" className="combo-board-hint">
                    {analysis.board.length === 0
                      ? `${activeBoardHint} Борд начнётся с выбранного слота и будет собираться как в нормальном board selector.`
                      : `${activeBoardHint} Текущий борд: ${boardSummary}.`}
                  </p>
                  <div className="board-picker-actions">
                    <button
                      aria-label={`Очистить ${activeBoardLabel}`}
                      className="mode-chip"
                      disabled={activeBoardCard === ''}
                      onClick={() => clearBoardSlot(activeBoardSlot)}
                      type="button"
                    >
                      Очистить слот
                    </button>
                    <button
                      aria-label="Очистить борд"
                      className="mode-chip"
                      disabled={analysis.board.length === 0}
                      onClick={clearBoard}
                      type="button"
                    >
                      Очистить борд
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-picker" role="group" aria-label="Card picker">
                {cardSuits.map((suit) => (
                  <div className="card-picker-row" key={suit}>
                    <span
                      className={`card-picker-suit ${suit === 'h' || suit === 'd' ? 'red' : 'dark'}`}
                    >
                      {suitGlyphMap[suit]}
                      <span className="visually-hidden">{suitLabelMap[suit]}</span>
                    </span>
                    {rangeRanks.map((rank) => {
                      const card = `${rank}${suit}` as CardCode
                      const selected = boardCardSet.has(card)
                      const boardFull = analysis.board.length >= 5 && activeBoardCard === '' && !selected

                      return (
                        <button
                          aria-label={`${rank}${suitGlyphMap[suit]}${selected ? ' выбрано' : ''}`}
                          aria-pressed={selected}
                          className={`card-picker-cell ${getCardTone(card)}${
                            selected ? ' selected' : ''
                          }${boardFull ? ' disabled' : ''}`}
                          disabled={boardFull}
                          key={card}
                          onClick={() => toggleBoardCard(card)}
                          type="button"
                        >
                          {rank}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="summary-grid compact-summary">
                <article className="result-card primary">
                  <p className="card-label">Живые комбо</p>
                  <h3>{formatDecimal(analysis.weightedLiveComboCount)}</h3>
                  <p>Что реально осталось в диапазоне после вычитания видимых карт борда.</p>
                </article>
                <article className="result-card">
                  <p className="card-label">Умерло от блокеров</p>
                  <h3>{formatDecimal(analysis.weightedBlockedComboCount)}</h3>
                  <p>Разница между сырыми префлоп-комбо и тем, что пережило раздачу карт.</p>
                </article>
                <article className="result-card">
                  <p className="card-label">Доля живых</p>
                  <h3>
                    {formatShare(
                      analysis.weightedLiveComboCount / Math.max(0.0001, analysis.weightedRawComboCount),
                      displayMode,
                    )}
                  </h3>
                  <p>Сколько диапазона ещё существует как реальный набор стартовых комбо.</p>
                </article>
              </div>
            </section>

          <section className="surface jump-target" id="advanced-texture">
            <div className="section-head compact">
              <div>
                <p className="kicker">Texture explorer</p>
                <h2>Как диапазон цепляется за этот борд</h2>
              </div>
              <p className="table-note">
                Здесь не просто названия борда, а короткая карта взаимодействия: сколько диапазона
                уже попало, сколько держится на дро и сколько осталось воздухом.
              </p>
            </div>

            {analysis.boardTexture ? (
              <>
                <div className="texture-tag-grid">
                  {analysis.boardTexture.tags.map((tag) => (
                    <article className="advanced-meta-pill" key={tag.label}>
                      <span>{tag.label}</span>
                      <strong>{tag.description}</strong>
                    </article>
                  ))}
                </div>

                <div className="summary-grid compact-summary">
                  <article className="result-card primary">
                    <p className="card-label">Pair+ в диапазоне</p>
                    <h3>{formatShare(analysis.boardTexture.pairPlusShare, displayMode)}</h3>
                    <p>Любая готовая пара или лучше против текущего борда.</p>
                  </article>
                  <article className="result-card">
                    <p className="card-label">Top pair+ / overpair</p>
                    <h3>{formatShare(analysis.boardTexture.topPairPlusShare, displayMode)}</h3>
                    <p>То, что уже может продолжать агрессивнее среднего.</p>
                  </article>
                  <article className="result-card">
                    <p className="card-label">Сильные готовые</p>
                    <h3>{formatShare(analysis.boardTexture.strongMadeHandShare, displayMode)}</h3>
                    <p>Two pair+ и всё, что стоит выше по made-hand лестнице.</p>
                  </article>
                  <article className="result-card">
                    <p className="card-label">Дро / воздух</p>
                    <h3>
                      {formatShare(analysis.boardTexture.drawShare, displayMode)} /{' '}
                      {formatShare(analysis.boardTexture.airShare, displayMode)}
                    </h3>
                    <p>Сколько диапазона живёт на equity, а сколько почти не зацепилось.</p>
                  </article>
                </div>
              </>
            ) : (
              <div className="texture-empty-state">
                <article className="result-card texture-empty-card">
                  <p className="card-label">Ждём флоп</p>
                  <h3>Нужны 3 карты</h3>
                  <p>
                    Texture explorer включается после флопа, когда уже можно честно отделять made
                    hand от draw и воздуха.
                  </p>
                </article>

                <aside className="texture-empty-guide">
                  <p className="texture-empty-kicker">После флопа появится</p>

                  <div className="texture-empty-points">
                    <article className="texture-empty-point">
                      <strong>Готовые руки</strong>
                      <span>Pair+, top pair+ и сильные made hands по диапазону.</span>
                    </article>
                    <article className="texture-empty-point">
                      <strong>Дро и воздух</strong>
                      <span>Сколько диапазона держится на equity и сколько совсем мимо.</span>
                    </article>
                    <article className="texture-empty-point">
                      <strong>Теги борда</strong>
                      <span>Сухой, связный, paired, flush-heavy и другие сигналы текстуры.</span>
                    </article>
                  </div>
                </aside>
              </div>
            )}
          </section>

          <section className="surface jump-target" id="advanced-categories">
            <div className="section-head compact">
              <div>
                <p className="kicker">Наполнение диапазона</p>
                <h2>Готовые руки и дро в текущем рейндже</h2>
              </div>
              <p className="table-note">
                Готовые руки разнесены по сильнейшей категории, дро считаются отдельно. Готовые
                суммируются без пересечений, дро — могут пересекаться.
              </p>
            </div>

            {analysis.postflopReady ? (
              <div className="combo-breakdown">
                <div className="combo-breakdown-group">
                  <h3 className="combo-breakdown-title">Готовые руки</h3>
                  {analysis.madeHandSummaries.length > 0 ? (
                    <ul className="combo-breakdown-list">
                      {analysis.madeHandSummaries.map((summary) => (
                        <li className="combo-breakdown-row" key={summary.category}>
                          <div className="combo-breakdown-header">
                            <span className="combo-breakdown-name">
                              {getMadeHandLabel(summary.category)}
                            </span>
                            <span className="combo-breakdown-stats">
                              <strong>{formatDecimal(summary.count)}</strong> комбо ·{' '}
                              {formatShare(summary.share, displayMode, 12)}
                            </span>
                          </div>
                          <ComboExamples examples={summary.examples} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="combo-breakdown-empty">Диапазон пуст — готовых рук пока нет.</p>
                  )}
                </div>

                <div className="combo-breakdown-group">
                  <h3 className="combo-breakdown-title">Дро</h3>
                  {analysis.drawSummaries.length > 0 ? (
                    <ul className="combo-breakdown-list">
                      {analysis.drawSummaries.map((summary) => (
                        <li className="combo-breakdown-row" key={summary.category}>
                          <div className="combo-breakdown-header">
                            <span className="combo-breakdown-name">
                              {getDrawLabel(summary.category)}
                            </span>
                            <span className="combo-breakdown-stats">
                              <strong>{formatDecimal(summary.count)}</strong> комбо ·{' '}
                              {formatShare(summary.share, displayMode, 12)}
                            </span>
                          </div>
                          <ComboExamples examples={summary.examples} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="combo-breakdown-empty">На этом борде дро нет.</p>
                  )}
                </div>
              </div>
            ) : (
              <article className="result-card">
                <p className="card-label">Ждём флоп</p>
                <h3>Нужен флоп</h3>
                <p>
                  Категории готовых рук и дро включатся, как только выложишь три карты флопа.
                  До этого матрица честно показывает только префлопные комбо и эффект блокеров.
                </p>
              </article>
            )}
          </section>
          </section>
        </>
      )}
    </>
  )
}
