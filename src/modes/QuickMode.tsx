import { useMemo, useState } from 'react'
import { EditableNumberField } from '../components/EditableNumberField'
import { HeroActionChips } from '../components/HeroActionChips'
import {
  describeRatioAccuracy,
  formatBetLabel,
  formatExactRatio,
  formatInteger,
  formatRatio,
  formatShare,
  pluralizeRu,
} from '../lib/formatters'
import {
  calculateMetrics,
  quickPresetSizes,
  type DisplayMode,
} from '../lib/pokerMath'

type QuickModeProps = {
  betPercent: number
  displayMode: DisplayMode
  onBetPercentChange: (value: number) => void
}

const quickHeroActions = [
  { label: 'К калькулятору', href: '#quick-calculator' },
  { label: 'К цифрам', href: '#quick-summary' },
  { label: 'К дриллу', href: '#quick-drill' },
  { label: 'К мнемонике', href: '#quick-memory' },
  { label: 'К шпаргалке', href: '#quick-cheatsheet' },
]

const RATIO_ERROR_THRESHOLD_PERCENT = 0.5

const BET_SLIDER_MIN = 1
const BET_SLIDER_MAX = 300
const BET_SLIDER_TICKS = [1, 25, 50, 75, 100, 150, 200, 300] as const
const drillBetPool = [25, 33, 40, 50, 66, 75, 100, 125, 150, 200] as const

function sliderPositionPercent(value: number) {
  return ((value - BET_SLIDER_MIN) / (BET_SLIDER_MAX - BET_SLIDER_MIN)) * 100
}

export function QuickMode({
  betPercent,
  displayMode,
  onBetPercentChange,
}: QuickModeProps) {
  const [drillBetPercent, setDrillBetPercent] = useState(75)
  const [drillGuess, setDrillGuess] = useState(33)
  const [drillChecked, setDrillChecked] = useState(false)
  const [drillStreak, setDrillStreak] = useState(0)
  const betMultiple = betPercent / 100
  const metrics = calculateMetrics(betMultiple)
  const drillMetrics = useMemo(
    () => calculateMetrics(drillBetPercent / 100),
    [drillBetPercent],
  )
  const exactValueToBluff = (1 + betMultiple) / betMultiple
  const ratioAccuracy = describeRatioAccuracy(
    metrics.valueToBluff.numerator,
    metrics.valueToBluff.denominator,
    exactValueToBluff,
  )
  const showRatioAccuracy = ratioAccuracy.errorPercent >= RATIO_ERROR_THRESHOLD_PERCENT
  const drillDifference = Math.abs(drillMetrics.breakEvenFe * 100 - drillGuess)
  const drillSolved = drillDifference <= 1.5

  function nextDrillRound() {
    const nextOptions = drillBetPool.filter((size) => size !== drillBetPercent)
    const nextBet = nextOptions[Math.floor(Math.random() * nextOptions.length)] ?? drillBetPool[0]

    setDrillBetPercent(nextBet)
    setDrillGuess(0)
    setDrillChecked(false)
  }

  function checkDrill() {
    setDrillChecked(true)
    setDrillStreak((currentStreak) => (drillSolved ? currentStreak + 1 : 0))
  }

  return (
    <>
      <header className="hero-panel surface quick-hero">
        <div className="hero-copy">
          <p className="eyebrow">Быстрый калькулятор</p>
          <h1>Ставка за секунду: сколько фолдов нужно и какой колл ты даешь.</h1>
          <p className="hero-text">
            Один сайзинг сразу отвечает на три вопроса: <span>breakeven FE</span>,
            какие <span>pot odds</span> получает колл и сколько{' '}
            <span>value на 1 bluff</span> можно держать на ривере. Бонус-мнемоника:
            <span> FE + MDF всегда дают 100%</span>.
          </p>
          <HeroActionChips
            ariaLabel="Быстрые переходы быстрого калькулятора"
            items={quickHeroActions}
          />
        </div>

        <div className="hero-focus">
          <p className="focus-label">Текущий сайзинг</p>
          <p className="focus-size">{formatBetLabel(betMultiple, displayMode)}</p>
          <p className="focus-subtitle">
            Ты рискуешь <strong>{formatBetLabel(betMultiple, displayMode)}</strong>, чтобы забрать{' '}
            <strong>1 банк</strong>.
          </p>
          <div className="focus-equation">
            <span>Мнемоника</span>
            <strong>
              риск {metrics.betFraction.numerator}, награда {metrics.betFraction.denominator}
            </strong>
            <p>
              FE = {metrics.betFraction.numerator}/
              {metrics.betFraction.denominator + metrics.betFraction.numerator}, MDF ={' '}
              {metrics.betFraction.denominator}/
              {metrics.betFraction.denominator + metrics.betFraction.numerator}
            </p>
          </div>
          <div className="focus-metrics">
            <div>
              <span>Фолдов нужно</span>
              <strong>{formatShare(metrics.breakEvenFe, displayMode)}</strong>
            </div>
            <div>
              <span>Value на 1 bluff</span>
              <strong>
                {formatRatio(
                  metrics.valueToBluff.numerator,
                  metrics.valueToBluff.denominator,
                )}
              </strong>
            </div>
            <div>
              <span>Защита MDF</span>
              <strong>{formatShare(metrics.mdf, displayMode)}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="calculator surface jump-target" id="quick-calculator">
          <div className="section-head">
            <div>
              <p className="kicker">Калькулятор</p>
              <h2>Размер ставки</h2>
            </div>
            <EditableNumberField
              ariaLabel="Bet size percent"
              className="number-field bet-percent-field"
              inputMax={300}
              inputMin={1}
              label="Ставка, % банка"
              onValueChange={(value) => onBetPercentChange(Math.round(value))}
              sanitizeMax={300}
              sanitizeMin={1}
              step={1}
              value={betPercent}
            />
          </div>

          <div className="slider-block">
            <div className="slider-track-wrap">
              <input
                aria-label="Bet size slider"
                className="bet-slider"
                max={BET_SLIDER_MAX}
                min={BET_SLIDER_MIN}
                onChange={(event) =>
                  onBetPercentChange(Math.round(Number(event.target.value)))
                }
                step={1}
                type="range"
                value={betPercent}
              />
              <div className="slider-ticks" aria-hidden="true">
                {BET_SLIDER_TICKS.map((tick) => (
                  <span
                    className="slider-tick"
                    key={tick}
                    style={{ left: `${sliderPositionPercent(tick)}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="slider-scale" aria-hidden="true">
              {BET_SLIDER_TICKS.map((tick) => (
                <span
                  className="slider-scale-mark"
                  key={tick}
                  style={{ left: `${sliderPositionPercent(tick)}%` }}
                >
                  {tick}%
                </span>
              ))}
            </div>
          </div>

          <div className="preset-grid">
            {quickPresetSizes.map((size) => {
              const isActive = Math.abs(size - betMultiple) < 0.005

              return (
                <button
                  className={isActive ? 'preset active' : 'preset'}
                  key={size}
                  onClick={() => onBetPercentChange(size * 100)}
                  type="button"
                >
                  <span>{formatBetLabel(size, displayMode)}</span>
                  <small>{formatShare(calculateMetrics(size).breakEvenFe, displayMode)} фолдов нужно</small>
                </button>
              )
            })}
          </div>

          <div className="formula-strip">
            <div>
              <p className="strip-label">Формула чистого блефа</p>
              <p className="strip-value">FE = Ставка / (Банк + Ставка)</p>
            </div>
            <div>
              <p className="strip-label">Если банк принять за 1</p>
              <p className="strip-value">FE = B / (1 + B)</p>
            </div>
          </div>
        </section>

        <section className="summary-grid jump-target" id="quick-summary">
          <article className="result-card primary">
            <p className="card-label">Фолдов нужно для нуля</p>
            <h3>{formatShare(metrics.breakEvenFe, displayMode)}</h3>
            <p>
              Мнемоника: ставка должна проходить{' '}
              <strong>{metrics.feFraction.numerator}</strong>{' '}
              {pluralizeRu(metrics.feFraction.numerator, ['раз', 'раза', 'раз'])} из{' '}
              <strong>{metrics.feFraction.denominator}</strong>. Обратная сторона той же
              дроби: <strong>MDF {formatShare(metrics.mdf, displayMode)}</strong>.
            </p>
            <p className="card-footnote">
              MDF (minimum defense frequency) — минимальная доля диапазона, которую надо
              продолжать против ставки, чтобы чистый блеф не плюсовал автоматически.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Колл и value:bluff</p>
            <h3>
              {formatRatio(
                metrics.valueToBluff.numerator,
                metrics.valueToBluff.denominator,
              )}
            </h3>
            {showRatioAccuracy ? (
              <p className="ratio-exact">
                точно {formatExactRatio(ratioAccuracy.exactValue)}, погрешность{' '}
                ~{ratioAccuracy.errorPercent.toFixed(1)}%
              </p>
            ) : null}
            <p>
              Значения совпадают, потому что обе задачи читают одну и ту же дробь:{' '}
              <strong>(банк + ставка) : ставка</strong>.
            </p>
            <p className="card-footnote">
              Для колла это: доплатить <strong>{metrics.valueToBluff.denominator}</strong>,
              чтобы выиграть <strong>{metrics.valueToBluff.numerator}</strong>{' '}
              {pluralizeRu(metrics.valueToBluff.numerator, ['часть', 'части', 'частей'])}.
              Для river-баланса это: держать{' '}
              <strong>{metrics.valueToBluff.numerator} value</strong> на{' '}
              <strong>{metrics.valueToBluff.denominator} bluff</strong>.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Блефов в ставке</p>
            <h3>{formatShare(metrics.bluffShare, displayMode)}</h3>
            <p>
              Это доля блефов в беттинг-рейндже, а не процент фолдов, который нужен. На
              ривере эта же цифра равна <strong>equity без FE</strong>.
            </p>
          </article>
        </section>
      </main>

      <section className="surface lesson-card jump-target quick-drill-card" id="quick-drill">
        <div className="section-head compact">
          <div>
            <p className="kicker">Мини-дрилл</p>
            <h2>Угадай, сколько фолдов нужно этому сайзингу</h2>
          </div>
          <p className="table-note">
            Быстрая тренировка на one-liner-вопрос: видишь ставку и сразу пытаешься назвать
            breakeven FE без калькулятора.
          </p>
        </div>

        <div className="summary-grid compact-summary">
          <article className="result-card primary">
            <p className="card-label">Сайзинг в задаче</p>
            <h3>{formatBetLabel(drillBetPercent / 100, displayMode)}</h3>
            <p>Назови долю фолдов, которая нужна чистому блефу для нуля.</p>
          </article>
          <article className="result-card">
            <p className="card-label">Серия</p>
            <h3>{formatInteger(drillStreak)}</h3>
            <p>Считается только если попадаешь в ответ с точностью примерно до 1,5 п.п.</p>
          </article>
        </div>

        <div className="quick-drill-controls">
          <EditableNumberField
            ariaLabel="Drill fold equity guess"
            className="number-field compact-field"
            inputMax={100}
            inputMin={0}
            label="Твой ответ, %"
            onValueChange={(value) => {
              setDrillGuess(value)
              if (drillChecked) {
                setDrillChecked(false)
              }
            }}
            sanitizeMax={100}
            sanitizeMin={0}
            value={drillGuess}
          />

          <div className="quick-drill-actions">
            <button className="mode-chip active" onClick={checkDrill} type="button">
              Проверить
            </button>
            <button className="mode-chip" onClick={nextDrillRound} type="button">
              Новый спот
            </button>
          </div>
        </div>

        <p className="igor-summary">
          Подсказка без спойлера: сначала переведи ставку в <strong>риск за награду</strong>, а
          потом прочитай FE как <strong>risk / (risk + reward)</strong>.
        </p>

        {drillChecked ? (
          <article className={drillSolved ? 'result-card quick-drill-result success' : 'result-card quick-drill-result'}>
            <p className="card-label">{drillSolved ? 'Попал' : 'Мимо, но близко'}</p>
            <h3>{formatShare(drillMetrics.breakEvenFe, 'percent')}</h3>
            <p>
              Твой ответ: <strong>{formatShare(drillGuess / 100, 'percent')}</strong>, ошибка около{' '}
              <strong>{drillDifference.toFixed(1)} п.п.</strong>. Для этого сайзинга MDF будет{' '}
              <strong>{formatShare(drillMetrics.mdf, displayMode)}</strong>.
            </p>
          </article>
        ) : null}
      </section>

      <section className="lesson-grid jump-target" id="quick-memory">
        <article className="surface lesson-card warning-card">
          <p className="kicker">Не смешивай цифры</p>
          <h2>Один и тот же сайзинг одновременно говорит про фолды, колл и баланс.</h2>
          <div className="warning-points">
            <p>
              <strong>{formatShare(metrics.breakEvenFe, displayMode)}</strong> нужно, чтобы чистый блеф не
              терял деньги.
            </p>
            <p>
              <strong>{formatShare(metrics.breakEvenFe, displayMode)}</strong> +{' '}
              <strong>{formatShare(metrics.mdf, displayMode)}</strong> ={' '}
              <span>{displayMode === 'percent' ? '100%' : '1'}</span>. Помни одну
              цифру, вторая всегда дополняет ее.
            </p>
            <p>
              <strong>
                {formatRatio(
                  metrics.valueToBluff.numerator,
                  metrics.valueToBluff.denominator,
                )}
              </strong>{' '}
              читается и как шансы банка на колл, и как <span>value : bluff</span>.
            </p>
          </div>
        </article>

        <article className="surface lesson-card">
          <p className="kicker">Мнемоника</p>
          <h2>Приведи банк к 1 и считай через «риск за награду».</h2>
          <ul className="memory-list">
            <li>
              <strong>1/2 банка</strong>: риск 1, выигрыш 2, значит нужно{' '}
              <strong>1 / 3 фолдов</strong>.
            </li>
            <li>
              <strong>1 банк</strong>: риск 1, выигрыш 1, значит нужно <strong>1 / 2 фолдов</strong>.
            </li>
            <li>
              <strong>2 банка</strong>: риск 2, выигрыш 1, значит нужно{' '}
              <strong>2 / 3 фолдов</strong>.
            </li>
            <li>
              <strong>Общее правило для n/d банка</strong>:
              <span>
                {' '}
                FE = n/(n+d), MDF = d/(n+d), а bluff share = n/(d+2n).
              </span>
            </li>
            <li>
              <strong>Запоминай одной дробью</strong>:
              <span> 3:1, 2:1, 3:2 подходят и для колла, и для value:bluff.</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="surface cheat-table jump-target" id="quick-cheatsheet">
        <div className="section-head compact">
          <div>
            <p className="kicker">Шпаргалка</p>
            <h2>Популярные сайзинги без калькулятора</h2>
          </div>
          <p className="table-note">
            Быстрая память для ривера: сколько фолдов нужно, какой колл ты даешь и сколько
            блефов можно держать. Здесь же видно, как FE и MDF дополняют друг друга до 100%.
          </p>
        </div>

        <div className="table-wrap">
          <table>
            <caption>Шпаргалка по популярным сайзингам: фолды, баланс и защита.</caption>
            <thead>
              <tr>
                <th scope="col">Ставка</th>
                <th scope="col">Фолдов нужно</th>
                <th scope="col">Value : Bluff</th>
                <th scope="col">Блефов в ставке</th>
                <th scope="col">MDF</th>
              </tr>
            </thead>
            <tbody>
              {quickPresetSizes.map((size) => {
                const row = calculateMetrics(size)
                const isActive = Math.abs(size - betMultiple) < 0.005

                return (
                  <tr className={isActive ? 'active-row' : undefined} key={size}>
                    <td>{formatBetLabel(size, displayMode)}</td>
                    <td>{formatShare(row.breakEvenFe, displayMode)}</td>
                    <td>
                      {formatRatio(
                        row.valueToBluff.numerator,
                        row.valueToBluff.denominator,
                      )}
                    </td>
                    <td>{formatShare(row.bluffShare, displayMode)}</td>
                    <td>{formatShare(row.mdf, displayMode)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="footnote">
          Сейчас выбрано <strong>{formatBetLabel(betMultiple, displayMode)}</strong>:
          <strong>
            {' '}
            {metrics.valueToBluff.numerator} value / {metrics.valueToBluff.denominator} bluff
          </strong>{' '}
          на ривере, а защищать против такого сайзинга нужно примерно{' '}
          <strong>{formatShare(metrics.mdf, displayMode)}</strong> диапазона.
        </p>
      </section>
    </>
  )
}
