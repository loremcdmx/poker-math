import { useState } from 'react'
import './App.css'

type DisplayMode = 'percent' | 'fraction'

type Fraction = {
  numerator: number
  denominator: number
}

const presetSizes = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.25, 1.5, 2]

const percentFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const decimalFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function greatestCommonDivisor(a: number, b: number) {
  let x = Math.abs(a)
  let y = Math.abs(b)

  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }

  return x || 1
}

function simplifyFraction(numerator: number, denominator: number): Fraction {
  const divisor = greatestCommonDivisor(numerator, denominator)

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  }
}

function approximateFraction(value: number, maxDenominator = 16): Fraction {
  let best = simplifyFraction(Math.round(value), 1)
  let smallestError = Math.abs(value - best.numerator / best.denominator)

  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator)

    if (numerator === 0) {
      continue
    }

    const error = Math.abs(value - numerator / denominator)

    if (error < smallestError) {
      smallestError = error
      best = simplifyFraction(numerator, denominator)
    }
  }

  return best
}

function clampBetPercent(value: number) {
  return Math.min(300, Math.max(1, value))
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value * 100)}%`
}

function formatPotUnits(value: number) {
  return `${decimalFormatter.format(value)}P`
}

function formatBetLabel(value: number, mode: DisplayMode) {
  if (mode === 'percent') {
    return `${percentFormatter.format(value * 100)}% pot`
  }

  const fraction = approximateFraction(value)

  if (fraction.denominator === 1) {
    if (fraction.numerator === 1) {
      return '1 pot'
    }

    return `${fraction.numerator}x pot`
  }

  return `${fraction.numerator}/${fraction.denominator} pot`
}

function formatRatio(left: number, right: number) {
  return `${left}:${right}`
}

function calculateMetrics(betMultiple: number) {
  const betFraction = approximateFraction(betMultiple)
  const breakEvenFe = betMultiple / (1 + betMultiple)
  const bluffShare = betMultiple / (1 + 2 * betMultiple)
  const mdf = 1 / (1 + betMultiple)
  const feFraction = simplifyFraction(
    betFraction.numerator,
    betFraction.denominator + betFraction.numerator,
  )
  const valueToBluff = simplifyFraction(
    betFraction.denominator + betFraction.numerator,
    betFraction.numerator,
  )
  const balancedBluffShare = simplifyFraction(
    betFraction.numerator,
    betFraction.denominator + betFraction.numerator * 2,
  )

  return {
    betFraction,
    breakEvenFe,
    bluffShare,
    mdf,
    feFraction,
    valueToBluff,
    balancedBluffShare,
  }
}

function App() {
  const [betPercent, setBetPercent] = useState(50)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent')

  const betMultiple = betPercent / 100
  const metrics = calculateMetrics(betMultiple)

  return (
    <div className="app-shell">
      <header className="hero-panel surface">
        <div className="hero-copy">
          <p className="eyebrow">Poker Math / Fold Equity Compass</p>
          <h1>Ставка, FE и value/bluff без путаницы и лишнего шума.</h1>
          <p className="hero-text">
            Введи размер ставки и сразу увидишь три разные вещи, которые часто
            смешивают: сколько нужно <span>fold equity</span> для нулевого
            блефа, какие <span>odds</span> ты даешь на колл и каким должен быть
            <span> value : bluff</span> баланс на ривере.
          </p>
          <div className="hero-tags">
            <span>Риск / (риск + награда)</span>
            <span>Odds = value : bluff</span>
            <span>FE не равно bluff share</span>
          </div>
        </div>

        <div className="hero-focus">
          <div className="toggle" role="group" aria-label="Display mode">
            <button
              className={displayMode === 'percent' ? 'toggle-item active' : 'toggle-item'}
              onClick={() => setDisplayMode('percent')}
              aria-pressed={displayMode === 'percent'}
              type="button"
            >
              Проценты
            </button>
            <button
              className={displayMode === 'fraction' ? 'toggle-item active' : 'toggle-item'}
              onClick={() => setDisplayMode('fraction')}
              aria-pressed={displayMode === 'fraction'}
              type="button"
            >
              Дроби
            </button>
          </div>

          <p className="focus-label">Текущий сайзинг</p>
          <p className="focus-size">{formatBetLabel(betMultiple, displayMode)}</p>
          <p className="focus-subtitle">
            Ты рискуешь <strong>{formatPotUnits(betMultiple)}</strong>, чтобы
            выиграть <strong>1P</strong>.
          </p>
          <div className="focus-equation">
            <span>Быстрая память</span>
            <strong>
              risk {metrics.betFraction.numerator}, reward{' '}
              {metrics.betFraction.denominator}
            </strong>
          </div>
          <div className="focus-metrics">
            <div>
              <span>0 EV FE</span>
              <strong>{formatPercent(metrics.breakEvenFe)}</strong>
            </div>
            <div>
              <span>Value : Bluff</span>
              <strong>
                {formatRatio(
                  metrics.valueToBluff.numerator,
                  metrics.valueToBluff.denominator,
                )}
              </strong>
            </div>
            <div>
              <span>MDF</span>
              <strong>{formatPercent(metrics.mdf)}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="calculator surface">
          <div className="section-head">
            <div>
              <p className="kicker">Калькулятор</p>
              <h2>Выбери размер ставки</h2>
            </div>
            <label className="number-field">
              <span>% pot</span>
              <input
                aria-label="Bet size percent"
                max={300}
                min={1}
                onChange={(event) => {
                  const nextValue = Number(event.target.value)

                  if (Number.isNaN(nextValue)) {
                    return
                  }

                  setBetPercent(clampBetPercent(nextValue))
                }}
                step={1}
                type="number"
                value={betPercent}
              />
            </label>
          </div>

          <div className="slider-block">
            <input
              aria-label="Bet size slider"
              className="bet-slider"
              max={300}
              min={1}
              onChange={(event) => setBetPercent(Number(event.target.value))}
              step={1}
              type="range"
              value={betPercent}
            />
            <div className="slider-scale" aria-hidden="true">
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
              <span>200%</span>
              <span>300%</span>
            </div>
          </div>

          <div className="preset-grid">
            {presetSizes.map((size) => {
              const isActive = Math.abs(size - betMultiple) < 0.005

              return (
                <button
                  className={isActive ? 'preset active' : 'preset'}
                  key={size}
                  onClick={() => setBetPercent(size * 100)}
                  type="button"
                >
                  <span>{formatBetLabel(size, displayMode)}</span>
                  <small>{formatPercent(calculateMetrics(size).breakEvenFe)} FE</small>
                </button>
              )
            })}
          </div>

          <div className="formula-strip">
            <div>
              <p className="strip-label">Главная формула</p>
              <p className="strip-value">FE = Bet / (Pot + Bet)</p>
            </div>
            <div>
              <p className="strip-label">В нормализованном виде</p>
              <p className="strip-value">FE = B / (1 + B)</p>
            </div>
          </div>
        </section>

        <section className="summary-grid">
          <article className="result-card primary">
            <p className="card-label">Нужно для 0 EV bluff</p>
            <h3>{formatPercent(metrics.breakEvenFe)}</h3>
            <p>
              Или в голове: <strong>{metrics.feFraction.numerator}</strong> из{' '}
              <strong>{metrics.feFraction.denominator}</strong> раз.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Pot odds для колла</p>
            <h3>
              {formatRatio(
                metrics.valueToBluff.numerator,
                metrics.valueToBluff.denominator,
              )}
            </h3>
            <p>
              Оппонент вкладывает 1 часть колла, чтобы бороться за{' '}
              {metrics.valueToBluff.numerator} части банка.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Равновесный Value : Bluff</p>
            <h3>
              {formatRatio(
                metrics.valueToBluff.numerator,
                metrics.valueToBluff.denominator,
              )}
            </h3>
            <p>
              Та же дробь, что и у pot odds. Для выбранного сайзинга value и
              bluff читаются одним отношением.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Bluff share в betting range</p>
            <h3>{formatPercent(metrics.bluffShare)}</h3>
            <p>
              Не равно FE: это примерно{' '}
              <strong>
                {metrics.balancedBluffShare.numerator} из{' '}
                {metrics.balancedBluffShare.denominator}
              </strong>{' '}
              bet-комбо.
            </p>
          </article>
        </section>
      </main>

      <section className="lesson-grid">
        <article className="surface lesson-card warning-card">
          <p className="kicker">Не путай цифры</p>
          <h2>{formatBetLabel(betMultiple, displayMode)} выглядит просто, но в нем живут две разные математики.</h2>
          <div className="warning-points">
            <p>
              <strong>{formatPercent(metrics.breakEvenFe)}</strong> FE нужно
              чистому блефу, чтобы не терять деньги прямо сейчас.
            </p>
            <p>
              <strong>{formatPercent(metrics.bluffShare)}</strong> блефов можно
              держать в сбалансированном betting range на ривере.
            </p>
            <p>
              <strong>
                {formatRatio(
                  metrics.valueToBluff.numerator,
                  metrics.valueToBluff.denominator,
                )}
              </strong>{' '}
              одновременно читается как call odds и как ratio
              <span> value : bluff</span>.
            </p>
          </div>
        </article>

        <article className="surface lesson-card">
          <p className="kicker">Мнемоника</p>
          <h2>Нормализуй банк до 1 и считай через риск к награде.</h2>
          <ul className="memory-list">
            <li>
              <strong>1/2 pot</strong>: риск 1, выигрыш 2, значит{' '}
              <strong>1 / 3 FE</strong>
            </li>
            <li>
              <strong>1 pot</strong>: риск 1, выигрыш 1, значит{' '}
              <strong>1 / 2 FE</strong>
            </li>
            <li>
              <strong>2x pot</strong>: риск 2, выигрыш 1, значит{' '}
              <strong>2 / 3 FE</strong>
            </li>
            <li>
              <strong>Запоминай одной дробью</strong>:
              <span> 3:1, 2:1, 3:2 одновременно и pot odds, и value:bluff.</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="surface cheat-table">
        <div className="section-head compact">
          <div>
            <p className="kicker">Шпаргалка</p>
            <h2>Популярные сайзинги</h2>
          </div>
          <p className="table-note">
            Для ривера и любых spot-ов, где нужно быстро оценить 0 EV bluff,
            value:bluff и защиту против ставки.
          </p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bet size</th>
                <th>0 EV FE</th>
                <th>Value : Bluff</th>
                <th>Bluff share</th>
                <th>MDF</th>
              </tr>
            </thead>
            <tbody>
              {presetSizes.map((size) => {
                const row = calculateMetrics(size)
                const isActive = Math.abs(size - betMultiple) < 0.005

                return (
                  <tr className={isActive ? 'active-row' : undefined} key={size}>
                    <td>{formatBetLabel(size, displayMode)}</td>
                    <td>{formatPercent(row.breakEvenFe)}</td>
                    <td>
                      {formatRatio(
                        row.valueToBluff.numerator,
                        row.valueToBluff.denominator,
                      )}
                    </td>
                    <td>{formatPercent(row.bluffShare)}</td>
                    <td>{formatPercent(row.mdf)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="footnote">
          Сейчас выбрано <strong>{formatBetLabel(betMultiple, displayMode)}</strong>:
          <strong>
            {metrics.valueToBluff.numerator} value /{' '}
            {metrics.valueToBluff.denominator} bluff
          </strong>{' '}
          в betting range, а оппонент защищает примерно{' '}
          <strong>{formatPercent(metrics.mdf)}</strong> диапазона.
        </p>
      </section>
    </div>
  )
}

export default App
