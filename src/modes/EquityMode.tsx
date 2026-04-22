import { Fragment, useMemo, useState, useTransition } from 'react'
import { EditableNumberField } from '../components/EditableNumberField'
import { HeroActionChips } from '../components/HeroActionChips'
import {
  getCardOptions,
  getPresetRangeCells,
  getRangeGrid,
  rangeRanks,
  type CardCode,
} from '../lib/combinatorics'
import { calculateEquity, getInputCombos, type EquityInputMode } from '../lib/equity'
import { formatInteger, formatShare } from '../lib/formatters'
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
  { label: 'SC', preset: 'suited_connectors' as const },
] as const

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

type EquityModeProps = {
  displayMode: DisplayMode
  embedded?: boolean
}

export function EquityMode({ displayMode, embedded = false }: EquityModeProps) {
  const [heroMode, setHeroMode] = useState<EquityInputMode>('hand')
  const [villainMode, setVillainMode] = useState<EquityInputMode>('range')
  const [heroHand, setHeroHand] = useState<[CardCode | '', CardCode | '']>(['Ah', 'Ad'])
  const [villainHand, setVillainHand] = useState<[CardCode | '', CardCode | '']>(['Kh', 'Kd'])
  const [heroRange, setHeroRange] = useState<Set<string>>(() => new Set(getPresetRangeCells('99plus')))
  const [villainRange, setVillainRange] = useState<Set<string>>(
    () => new Set([...getPresetRangeCells('broadways'), ...getPresetRangeCells('axs')]),
  )
  const [boardCards, setBoardCards] = useState<Array<CardCode | ''>>(['', '', '', '', ''])
  const [iterations, setIterations] = useState(4000)
  const [isPending, startTransition] = useTransition()
  const [isStale, setIsStale] = useState(false)

  const heroInput = useMemo(
    () => ({
      handCards: heroHand,
      mode: heroMode,
      rangeCells: Array.from(heroRange),
    }),
    [heroHand, heroMode, heroRange],
  )

  const villainInput = useMemo(
    () => ({
      handCards: villainHand,
      mode: villainMode,
      rangeCells: Array.from(villainRange),
    }),
    [villainHand, villainMode, villainRange],
  )

  const [result, setResult] = useState(() =>
    calculateEquity(heroInput, villainInput, boardCards, iterations),
  )

  const heroPreviewCombos = useMemo(() => getInputCombos(heroInput, boardCards), [boardCards, heroInput])
  const villainPreviewCombos = useMemo(
    () => getInputCombos(villainInput, boardCards),
    [boardCards, villainInput],
  )

  function markStale() {
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
    startTransition(() => {
      setResult(calculateEquity(heroInput, villainInput, boardCards, iterations))
      setIsStale(false)
    })
  }

  function applyRangePreset(
    side: 'hero' | 'villain',
    preset: (typeof presetButtons)[number]['preset'],
  ) {
    const nextSelection = new Set(getPresetRangeCells(preset))

    if (side === 'hero') {
      setHeroRange(nextSelection)
    } else {
      setVillainRange(nextSelection)
    }

    markStale()
  }

  function toggleRangeCell(side: 'hero' | 'villain', label: string) {
    const setter = side === 'hero' ? setHeroRange : setVillainRange

    setter((currentSelection) => {
      const nextSelection = new Set(currentSelection)

      if (nextSelection.has(label)) {
        nextSelection.delete(label)
      } else {
        nextSelection.add(label)
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

  return (
    <>
      {embedded ? null : (
      <header className="hero-panel surface equity-hero">
        <div className="hero-copy">
          <p className="eyebrow">Эквити</p>
          <h1>Рука vs рука, рука vs рендж и рендж vs рендж.</h1>
          <p className="hero-text">
            Это уже PokerStove-подобный модуль: задаёшь hero, villain и борд, а калькулятор
            честно считает equity с учётом блокеров. Пока это Monte Carlo на неполном борде
            и точный расчёт на готовом ривере.
          </p>
          <HeroActionChips
            ariaLabel="Быстрые переходы equity-режима"
            items={equityHeroActions}
          />
        </div>

        <div className="hero-focus equity-focus">
          <p className="focus-label">Текущий спот</p>
          <p className="focus-size">
            {formatShare(result.heroEquity, displayMode)} / {formatShare(result.villainEquity, displayMode)}
          </p>
          <p className="focus-subtitle">
            Hero сейчас играет <strong>{heroMode === 'hand' ? describeHand(heroHand) : `${formatInteger(heroPreviewCombos.length)} комбо`}</strong>{' '}
            против{' '}
            <strong>{villainMode === 'hand' ? describeHand(villainHand) : `${formatInteger(villainPreviewCombos.length)} комбо`}</strong>.
          </p>
          <div className="focus-metrics">
            <div>
              <span>Валидных матчапов</span>
              <strong>{formatInteger(result.validMatchups)}</strong>
            </div>
            <div>
              <span>Сэмплов</span>
              <strong>{formatInteger(result.sampledTrials)}</strong>
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
              Можно задать конкретную руку или целый диапазон классами рук.
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

              <div className="range-matrix-wrap">
                <div className="range-matrix" role="grid" aria-label="Hero range grid">
                  <div className="range-axis range-corner" aria-hidden="true" />
                  {rangeRanks.map((rank) => (
                    <div className="range-axis" key={`hero-col-${rank}`}>
                      {rank}
                    </div>
                  ))}

                  {rangeGrid.map((row, rowIndex) => (
                    <Fragment key={`hero-row-${rangeRanks[rowIndex]}`}>
                      <div className="range-axis">{rangeRanks[rowIndex]}</div>
                      {row.map((cell) => {
                        const selected = heroRange.has(cell.label)

                        return (
                          <button
                            aria-label={`Toggle hero ${cell.label}`}
                            aria-pressed={selected}
                            className={`range-cell ${cell.kind}${selected ? ' active' : ''}`}
                            key={`hero-${cell.label}`}
                            onClick={() => toggleRangeCell('hero', cell.label)}
                            type="button"
                          >
                            {cell.label}
                          </button>
                        )
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="footnote">
            Hero сейчас даёт <strong>{formatInteger(heroPreviewCombos.length)}</strong> live-комбо.
          </p>
        </section>

        <section className="surface equity-panel">
          <div className="section-head compact">
            <div>
              <p className="kicker">Villain</p>
              <h2>Оппонент</h2>
            </div>
            <p className="table-note">
              Тот же принцип: можно сузить до руки или оставить диапазон.
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

              <div className="range-matrix-wrap">
                <div className="range-matrix" role="grid" aria-label="Villain range grid">
                  <div className="range-axis range-corner" aria-hidden="true" />
                  {rangeRanks.map((rank) => (
                    <div className="range-axis" key={`villain-col-${rank}`}>
                      {rank}
                    </div>
                  ))}

                  {rangeGrid.map((row, rowIndex) => (
                    <Fragment key={`villain-row-${rangeRanks[rowIndex]}`}>
                      <div className="range-axis">{rangeRanks[rowIndex]}</div>
                      {row.map((cell) => {
                        const selected = villainRange.has(cell.label)

                        return (
                          <button
                            aria-label={`Toggle villain ${cell.label}`}
                            aria-pressed={selected}
                            className={`range-cell ${cell.kind}${selected ? ' active' : ''}`}
                            key={`villain-${cell.label}`}
                            onClick={() => toggleRangeCell('villain', cell.label)}
                            type="button"
                          >
                            {cell.label}
                          </button>
                        )
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </>
          )}

          <p className="footnote">
            Villain сейчас даёт <strong>{formatInteger(villainPreviewCombos.length)}</strong> live-комбо.
          </p>
        </section>
      </section>

      <section className="surface jump-target" id="equity-board">
        <div className="section-head compact">
          <div>
            <p className="kicker">Борд и запуск</p>
            <h2>Доска, блокеры и точность расчёта</h2>
          </div>
          <p className="table-note">
            На полном ривере калькулятор считает точно по всем валидным матчапам. На флопе и
            тёрне — Monte Carlo, чтобы вкладка оставалась быстрой.
          </p>
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
                {cardOptions.map((card) => {
                  return (
                    <option
                      disabled={isBoardCardDisabled(index, card)}
                      key={`board-${card}`}
                      value={card}
                    >
                      {formatCard(card)}
                    </option>
                  )
                })}
              </select>
            </label>
          ))}
        </div>

        <div className="equity-toolbar">
          <EditableNumberField
            className="number-field compact-field"
            inputMin={100}
            label="Monte Carlo сэмплы"
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
              ? 'Идёт пересчёт equity.'
              : isStale
                ? 'Параметры изменились: текущие equity-цифры уже устарели, нажми «Пересчитать equity».'
                : 'Текущий результат соответствует выбранным рукам, диапазонам и борду.'}
        </p>

        <p className="igor-summary">
          Мнемоника: эта вкладка уже считает не <strong>пот-оддсы</strong>, а реальную
          showdown-equity. Поэтому здесь важны <strong>блокеры</strong>,{' '}
          <strong>пересечения диапазонов</strong> и стадия борда.
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
          <p className="card-label">Валидных матчапов</p>
          <h3>{formatInteger(result.validMatchups)}</h3>
          <p>
            Сколько комбинаций <strong>hero x villain</strong> реально существует после вычитания
            одинаковых карт и борда.
          </p>
        </article>

        <article className="result-card">
          <p className="card-label">Режим расчёта</p>
          <h3>{result.board.length === 5 ? 'Точный' : 'Monte Carlo'}</h3>
          <p>
            Сэмплов использовано: <strong>{formatInteger(result.sampledTrials)}</strong>.
          </p>
        </article>
      </section>
    </>
  )
}
