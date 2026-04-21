import { Fragment, useState } from 'react'
import { HeroActionChips } from '../components/HeroActionChips'
import { formatInteger, formatShare } from '../lib/formatters'
import {
  analyzeRange,
  getCardOptions,
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

const boardLabels = ['Флоп 1', 'Флоп 2', 'Флоп 3', 'Тёрн', 'Ривер'] as const
const rangeGrid = getRangeGrid()
const cardOptions = getCardOptions()

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

  const selectedCellLabels = Array.from(selectedCells)
  const analysis = analyzeRange(selectedCellLabels, boardCards)
  const boardSummary = analysis.board.length === 0 ? 'борд пока пустой' : analysis.board.map(formatCard).join(' ')

  function toggleCell(label: string) {
    setSelectedCells((currentSelection) => {
      const nextSelection = new Set(currentSelection)

      if (nextSelection.has(label)) {
        nextSelection.delete(label)
      } else {
        nextSelection.add(label)
      }

      return nextSelection
    })
  }

  function applyPreset(preset: (typeof presetButtons)[number]['preset']) {
    setSelectedCells(new Set(getPresetRangeCells(preset)))
  }

  function setBoardCard(slotIndex: number, nextValue: string) {
    setBoardCards((currentBoard) => {
      const nextBoard = [...currentBoard]
      nextBoard[slotIndex] = nextValue === '' ? '' : (nextValue as CardCode)
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
            какие руки доезжают на конкретной доске и как блокеры режут сырые префлопные
            числа. Сверху шпаргалка памяти, ниже матрица и живой board-analyzer.
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
            <h2>Базовая память по префлоп-комбинаторике</h2>
          </div>
          <p className="table-note">
            Самые полезные числа здесь конечны и хорошо запоминаются. Идея простая: не
            пересчитывай заново, а держи в голове несколько опорных шаблонов и blocker-лестницу.
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
              Если на борде лежит один из нужных рангов, семейство вроде <strong>AK</strong>{' '}
              теряет четверть комбо и падает с <strong>16</strong> до <strong>12</strong>.
            </p>
          </article>
          <article className="result-card">
            <p className="card-label">По одному блокеру обоих рангов</p>
            <h3>16 → 9</h3>
            <p>
              Когда видишь и один туз, и одного короля, у <strong>AK</strong> остаётся всего{' '}
              <strong>9</strong> живых комбо вместо 16.
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
          <div className="range-matrix" role="grid" aria-label="Preflop range grid">
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
                      onClick={() => toggleCell(cell.label)}
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
              <h2>Поставь флоп, тёрн и ривер, чтобы увидеть live combos</h2>
            </div>
            <p className="table-note">
              Здесь матрица перестаёт быть абстракцией: борд сразу выбивает мёртвые комбо и
              пересчитывает, какие made hands и draws остались в твоём диапазоне.
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
                    const disabled =
                      boardCards.some((selectedCard, selectedIndex) => {
                        if (selectedIndex === index) {
                          return false
                        }

                        return selectedCard === card
                      })

                    return (
                      <option disabled={disabled} key={card} value={card}>
                        {formatCard(card)}
                      </option>
                    )
                  })}
                </select>
              </label>
            ))}
          </div>

          <div className="combo-board-toolbar">
            <div className="combo-board-preview" aria-live="polite">
              {analysis.board.length === 0 ? (
                <span className="combo-board-empty">Борд пока не задан</span>
              ) : (
                analysis.board.map((card) => (
                  <span className={`combo-board-card ${getCardTone(card)}`} key={card}>
                    {formatCard(card)}
                  </span>
                ))
              )}
            </div>

            <button className="mode-chip" onClick={clearBoard} type="button">
              Очистить борд
            </button>
          </div>

          <div className="summary-grid compact-summary">
            <article className="result-card primary">
              <p className="card-label">Живые комбо</p>
              <h3>{formatInteger(analysis.liveComboCount)}</h3>
              <p>То, что реально осталось в диапазоне после вычитания видимых карт борда.</p>
            </article>
            <article className="result-card">
              <p className="card-label">Умерло от блокеров</p>
              <h3>{formatInteger(analysis.blockedComboCount)}</h3>
              <p>Это разница между сырыми префлоп-комбо и тем, что пережило раздачу карт.</p>
            </article>
            <article className="result-card">
              <p className="card-label">Доля живых</p>
              <h3>{formatShare(analysis.liveComboCount / Math.max(1, analysis.rawComboCount), displayMode)}</h3>
              <p>Сколько диапазона ещё существует как реальный набор hole-card комбинаций.</p>
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
              Ниже strongest-hand классификация для made hands и отдельный overlay для дро.
              Made hands суммируются эксклюзивно, а draws могут пересекаться.
            </p>
          </div>

          {analysis.postflopReady ? (
            <div className="combo-table-stack">
              <div className="table-wrap">
                <table>
                  <caption>Made hand breakdown текущего диапазона.</caption>
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
                  <caption>Draw breakdown текущего диапазона.</caption>
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
                          На этом борде дро не обнаружены или board-анализ ещё не включён.
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
              <h3>Нужны 3 карты</h3>
              <p>
                Постфлоп-категории включаются, как только ты задаёшь хотя бы флоп. До этого
                матрица честно показывает только префлопную комбинаторику и blocker-эффект.
              </p>
            </article>
          )}
        </section>
      </section>
    </>
  )
}
