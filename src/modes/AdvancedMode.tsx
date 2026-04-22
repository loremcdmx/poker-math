import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
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
const rangeGrid = getRangeGrid()
const rangeGridCells = rangeGrid.flat()
const rangeCellKinds = new Map(rangeGridCells.map((cell) => [cell.label, cell.kind]))
const rangeWeightSteps = [0.25, 0.5, 0.75, 1] as const

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
  { label: 'SC', preset: 'suited_connectors' as const },
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
  return `${Math.round(weight * 100)}%`
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
  const boardSummary =
    analysis.board.length === 0 ? 'борд пока пустой' : analysis.board.map(formatCard).join(' ')
  const boardCardSet = new Set(analysis.board)
  const firstEmptyBoardSlot = boardCards.indexOf('')
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

      if (currentWeight === mode.weight) {
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
      currentWeight === activeWeight
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

  function toggleBoardCard(card: CardCode) {
    setBoardCards((currentBoard) => {
      const existingIndex = currentBoard.indexOf(card)

      if (existingIndex !== -1) {
        const nextBoard = [...currentBoard]
        nextBoard[existingIndex] = ''
        return nextBoard
      }

      const emptyIndex = currentBoard.indexOf('')

      if (emptyIndex === -1) {
        return currentBoard
      }

      const nextBoard = [...currentBoard]
      nextBoard[emptyIndex] = card
      return nextBoard
    })
  }

  function clearBoardSlot(slotIndex: number) {
    setBoardCards((currentBoard) => {
      if (currentBoard[slotIndex] === '') {
        return currentBoard
      }

      const nextBoard = [...currentBoard]
      nextBoard[slotIndex] = ''
      return nextBoard
    })
  }

  function clearBoard() {
    setBoardCards(['', '', '', '', ''])
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
            <>
              <p className="focus-label">Текущий диапазон</p>
              <p className="focus-size">
                {formatInteger(analysis.selectedCellCount)} классов /{' '}
                {formatDecimal(analysis.weightedRawComboCount)} комбо
              </p>
              <p className="focus-subtitle">
                На борде сейчас <strong>{boardSummary}</strong>, поэтому живыми остаются{' '}
                <strong>{formatDecimal(analysis.weightedLiveComboCount)}</strong> комбо, а{' '}
                <strong>{formatDecimal(analysis.weightedBlockedComboCount)}</strong> уже умерли от блокеров.
              </p>
              <div className="focus-metrics">
                <div>
                  <span>Эффективно выбрано</span>
                  <strong>{formatDecimal(selectedWeightTotal)} классов</strong>
                </div>
                <div>
                  <span>Живые комбо</span>
                  <strong>{formatDecimal(analysis.weightedLiveComboCount)}</strong>
                </div>
                <div>
                  <span>Постфлоп-анализ</span>
                  <strong>{analysis.postflopReady ? 'включён' : 'ждёт флоп'}</strong>
                </div>
              </div>
            </>
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
        <EquityMode displayMode={displayMode} embedded />
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
                <p className="card-label">Один блокер ранга</p>
                <h3>16 → 12</h3>
                <p>
                  Если на борде лежит одна карта нужного ранга, семейство <strong>AK</strong>{' '}
                  теряет четверть комбо и падает с <strong>16</strong> до <strong>12</strong>.
                </p>
              </article>
              <article className="result-card">
                <p className="card-label">Блокер на оба ранга</p>
                <h3>16 → 9</h3>
                <p>
                  Если на борде и туз, и король, у <strong>AK</strong> живых комбо остаётся{' '}
                  <strong>9</strong> из 16.
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

            <div className="advanced-meta-strip" aria-label="Сводка диапазона">
              <div className="advanced-meta-pill">
                <span>Стадия</span>
                <strong>{boardStageLabel}</strong>
              </div>
              <div className="advanced-meta-pill">
                <span>Пары</span>
                <strong>{formatInteger(selectedKindCounts.pair)}</strong>
              </div>
              <div className="advanced-meta-pill">
                <span>Suited</span>
                <strong>{formatInteger(selectedKindCounts.suited)}</strong>
              </div>
              <div className="advanced-meta-pill">
                <span>Offsuit</span>
                <strong>{formatInteger(selectedKindCounts.offsuit)}</strong>
              </div>
            </div>

            <div className="combo-presets" role="group" aria-label="Range weight brush">
              {rangeWeightSteps.map((weight) => (
                <button
                  className={activeWeight === weight ? 'mode-chip active' : 'mode-chip'}
                  key={weight}
                  onClick={() => setActiveWeight(weight)}
                  type="button"
                >
                  Кисть {formatWeightLabel(weight)}
                </button>
              ))}
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

                      return (
                        <button
                          aria-label={`Toggle ${cell.label}`}
                          aria-pressed={selected}
                          className={`range-cell ${cell.kind}${selected ? ' active' : ''}`}
                          key={cell.label}
                          onClick={(event) => {
                            if (event.detail !== 0) {
                              return
                            }

                            applyCellMode(
                              cell.label,
                              weight === activeWeight
                                ? { kind: 'remove' }
                                : {
                                    kind: 'set',
                                    weight: activeWeight,
                                  },
                            )
                          }}
                          onPointerDown={(event) => handleCellPointerDown(event, cell.label)}
                          onPointerEnter={() => handleCellPointerEnter(cell.label)}
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

              <div className="board-slots" role="group" aria-label="Board slots">
                {boardLabels.map((label, index) => {
                  const card = boardCards[index]
                  const filled = card !== ''
                  const isNext = !filled && firstEmptyBoardSlot === index

                  return (
                    <button
                      aria-label={
                        filled ? `${label}: ${formatCard(card)} — убрать` : `${label} — пусто`
                      }
                      className={`board-slot${filled ? ' filled' : ''}${isNext ? ' next' : ''}`}
                      key={label}
                      onClick={() => clearBoardSlot(index)}
                      type="button"
                    >
                      <span className="board-slot-label">{label}</span>
                      {filled ? (
                        <span className={`board-slot-card ${getCardTone(card)}`}>
                          {formatCard(card)}
                        </span>
                      ) : (
                        <span aria-hidden="true" className="board-slot-card empty">
                          —
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="combo-board-toolbar">
                <p aria-live="polite" className="combo-board-hint">
                  {analysis.board.length === 0
                    ? 'Кликай по картам ниже — первые 3 становятся флопом, 4-я тёрном, 5-я ривером.'
                    : `Выбрано ${analysis.board.length} из 5: ${analysis.board.map(formatCard).join(' ')}`}
                </p>
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
                      const boardFull = analysis.board.length >= 5 && !selected

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
              <article className="result-card">
                <p className="card-label">Ждём флоп</p>
                <h3>Нужны 3 карты</h3>
                <p>
                  Texture explorer включается после флопа, когда уже можно честно отделять made
                  hand от draw и воздуха.
                </p>
              </article>
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
