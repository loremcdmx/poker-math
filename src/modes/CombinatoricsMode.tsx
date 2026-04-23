import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BoardPicker } from '../components/BoardPicker'
import { EditableNumberField } from '../components/EditableNumberField'
import { HeroActionChips } from '../components/HeroActionChips'
import { formatInteger, formatShare } from '../lib/formatters'
import {
  analyzeRange,
  getBackdoorLabel,
  getDrawLabel,
  getMadeHandLabel,
  getPresetRangeCells,
  getRangeGrid,
  rangeRanks,
  type CardCode,
} from '../lib/combinatorics'
import type { DisplayMode } from '../lib/pokerMath'

const suitGlyphMap = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
} as const

const rangeGrid = getRangeGrid()

const OUTS_PRESETS: Array<{ outs: number; label: string }> = [
  { outs: 4, label: 'Гатшот' },
  { outs: 8, label: 'Стрит-дро' },
  { outs: 9, label: 'Флеш-дро' },
  { outs: 12, label: 'FD + гатшот' },
  { outs: 15, label: 'FD + стрит-дро' },
]

const OUTS_DRILL_SPOTS = [
  { outs: 4, street: 'turn', title: 'Гатшот на тёрне' },
  { outs: 8, street: 'flop', title: 'OESD на флопе' },
  { outs: 9, street: 'flop', title: 'Флеш-дро на флопе' },
  { outs: 12, street: 'turn', title: 'Сильное дро на тёрне' },
  { outs: 15, street: 'flop', title: 'Комбо-дро на флопе' },
] as const

type OutsDrillSpot = (typeof OUTS_DRILL_SPOTS)[number]

function flopToRiverEquity(outs: number) {
  if (outs <= 0) return 0
  const clampedOuts = Math.min(outs, 47)
  const cardsRemaining = 47
  const misses = (cardsRemaining - clampedOuts) * (cardsRemaining - 1 - clampedOuts)
  const total = cardsRemaining * (cardsRemaining - 1)
  return 1 - misses / total
}

function turnToRiverEquity(outs: number) {
  if (outs <= 0) return 0
  const clampedOuts = Math.min(outs, 46)
  return clampedOuts / 46
}

function getOutsDrillEquity(spot: OutsDrillSpot) {
  return spot.street === 'flop' ? flopToRiverEquity(spot.outs) : turnToRiverEquity(spot.outs)
}

function getOutsDrillRule(spot: OutsDrillSpot) {
  return Math.min(100, spot.outs * (spot.street === 'flop' ? 4 : 2))
}

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

function formatCard(card: CardCode) {
  return `${card[0]}${suitGlyphMap[card[1] as keyof typeof suitGlyphMap]}`
}

function getCardTone(card: CardCode) {
  return card[1] === 'h' || card[1] === 'd' ? 'red' : 'dark'
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

type CombinatoricsModeProps = {
  displayMode: DisplayMode
}

export function CombinatoricsMode({ displayMode }: CombinatoricsModeProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(
    () => new Set(getPresetRangeCells('broadways')),
  )
  const [boardCards, setBoardCards] = useState<Array<CardCode | ''>>(['', '', '', '', ''])
  const dragModeRef = useRef<DragMode>(null)
  const [isDragging, setIsDragging] = useState(false)

  const selectedCellLabels = useMemo(() => Array.from(selectedCells), [selectedCells])
  const analysis = useMemo(
    () => analyzeRange(selectedCellLabels, boardCards),
    [boardCards, selectedCellLabels],
  )
  const boardSummary =
    analysis.board.length === 0 ? 'борд пока пустой' : analysis.board.map(formatCard).join(' ')
  const [outs, setOuts] = useState(9)
  const [outsDrillIndex, setOutsDrillIndex] = useState(2)
  const [outsDrillGuess, setOutsDrillGuess] = useState(36)
  const [outsDrillChecked, setOutsDrillChecked] = useState(false)
  const [outsDrillStreak, setOutsDrillStreak] = useState(0)
  const safeOuts = Math.max(0, Math.min(20, Math.round(outs)))
  const flopEquity = flopToRiverEquity(safeOuts)
  const turnEquity = turnToRiverEquity(safeOuts)
  const flopRule = Math.min(100, safeOuts * 4)
  const turnRule = Math.min(100, safeOuts * 2)
  const flopDelta = flopRule - flopEquity * 100
  const turnDelta = turnRule - turnEquity * 100
  const outsDrillSpot = OUTS_DRILL_SPOTS[outsDrillIndex] ?? OUTS_DRILL_SPOTS[0]
  const outsDrillEquity = getOutsDrillEquity(outsDrillSpot)
  const outsDrillRule = getOutsDrillRule(outsDrillSpot)
  const outsDrillDifference = Math.abs(outsDrillEquity * 100 - outsDrillGuess)
  const outsDrillSolved = outsDrillDifference <= 2

  const heroActions = [
    { href: '#combo-guide', label: 'Шпаргалка' },
    { href: '#combo-outs', label: 'Ауты' },
    { href: '#combo-grid', label: 'Матрица' },
    { href: '#combo-board', label: 'Борд' },
    { href: '#combo-categories', label: 'Категории' },
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
    setSelectedCells((currentSelection) => {
      const alreadySelected = currentSelection.has(label)

      if (mode === 'add' && alreadySelected) {
        return currentSelection
      }

      if (mode === 'remove' && !alreadySelected) {
        return currentSelection
      }

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

  function checkOutsDrill() {
    setOutsDrillChecked(true)
    setOutsDrillStreak((currentStreak) => (outsDrillSolved ? currentStreak + 1 : 0))
  }

  function nextOutsDrillRound() {
    const nextOptions = OUTS_DRILL_SPOTS.map((_, index) => index).filter(
      (index) => index !== outsDrillIndex,
    )
    const nextIndex = nextOptions[Math.floor(Math.random() * nextOptions.length)] ?? 0
    const nextSpot = OUTS_DRILL_SPOTS[nextIndex] ?? OUTS_DRILL_SPOTS[0]

    setOutsDrillIndex(nextIndex)
    setOutsDrillGuess(getOutsDrillRule(nextSpot))
    setOutsDrillChecked(false)
  }

  return (
    <>
      <header className="hero-panel surface advanced-hero">
        <div className="hero-copy">
          <p className="eyebrow">Комбинаторика</p>
          <h1>Комбинаторика, блокеры и разбор диапазона по борду.</h1>
          <p className="hero-text">
            Flopzilla-подобная часть: сколько в диапазоне живых комбо, какие руки доезжают
            на конкретном борде и как блокеры режут сырые префлопные числа.
          </p>
          <HeroActionChips
            ariaLabel="Быстрые переходы комбинаторики"
            items={heroActions}
          />
        </div>

        <div className="hero-focus advanced-focus">
          <p className="focus-label">Текущий диапазон</p>
          <p className="focus-size">
            {formatInteger(analysis.selectedCellCount)} классов /{' '}
            {formatInteger(analysis.rawComboCount)} комбо
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

      <>
          <section className="surface jump-target" id="combo-guide">
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
              <article className="result-card">
                <p className="card-label">Всего комбо на префлопе</p>
                <h3>1 326</h3>
                <p>
                  <strong>52 × 51 / 2</strong> = <strong>1 326</strong>. Карманка — 0,45%,
                  suited non-pair — 0,30%, offsuit — 0,90% всей деки.
                </p>
              </article>
              <article className="result-card">
                <p className="card-label">Правило 4 и 2</p>
                <h3>×4 на флопе, ×2 на тёрне</h3>
                <p>
                  Умножаешь ауты на <strong>4</strong> на флопе и на <strong>2</strong> на
                  тёрне — получаешь equity до ривера с точностью ±2%.
                </p>
              </article>
            </div>
          </section>

          <section className="surface jump-target" id="combo-outs">
            <div className="section-head compact">
              <div>
                <p className="kicker">Ауты → equity</p>
                <h2>Правило 4 и 2 в деле</h2>
              </div>
              <p className="table-note">
                Сколько карт достраивают тебя до нужной руки — таких карт и есть ауты. На
                флопе умножаешь их на 4, на тёрне — на 2, и получаешь грубую оценку equity до
                ривера. Ниже рядом с приближением показана точная формула и погрешность.
              </p>
            </div>

            <div className="outs-control">
              <label className="outs-slider">
                <span className="outs-slider-label">Ауты</span>
                <input
                  aria-label="Outs count"
                  className="outs-range"
                  max={20}
                  min={0}
                  onChange={(event) => setOuts(Number(event.target.value))}
                  step={1}
                  type="range"
                  value={safeOuts}
                />
                <div aria-hidden="true" className="outs-scale">
                  <span>0</span>
                  <span>4</span>
                  <span>8</span>
                  <span>12</span>
                  <span>16</span>
                  <span>20</span>
                </div>
              </label>
              <div className="outs-counter" aria-live="polite">
                <strong>{safeOuts}</strong> аут{safeOuts === 1 ? '' : safeOuts >= 2 && safeOuts <= 4 ? 'а' : 'ов'}
              </div>
            </div>

            <div className="outs-presets">
              {OUTS_PRESETS.map((preset) => (
                <button
                  className={
                    safeOuts === preset.outs ? 'quick-chip active' : 'quick-chip'
                  }
                  key={preset.label}
                  onClick={() => setOuts(preset.outs)}
                  type="button"
                >
                  {preset.label}
                  <span className="outs-preset-count">{preset.outs}</span>
                </button>
              ))}
            </div>

            <div className="outs-output">
              <article className="result-card primary">
                <p className="card-label">Флоп → ривер</p>
                <h3>≈ {formatShare(flopRule / 100, displayMode, 10)}</h3>
                <p>
                  Точно <strong>{formatShare(flopEquity, displayMode, 12)}</strong>. Правило
                  держится {Math.abs(flopDelta) < 0.05
                    ? 'идеально'
                    : `с погрешностью ~${Math.abs(flopDelta).toFixed(1)}%`}
                  {flopDelta > 0 ? ' (приближение завышает)' : flopDelta < 0 ? ' (приближение занижает)' : ''}.
                </p>
              </article>
              <article className="result-card">
                <p className="card-label">Тёрн → ривер</p>
                <h3>≈ {formatShare(turnRule / 100, displayMode, 10)}</h3>
                <p>
                  Точно <strong>{formatShare(turnEquity, displayMode, 12)}</strong>. Правило
                  держится {Math.abs(turnDelta) < 0.05
                    ? 'идеально'
                    : `с погрешностью ~${Math.abs(turnDelta).toFixed(1)}%`}
                  {turnDelta > 0 ? ' (приближение завышает)' : turnDelta < 0 ? ' (приближение занижает)' : ''}.
                </p>
              </article>
              <article className="result-card">
                <p className="card-label">Pot odds, которые надо отбить</p>
                <h3>{formatShare(flopEquity, displayMode, 12)}</h3>
                <p>
                  Чтобы колл был нулевым на флопе, тебе нужны <strong>pot odds</strong> не
                  хуже этой цифры. Например, ставка <strong>1/2 банка</strong> даёт{' '}
                  <strong>25%</strong> equity к колл-порогу.
                </p>
              </article>
            </div>

            <p className="outs-note">
              Формулы: флоп → ривер = 1 − C(47−outs, 2)/C(47, 2), тёрн → ривер = outs / 46.
              Правило подводит при больших значениях (≥ 13 аутов) — там пересчитывай точно.
            </p>

            <div className="quick-drill-card combo-outs-drill">
              <div className="section-head compact">
                <div>
                  <p className="kicker">Мини-дрилл</p>
                  <h3>Прикинь equity по аутам</h3>
                </div>
                <p className="table-note">
                  Сначала дай быстрый ответ по правилу 4/2, затем проверь точную формулу.
                </p>
              </div>

              <div className="summary-grid compact-summary">
                <article className="result-card primary">
                  <p className="card-label">Спот</p>
                  <h3>{outsDrillSpot.title}</h3>
                  <p>
                    {formatInteger(outsDrillSpot.outs)}{' '}
                    {outsDrillSpot.outs >= 2 && outsDrillSpot.outs <= 4
                      ? 'аута'
                      : 'аутов'}{' '}
                    {outsDrillSpot.street === 'flop' ? 'с флопа до ривера' : 'с тёрна до ривера'}.
                  </p>
                </article>
                <article className="result-card">
                  <p className="card-label">Серия</p>
                  <h3>{formatInteger(outsDrillStreak)}</h3>
                  <p>Попадание считается в пределах 2 п.п. от точной формулы.</p>
                </article>
              </div>

              <div className="quick-drill-controls">
                <EditableNumberField
                  ariaLabel="Outs equity drill guess"
                  className="number-field compact-field"
                  inputMax={100}
                  inputMin={0}
                  label="Твой ответ, %"
                  onValueChange={(value) => {
                    setOutsDrillGuess(value)
                    if (outsDrillChecked) {
                      setOutsDrillChecked(false)
                    }
                  }}
                  sanitizeMax={100}
                  sanitizeMin={0}
                  value={outsDrillGuess}
                />

                <div className="quick-drill-actions">
                  <button className="mode-chip active" onClick={checkOutsDrill} type="button">
                    Проверить
                  </button>
                  <button className="mode-chip" onClick={nextOutsDrillRound} type="button">
                    Новый спот
                  </button>
                </div>
              </div>

              <p className="igor-summary">
                Подсказка без спойлера:{' '}
                {outsDrillSpot.street === 'flop' ? (
                  <>
                    на флопе сначала умножь ауты на <strong>4</strong>, потом проверь
                    через две карты до ривера.
                  </>
                ) : (
                  <>
                    на тёрне сначала умножь ауты на <strong>2</strong>, потом проверь
                    через одну карту.
                  </>
                )}
              </p>

              {outsDrillChecked ? (
                <article
                  className={
                    outsDrillSolved
                      ? 'result-card quick-drill-result success'
                      : 'result-card quick-drill-result'
                  }
                >
                  <p className="card-label">{outsDrillSolved ? 'Попал' : 'Мимо, но близко'}</p>
                  <h3>{formatShare(outsDrillEquity, 'percent', 12)}</h3>
                  <p>
                    Твой ответ: <strong>{formatShare(outsDrillGuess / 100, 'percent')}</strong>,
                    ошибка около <strong>{outsDrillDifference.toFixed(1)} п.п.</strong>.
                    Быстрое правило даёт <strong>{formatInteger(outsDrillRule)}%</strong>.
                  </p>
                  <div className="quick-drill-solution" aria-label="Решение по аутам">
                    <p className="card-label">Решение по алгоритму</p>
                    {outsDrillSpot.street === 'flop' ? (
                      <ol>
                        <li>
                          На флопе до ривера две карты, поэтому сначала считаем шанс не
                          попасть: <strong>47 − {formatInteger(outsDrillSpot.outs)}</strong>{' '}
                          на тёрне и <strong>46 − {formatInteger(outsDrillSpot.outs)}</strong>{' '}
                          на ривере.
                        </li>
                        <li>
                          Вероятность промаха:{' '}
                          <strong>
                            ({formatInteger(47 - outsDrillSpot.outs)} / 47) × (
                            {formatInteger(46 - outsDrillSpot.outs)} / 46)
                          </strong>
                          .
                        </li>
                        <li>
                          Equity = 1 − промах ={' '}
                          <strong>{formatShare(outsDrillEquity, 'percent', 12)}</strong>.
                          Правило 4/2 даёт ориентир{' '}
                          <strong>{formatInteger(outsDrillRule)}%</strong>.
                        </li>
                      </ol>
                    ) : (
                      <ol>
                        <li>
                          На тёрне осталась одна карта, в колоде условно{' '}
                          <strong>46</strong> неизвестных карт.
                        </li>
                        <li>
                          Equity = outs / 46 ={' '}
                          <strong>
                            {formatInteger(outsDrillSpot.outs)} / 46
                          </strong>
                          .
                        </li>
                        <li>
                          Точный ответ:{' '}
                          <strong>{formatShare(outsDrillEquity, 'percent', 12)}</strong>.
                          Быстрое правило 2× даёт{' '}
                          <strong>{formatInteger(outsDrillRule)}%</strong>.
                        </li>
                      </ol>
                    )}
                  </div>
                </article>
              ) : null}
            </div>
          </section>

          <section className="surface jump-target" id="combo-grid">
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
              что даёт <strong>{formatInteger(analysis.rawComboCount)}</strong> сырых
              префлоп-комбо до учёта борда.
            </p>
          </section>

          <section className="advanced-layout">
            <section className="surface jump-target" id="combo-board">
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

              <BoardPicker
                ariaLabel="Combinatorics board picker"
                boardCards={boardCards}
                boardSummary={boardSummary}
                onClearBoard={clearBoard}
                onClearSlot={clearBoardSlot}
                onToggleCard={toggleBoardCard}
              />

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
                  <h3>
                    {formatShare(
                      analysis.liveComboCount / Math.max(1, analysis.rawComboCount),
                      displayMode,
                    )}
                  </h3>
                  <p>Сколько диапазона ещё существует как реальный набор стартовых комбо.</p>
                </article>
              </div>
            </section>

            <section className="surface jump-target" id="combo-categories">
              <div className="section-head compact">
                <div>
                  <p className="kicker">Наполнение диапазона</p>
                  <h2>Из чего сделан диапазон на текущей улице</h2>
                </div>
                <p className="table-note">
                  Готовые руки считаются по сильнейшей категории без пересечений. Дро и
                  бекдоры могут пересекаться и считаются отдельно. На ривере дро пропадают
                  — всё, что не собрало пару, уходит в пустые руки.
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
                                <strong>{formatInteger(summary.count)}</strong> комбо ·{' '}
                                {formatShare(summary.share, displayMode, 12)}
                              </span>
                            </div>
                            <ComboExamples examples={summary.examples} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="combo-breakdown-empty">
                        В диапазоне нет руки сильнее пары.
                      </p>
                    )}
                  </div>

                  {analysis.street !== 'river' ? (
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
                                  <strong>{formatInteger(summary.count)}</strong> комбо ·{' '}
                                  {formatShare(summary.share, displayMode, 12)}
                                </span>
                              </div>
                              <ComboExamples examples={summary.examples} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="combo-breakdown-empty">
                          На этом борде готовых дро нет.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {analysis.street === 'flop' ? (
                    <div className="combo-breakdown-group">
                      <h3 className="combo-breakdown-title">Бекдоры</h3>
                      {analysis.backdoorSummaries.length > 0 ? (
                        <ul className="combo-breakdown-list">
                          {analysis.backdoorSummaries.map((summary) => (
                            <li className="combo-breakdown-row" key={summary.category}>
                              <div className="combo-breakdown-header">
                                <span className="combo-breakdown-name">
                                  {getBackdoorLabel(summary.category)}
                                </span>
                                <span className="combo-breakdown-stats">
                                  <strong>{formatInteger(summary.count)}</strong> комбо ·{' '}
                                  {formatShare(summary.share, displayMode, 12)}
                                </span>
                              </div>
                              <ComboExamples examples={summary.examples} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="combo-breakdown-empty">
                          На этом флопе бекдоры не выделены.
                        </p>
                      )}
                    </div>
                  ) : null}

                  <div className="combo-breakdown-group">
                    <h3 className="combo-breakdown-title">Пустые руки</h3>
                    {analysis.emptySummary ? (
                      <ul className="combo-breakdown-list">
                        <li className="combo-breakdown-row">
                          <div className="combo-breakdown-header">
                            <span className="combo-breakdown-name">
                              {analysis.street === 'river'
                                ? 'Всё, что не дотянулось до пары'
                                : 'Без пары, без дро и без бекдоров'}
                            </span>
                            <span className="combo-breakdown-stats">
                              <strong>{formatInteger(analysis.emptySummary.count)}</strong>{' '}
                              комбо ·{' '}
                              {formatShare(analysis.emptySummary.share, displayMode, 12)}
                            </span>
                          </div>
                          <ComboExamples examples={analysis.emptySummary.examples} />
                        </li>
                      </ul>
                    ) : (
                      <p className="combo-breakdown-empty">
                        Все живые комбо с чем-то зацепились — пустых рук нет.
                      </p>
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
    </>
  )
}
