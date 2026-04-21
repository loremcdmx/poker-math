import { useState } from 'react'
import './App.css'

type AppMode = 'quick' | 'igor'
type DisplayMode = 'percent' | 'fraction'
type Fraction = {
  numerator: number
  denominator: number
}
type IgorInventoryMode = 'value' | 'bluff'

const quickPresetSizes = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.25, 1.5, 2]
const igorLadderBets = [10, 20, 25, 33, 40, 50, 66, 70, 75, 100, 125, 150, 175, 200, 250]

const percentFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const decimalFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
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
  const safeDenominator = denominator || 1
  const divisor = greatestCommonDivisor(numerator, safeDenominator)

  return {
    numerator: numerator / divisor,
    denominator: safeDenominator / divisor,
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function sanitizeNumber(value: number, fallback: number, min = 0.01, max = 100000) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback
  }

  return clamp(value, min, max)
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value * 100)}%`
}

function formatPotUnits(value: number) {
  return `${decimalFormatter.format(value)}P`
}

function formatDecimal(value: number) {
  return decimalFormatter.format(value)
}

function formatInteger(value: number) {
  return integerFormatter.format(value)
}

function formatSheetPercent(value: number) {
  return percentFormatter.format(value * 100)
}

function formatSheetRoundedPercent(value: number) {
  return integerFormatter.format(value * 100)
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
  const safeBetMultiple = Math.max(0.0001, betMultiple)
  const betFraction = approximateFraction(safeBetMultiple)
  const breakEvenFe = safeBetMultiple / (1 + safeBetMultiple)
  const bluffShare = safeBetMultiple / (1 + 2 * safeBetMultiple)
  const mdf = 1 / (1 + safeBetMultiple)
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

function calculateIgorInventory(
  pot: number,
  bet: number,
  knownMode: IgorInventoryMode,
  knownCount: number,
) {
  const safePot = Math.max(0.01, pot)
  const safeBet = Math.max(0.01, bet)
  const safeCount = Math.max(0, knownCount)
  const bluffPerValue = safeBet / (safePot + safeBet)
  const valuePerBluff = (safePot + safeBet) / safeBet
  const oddsPercent = safeBet / (safePot + safeBet + safeBet)
  const bluffShareTotal = safeBet / (safePot + safeBet + safeBet)
  const valueCount = knownMode === 'value' ? safeCount : safeCount * valuePerBluff
  const bluffCount = knownMode === 'bluff' ? safeCount : safeCount * bluffPerValue

  return {
    safePot,
    safeBet,
    safeCount,
    bluffPerValue,
    valuePerBluff,
    oddsPercent,
    bluffShareTotal,
    valueCount,
    bluffCount,
    betPercentOfPot: safeBet / safePot,
  }
}

function calculateRaiseMetrics(potBefore: number, villainBet: number, heroRaiseTotal: number) {
  const safePotBefore = Math.max(0.01, potBefore)
  const safeVillainBet = Math.max(0.01, villainBet)
  const safeRaiseTotal = Math.max(safeVillainBet, heroRaiseTotal)
  const callAmount = Math.max(0, safeRaiseTotal - safeVillainBet)
  const feNeeded = safeRaiseTotal / (safePotBefore + safeVillainBet + safeRaiseTotal)
  const callerEqRequired = callAmount / (safePotBefore + safeRaiseTotal + safeRaiseTotal)

  return {
    safePotBefore,
    safeVillainBet,
    safeRaiseTotal,
    callAmount,
    feNeeded,
    callerEqRequired,
  }
}

function QuickMode({
  betPercent,
  displayMode,
  setBetPercent,
  setDisplayMode,
}: {
  betPercent: number
  displayMode: DisplayMode
  setBetPercent: (value: number) => void
  setDisplayMode: (value: DisplayMode) => void
}) {
  const betMultiple = betPercent / 100
  const metrics = calculateMetrics(betMultiple)

  return (
    <>
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
                onChange={(event) =>
                  setBetPercent(sanitizeNumber(Number(event.target.value), betPercent, 1, 300))
                }
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
            {quickPresetSizes.map((size) => {
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
            <p>Та же дробь, что и у pot odds. Value и bluff читаются одной меркой.</p>
          </article>

          <article className="result-card">
            <p className="card-label">Bluff share в betting range</p>
            <h3>{formatPercent(metrics.bluffShare)}</h3>
            <p>Доля блефов внутри betting range. Это не FE.</p>
          </article>
        </section>
      </main>

      <section className="lesson-grid">
        <article className="surface lesson-card warning-card">
          <p className="kicker">Не путай цифры</p>
          <h2>
            {formatBetLabel(betMultiple, displayMode)} выглядит просто, но в нем
            живут две разные математики.
          </h2>
          <div className="warning-points">
            <p>
              <strong>{formatPercent(metrics.breakEvenFe)}</strong> FE нужно
              чистому блефу, чтобы не терять деньги прямо сейчас.
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
              {quickPresetSizes.map((size) => {
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
    </>
  )
}

function IgorMode() {
  const [knownMode, setKnownMode] = useState<IgorInventoryMode>('value')
  const [igorPot, setIgorPot] = useState(24)
  const [igorBet, setIgorBet] = useState(19)
  const [knownCount, setKnownCount] = useState(88)
  const [raisePot, setRaisePot] = useState(8)
  const [raiseBet, setRaiseBet] = useState(5)
  const [raiseTotal, setRaiseTotal] = useState(23)

  const inventory = calculateIgorInventory(igorPot, igorBet, knownMode, knownCount)
  const raiseMetrics = calculateRaiseMetrics(raisePot, raiseBet, raiseTotal)

  return (
    <>
      <header className="hero-panel surface igor-hero">
        <div className="hero-copy">
          <p className="eyebrow">Режим Игоря</p>
          <h1>Вся sheet-логика в одной вкладке: таблица, конвертер и заметки.</h1>
          <p className="hero-text">
            Здесь я перенес дух таблички: ladder для банка <span>100</span>,
            режим “я знаю число <span>велью</span>” или “я знаю число{' '}
            <span>блефов</span>”, отдельный блок для <span>рейзов</span> и raw
            заметки из нижней части листа.
          </p>
          <div className="hero-tags">
            <span>Pot = 100 ladder</span>
            <span>Value / Bluff converter</span>
            <span>Raise FE / Call EQ</span>
          </div>
        </div>

        <div className="hero-focus igor-focus">
          <p className="focus-label">Текущий пример из листа</p>
          <p className="focus-size">{formatDecimal(inventory.safePot)} / {formatDecimal(inventory.safeBet)}</p>
          <p className="focus-subtitle">
            Pot <strong>{formatDecimal(inventory.safePot)}</strong>, bet{' '}
            <strong>{formatDecimal(inventory.safeBet)}</strong>, odds{' '}
            <strong>{formatPercent(inventory.oddsPercent)}</strong>.
          </p>
          <div className="focus-metrics">
            <div>
              <span>B/V max</span>
              <strong>{formatDecimal(inventory.bluffPerValue)}</strong>
            </div>
            <div>
              <span>Bluff share</span>
              <strong>{formatPercent(inventory.bluffShareTotal)}</strong>
            </div>
            <div>
              <span>Bet, % pot</span>
              <strong>{formatPercent(inventory.betPercentOfPot)}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="igor-layout">
        <section className="surface igor-converter">
          <div className="section-head">
            <div>
              <p className="kicker">Конвертер</p>
              <h2>Я знаю число велью или блефов</h2>
            </div>
            <div className="inline-fields">
              <label className="number-field compact-field">
                <span>Pot</span>
                <input
                  min={1}
                  onChange={(event) =>
                    setIgorPot(sanitizeNumber(Number(event.target.value), igorPot, 1, 100000))
                  }
                  step={1}
                  type="number"
                  value={igorPot}
                />
              </label>
              <label className="number-field compact-field">
                <span>Bet</span>
                <input
                  min={1}
                  onChange={(event) =>
                    setIgorBet(sanitizeNumber(Number(event.target.value), igorBet, 1, 100000))
                  }
                  step={1}
                  type="number"
                  value={igorBet}
                />
              </label>
            </div>
          </div>

          <div className="inventory-switch" role="group" aria-label="Known inventory mode">
            <button
              className={knownMode === 'value' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => setKnownMode('value')}
              type="button"
            >
              Я знаю, сколько велью
            </button>
            <button
              className={knownMode === 'bluff' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => setKnownMode('bluff')}
              type="button"
            >
              Я знаю, сколько блефов
            </button>
          </div>

          <div className="quick-chip-row">
            <button
              className="quick-chip"
              onClick={() => {
                setKnownMode('value')
                setKnownCount(88)
              }}
              type="button"
            >
              88 велью
            </button>
            <button
              className="quick-chip"
              onClick={() => {
                setKnownMode('value')
                setKnownCount(15)
              }}
              type="button"
            >
              15 велью
            </button>
            <button
              className="quick-chip"
              onClick={() => {
                setKnownMode('bluff')
                setKnownCount(40)
              }}
              type="button"
            >
              40 блефов
            </button>
          </div>

          <div className="igor-converter-grid">
            <label className="number-field">
              <span>{knownMode === 'value' ? 'Value count' : 'Bluff count'}</span>
              <input
                min={0}
                onChange={(event) =>
                  setKnownCount(sanitizeNumber(Number(event.target.value), knownCount, 0, 100000))
                }
                step={1}
                type="number"
                value={knownCount}
              />
            </label>

            <div className="igor-output-grid">
              <article className="sheet-card">
                <span>Odds</span>
                <strong>{formatPercent(inventory.oddsPercent)}</strong>
              </article>
              <article className="sheet-card">
                <span>B/V</span>
                <strong>{formatDecimal(inventory.bluffPerValue)}</strong>
              </article>
              <article className="sheet-card">
                <span>Bluff share</span>
                <strong>{formatPercent(inventory.bluffShareTotal)}</strong>
              </article>
              <article className="sheet-card">
                <span>{knownMode === 'value' ? 'Bluffs max' : 'Value needed'}</span>
                <strong>
                  {formatDecimal(
                    knownMode === 'value' ? inventory.bluffCount : inventory.valueCount,
                  )}
                </strong>
              </article>
            </div>
          </div>

          <p className="igor-summary">
            При pot <strong>{formatDecimal(inventory.safePot)}</strong> и bet{' '}
            <strong>{formatDecimal(inventory.safeBet)}</strong>:{' '}
            <strong>{formatDecimal(inventory.valueCount)} value</strong> дают{' '}
            <strong>{formatDecimal(inventory.bluffCount)} bluff</strong>. Это
            соответствует <strong>{formatPercent(inventory.bluffShareTotal)}</strong>{' '}
            блефов в общем betting range.
          </p>
        </section>

        <section className="surface cheat-table igor-table">
          <div className="section-head compact">
            <div>
              <p className="kicker">Лестница</p>
              <h2>Pot = 100, bet ladder из листа</h2>
            </div>
            <p className="table-note">
              Верхняя таблица перенесена в живом виде: bet, % блефов, FE, MDF,
              max bluff/value и минимум фолдов на один колл.
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bet</th>
                  <th>% ?</th>
                  <th>F?</th>
                  <th>MDF</th>
                  <th>B/V max</th>
                  <th>1 B - X Value</th>
                  <th>1 call - X folds</th>
                </tr>
              </thead>
              <tbody>
                {igorLadderBets.map((bet) => {
                  const metrics = calculateMetrics(bet / 100)

                  return (
                    <tr key={bet}>
                      <td>{formatInteger(bet)}</td>
                      <td>{formatSheetPercent(metrics.bluffShare)}</td>
                      <td>{formatSheetRoundedPercent(metrics.breakEvenFe)}</td>
                      <td>{formatSheetRoundedPercent(metrics.mdf)}</td>
                      <td>{formatDecimal(metrics.breakEvenFe)}</td>
                      <td>
                        {formatDecimal(
                          metrics.valueToBluff.numerator /
                            metrics.valueToBluff.denominator,
                        )}
                      </td>
                      <td>{formatDecimal(bet / 100)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="igor-layout lower">
        <section className="surface igor-raises">
          <div className="section-head">
            <div>
              <p className="kicker">Для рейзов</p>
              <h2>Fold equity и equity на колл против рейза</h2>
            </div>
          </div>

          <div className="inline-fields">
            <label className="number-field compact-field">
              <span>Pot before bets</span>
              <input
                min={0}
                onChange={(event) =>
                  setRaisePot(sanitizeNumber(Number(event.target.value), raisePot, 0.01, 100000))
                }
                step={1}
                type="number"
                value={raisePot}
              />
            </label>
            <label className="number-field compact-field">
              <span>V bets</span>
              <input
                min={0}
                onChange={(event) =>
                  setRaiseBet(sanitizeNumber(Number(event.target.value), raiseBet, 0.01, 100000))
                }
                step={1}
                type="number"
                value={raiseBet}
              />
            </label>
            <label className="number-field compact-field">
              <span>H raises total</span>
              <input
                min={0}
                onChange={(event) =>
                  setRaiseTotal(
                    sanitizeNumber(Number(event.target.value), raiseTotal, raiseBet, 100000),
                  )
                }
                step={1}
                type="number"
                value={raiseTotal}
              />
            </label>
          </div>

          <div className="igor-output-grid raise-grid">
            <article className="sheet-card dark">
              <span>% F ?</span>
              <strong>{formatPercent(raiseMetrics.feNeeded)}</strong>
            </article>
            <article className="sheet-card">
              <span>V EQ Required?</span>
              <strong>{formatPercent(raiseMetrics.callerEqRequired)}</strong>
            </article>
            <article className="sheet-card">
              <span>Call amount</span>
              <strong>{formatDecimal(raiseMetrics.callAmount)}</strong>
            </article>
            <article className="sheet-card">
              <span>1 raise wins</span>
              <strong>
                {formatDecimal(raiseMetrics.safePotBefore + raiseMetrics.safeVillainBet)}
              </strong>
            </article>
          </div>
        </section>

        <section className="surface igor-notes">
          <div className="section-head compact">
            <div>
              <p className="kicker">Черновики</p>
              <h2>Остальные блоки из листа</h2>
            </div>
            <p className="table-note">
              Эти значения перенесены как reference-notes. Где формула не была
              на 100% прозрачна по скрину, я оставил исходные числа, не
              притворяясь, что полностью восстановил логику.
            </p>
          </div>

          <div className="igor-raw-grid">
            <article className="raw-note">
              <h3>EQ / EV пример</h3>
              <p>Pot 100, bet 20, %? 14,3</p>
              <p>F needed 16,7, F received 16,7</p>
              <p>EV 5,83, EQ 5, F needed w EQ 10,67</p>
            </article>

            <article className="raw-note">
              <h3>Для мультиставок</h3>
              <p>Pot 100, bet 50, equity 25</p>
              <p>NewPot 200, NewBet 75%, bet 150</p>
              <p>EV Call -25</p>
            </article>

            <article className="raw-note">
              <h3>Проверить еще раз</h3>
              <p>VBets 610</p>
              <p>HRaises 3000</p>
              <p>% ? 28,5</p>
            </article>

            <article className="raw-note">
              <h3>Сырой хвост листа</h3>
              <p>1 / 2 -&gt; 0,28 / 0,72</p>
              <p>F: 75 / 54 / 46</p>
              <p>C: 25</p>
              <p>150 / 75</p>
            </article>
          </div>
        </section>
      </section>
    </>
  )
}

function App() {
  const [appMode, setAppMode] = useState<AppMode>('quick')
  const [betPercent, setBetPercent] = useState(50)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent')

  return (
    <div className="app-shell">
      <div className="mode-switch surface" role="tablist" aria-label="App mode">
        <button
          className={appMode === 'quick' ? 'mode-switch-item active' : 'mode-switch-item'}
          onClick={() => setAppMode('quick')}
          type="button"
        >
          Быстрый калькулятор
        </button>
        <button
          className={appMode === 'igor' ? 'mode-switch-item active' : 'mode-switch-item'}
          onClick={() => setAppMode('igor')}
          type="button"
        >
          Режим Игоря
        </button>
      </div>

      {appMode === 'quick' ? (
        <QuickMode
          betPercent={betPercent}
          displayMode={displayMode}
          setBetPercent={setBetPercent}
          setDisplayMode={setDisplayMode}
        />
      ) : (
        <IgorMode />
      )}
    </div>
  )
}

export default App
