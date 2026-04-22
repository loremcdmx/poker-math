import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { HeroActionChips } from '../components/HeroActionChips'
import { formatInteger, formatShare } from '../lib/formatters'
import {
  analyzeRange,
  cardSuits,
  getDrawLabel,
  getMadeHandLabel,
  getPresetRangeCells,
  getRangeGrid,
  rangeRanks,
  type CardCode,
  type CardSuit,
} from '../lib/combinatorics'
import type { DisplayMode } from '../lib/pokerMath'

const suitGlyphMap = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
} as const

const suitLabelMap: Record<CardSuit, string> = {
  s: 'Пики',
  h: 'Червы',
  d: 'Бубны',
  c: 'Трефы',
}

const boardLabels = ['Флоп 1', 'Флоп 2', 'Флоп 3', 'Тёрн', 'Ривер'] as const
const rangeGrid = getRangeGrid()

type DragMode = 'add' | 'remove' | null

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

const advancedHeroActions = [
  { href: '#advanced-guide', label: 'Шпаргалка' },
  { href: '#advanced-grid', label: 'Матрица' },
  { href: '#advanced-board', label: 'Борд' },
  { href: '#advanced-categories', label: 'Категории' },
]

function formatCard(card: CardCode) {
  return `${card[0]}${suitGlyphMap[card[1] as keyof typeof suitGlyphMap]}`
}

function formatCombo(combo: string) {
  const firstCard = combo.slice(0, 2) as CardCode
  const secondCard = combo.slice(2, 4) as CardCode

  return `${formatCard(firstCard)} ${formatCard(secondCard)}`
}

function getCardTone(card: CardCode) {
  return card[1] === 'h' || card[1] === 'd' ? 'red' : 'dark'
}

type AdvancedModeProps = {
  displayMode: DisplayMode
}

export function AdvancedMode({ displayMode }: AdvancedModeProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(
    () => new Set(getPresetRangeCells('broadways')),
  )
  const [boardCards, setBoardCards] = useState<Array<CardCode | ''>>(['', '', '', '', ''])
  const dragModeRef = useRef<DragMode>(null)
  const [isDragging, setIsDragging] = useState(false)

  const selectedCellLabels = Array.from(selectedCells)
  const analysis = analyzeRange(selectedCellLabels, boardCards)
  const boardSummary = analysis.board.length === 0 ? 'борд пока пустой' : analysis.board.map(formatCard).join(' ')
  const boardCardSet = new Set(analysis.board)
  const firstEmptyBoardSlot = boardCards.indexOf('')

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
    setSelectedCells((currentSelection) => {
      const alreadySelected = currentSelection.has(label)
      if (mode === 'add' && alreadySelected) return currentSelection
      if (mode === 'remove' && !alreadySelected) return currentSelection

      const nextSelection = new Set(currentSelection)
      if (mode === 'add') {
        nextSelection.add(label)
      } else {
        nextSelection.delete(label)
      }
      return nextSelection
    })
  }

  function handleCellPointerDown(event: ReactPointerEvent<HTMLButtonElement>, label: string) {
    event.preventDefault()
    const isSelected = selectedCells.has(label)
    const mode: Exclude<DragMode, null> = isSelected ? 'remove' : 'add'
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
    setSelectedCells(new Set(getPresetRangeCells(preset)))
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
          <h1>Комбинаторика, блокеры и разбор диапазона по борду.</h1>
          <p className="hero-text">
            Это уже не про один сайзинг, а про сам диапазон: сколько в нём живых комбо,
            какие руки доезжают на конкретном борде и как блокеры режут сырые префлопные
            числа. Сверху опорные числа, ниже матрица и живой разбор борда.
          </p>
          <HeroActionChips
            ariaLabel="Быстрые переходы адвансд-режима"
            items={advancedHeroActions}
          />
        </div>

        <div className="hero-focus advanced-focus">
          <p className="focus-label">Текущий диапазон</p>
          <p className="focus-size">
            {formatInteger(analysis.selectedCellCount)} классов / {formatInteger(analysis.rawComboCount)} комбо
          </p>
          <p className="focus-subtitle">
            На борде сейчас <strong>{boardSummary}</strong>, поэтому живыми остаются{' '}
            <strong>{formatInteger(analysis.liveComboCount)}</strong> комбо, а{' '}
            <strong>{formatInteger(analysis.blockedComboCount)}</strong> уже умерли от блокеров.
          </p>
          <div className="focus-metrics">
            <div>
              <span>Сырые префлоп-комбо</span>
              <strong>{formatInteger(analysis.rawComboCount)}</strong>
            </div>
            <div>
              <span>Живые комбо</span>
              <strong>{formatInteger(analysis.liveComboCount)}</strong>
            </div>
            <div>
              <span>Постфлоп-анализ</span>
              <strong>{analysis.postflopReady ? 'включён' : 'ждёт флоп'}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="surface jump-target" id="advanced-guide">
        <div className="section-head compact">
          <div>
            <p className="kicker">Шпаргалка</p>
            <h2>Опорные числа префлоп-комбо</h2>
          </div>
          <p className="table-note">
            Эти цифры конечны и быстро запоминаются. Идея простая: не пересчитывать с
            нуля каждый раз, а держать в голове пару опорных шаблонов и лестницу блокеров.
          </p>
        </div>

        <div className="combo-guide-grid">
          <article className="result-card">
            <p className="card-label">Непарная рука</p>
            <h3>16 комбо</h3>
            <p>
              Любая непарная рука начинается с <strong>16</strong>: это{' '}
              <strong>4 suited</strong> + <strong>12 offsuit</strong>.
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
            className={isDragging ? 'range-matrix dragging' : 'range-matrix'}
            role="grid"
            aria-label="Preflop range grid"
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
                  const selected = selectedCells.has(cell.label)

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
                        applyCellMode(cell.label, selected ? 'remove' : 'add')
                      }}
                      onPointerDown={(event) => handleCellPointerDown(event, cell.label)}
                      onPointerEnter={() => handleCellPointerEnter(cell.label)}
                      type="button"
                    >
                      {cell.label}
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
          что даёт <strong>{formatInteger(analysis.rawComboCount)}</strong> сырых префлоп-комбо
          до учёта борда.
        </p>
      </section>

      <section className="advanced-layout">
        <section className="surface jump-target" id="advanced-board">
          <div className="section-head compact">
            <div>
              <p className="kicker">Борд</p>
              <h2>Поставь флоп, тёрн и ривер — увидишь живые комбо</h2>
            </div>
            <p className="table-note">
              Здесь матрица перестаёт быть абстракцией: борд сразу выбивает мёртвые комбо
              и показывает, какие готовые руки и дро остались в твоём диапазоне.
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
                    <span className="board-slot-card empty" aria-hidden="true">
                      —
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="combo-board-toolbar">
            <p className="combo-board-hint" aria-live="polite">
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
                <span className={`card-picker-suit ${suit === 'h' || suit === 'd' ? 'red' : 'dark'}`}>
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
                      className={`card-picker-cell ${getCardTone(card)}${selected ? ' selected' : ''}${
                        boardFull ? ' disabled' : ''
                      }`}
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
              <h3>{formatInteger(analysis.liveComboCount)}</h3>
              <p>Что реально осталось в диапазоне после вычитания видимых карт борда.</p>
            </article>
            <article className="result-card">
              <p className="card-label">Умерло от блокеров</p>
              <h3>{formatInteger(analysis.blockedComboCount)}</h3>
              <p>Разница между сырыми префлоп-комбо и тем, что пережило раздачу карт.</p>
            </article>
            <article className="result-card">
              <p className="card-label">Доля живых</p>
              <h3>{formatShare(analysis.liveComboCount / Math.max(1, analysis.rawComboCount), displayMode)}</h3>
              <p>Сколько диапазона ещё существует как реальный набор стартовых комбо.</p>
            </article>
          </div>
        </section>

        <section className="surface jump-target" id="advanced-categories">
          <div className="section-head compact">
            <div>
              <p className="kicker">Категории</p>
              <h2>Какие руки и дро живут в выбранном диапазоне</h2>
            </div>
            <p className="table-note">
              Готовые руки разнесены по сильнейшей категории, дро считаются отдельно.
              Готовые суммируются без пересечений, дро — могут пересекаться.
            </p>
          </div>

          {analysis.postflopReady ? (
            <div className="combo-table-stack">
              <div className="table-wrap">
                <table>
                  <caption>Готовые руки в текущем диапазоне.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Категория</th>
                      <th scope="col">Комбо</th>
                      <th scope="col">Доля</th>
                      <th scope="col">Примеры</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.madeHandSummaries.length > 0 ? (
                      analysis.madeHandSummaries.map((summary) => (
                        <tr key={summary.category}>
                          <td>{getMadeHandLabel(summary.category)}</td>
                          <td>{formatInteger(summary.count)}</td>
                          <td>{formatShare(summary.share, displayMode, 12)}</td>
                          <td>{summary.examples.map(formatCombo).join(', ')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>Выбранный диапазон пуст, поэтому и категорий пока нет.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-wrap">
                <table>
                  <caption>Дро в текущем диапазоне.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Дро</th>
                      <th scope="col">Комбо</th>
                      <th scope="col">Доля</th>
                      <th scope="col">Примеры</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.drawSummaries.length > 0 ? (
                      analysis.drawSummaries.map((summary) => (
                        <tr key={summary.category}>
                          <td>{getDrawLabel(summary.category)}</td>
                          <td>{formatInteger(summary.count)}</td>
                          <td>{formatShare(summary.share, displayMode, 12)}</td>
                          <td>{summary.examples.map(formatCombo).join(', ')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>
                          На этом борде дро нет, либо разбор борда ещё не включён.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <article className="result-card">
              <p className="card-label">Ждём флоп</p>
              <h3>Нужен флоп</h3>
              <p>
                Категории готовых рук и дро включатся, как только выложишь три карты
                флопа. До этого матрица честно показывает только префлопные комбо и эффект
                блокеров.
              </p>
            </article>
          )}
        </section>
      </section>
    </>
  )
}
