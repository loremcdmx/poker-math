import { useState } from 'react'
import './App.css'

type AppMode = 'quick' | 'igor'
type DisplayMode = 'percent' | 'fraction'
type PotInputMode = 'clean' | 'client'
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
  return `${decimalFormatter.format(value)} банка`
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
    return `${percentFormatter.format(value * 100)}% банка`
  }

  const fraction = approximateFraction(value)

  if (fraction.denominator === 1) {
    if (fraction.numerator === 1) {
      return '1 банк'
    }

    return `${fraction.numerator} банка`
  }

  return `${fraction.numerator}/${fraction.denominator} банка`
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
  potInput: number,
  bet: number,
  potInputMode: PotInputMode,
  knownMode: IgorInventoryMode,
  knownCount: number,
) {
  const safeBet = Math.max(0.01, bet)
  const safePotInput = Math.max(potInputMode === 'client' ? safeBet + 0.01 : 0.01, potInput)
  const safePot = potInputMode === 'client' ? safePotInput - safeBet : safePotInput
  const safeCount = Math.max(0, knownCount)
  const bluffPerValue = safeBet / (safePot + safeBet)
  const valuePerBluff = (safePot + safeBet) / safeBet
  const oddsPercent = safeBet / (safePot + safeBet + safeBet)
  const bluffShareTotal = safeBet / (safePot + safeBet + safeBet)
  const valueCount = knownMode === 'value' ? safeCount : safeCount * valuePerBluff
  const bluffCount = knownMode === 'bluff' ? safeCount : safeCount * bluffPerValue

  return {
    safePotInput,
    safePot,
    safeBet,
    safeCount,
    clientPot: safePot + safeBet,
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
  const immediateWin = safePotBefore + safeVillainBet
  const finalPotIfCall = safePotBefore + safeRaiseTotal + safeRaiseTotal
  const feNeeded = safeRaiseTotal / (safePotBefore + safeVillainBet + safeRaiseTotal)
  const callerEqRequired = callAmount / finalPotIfCall

  return {
    safePotBefore,
    safeVillainBet,
    safeRaiseTotal,
    callAmount,
    feNeeded,
    callerEqRequired,
    immediateWin,
    finalPotIfCall,
  }
}

function calculateBluffWithEquity(pot: number, bet: number, equityPercent: number) {
  const safePot = Math.max(0.01, pot)
  const safeBet = Math.max(0.01, bet)
  const safeEquity = clamp(equityPercent / 100, 0, 1)
  const calledEv = safeEquity * (safePot + safeBet + safeBet) - safeBet
  const pureFe = safeBet / (safePot + safeBet)
  const feWithEquityRaw = calledEv >= 0 ? 0 : -calledEv / (safePot - calledEv)
  const feWithEquity = clamp(feWithEquityRaw, 0, 1)
  const savedFe = Math.max(0, pureFe - feWithEquity)
  const noFoldEquity = safeBet / (safePot + safeBet + safeBet)

  return {
    safeEquity,
    calledEv,
    pureFe,
    feWithEquity,
    savedFe,
    noFoldEquity,
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
          <p className="eyebrow">Быстрый калькулятор</p>
          <h1>Сколько фолдов нужно ставке и какой колл ты оставляешь оппоненту.</h1>
          <p className="hero-text">
            Введи сайзинг и сразу увидишь три разные цифры, которые часто
            смешивают: <span>сколько фолдов нужно</span> чистому блефу, какой
            <span> колл по шансам</span> ты даешь и сколько <span>value на 1 bluff</span>{' '}
            можно держать на ривере.
          </p>
          <div className="hero-tags">
            <span>Риск / (риск + награда)</span>
            <span>Одна дробь для колла и value:bluff</span>
            <span>Фолды нужны не равны доле блефов</span>
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
            забрать <strong>1 банк</strong>.
          </p>
          <div className="focus-equation">
            <span>Мнемоника</span>
            <strong>
              риск {metrics.betFraction.numerator}, награда{' '}
              {metrics.betFraction.denominator}
            </strong>
          </div>
          <div className="focus-metrics">
            <div>
              <span>Фолдов нужно</span>
              <strong>{formatPercent(metrics.breakEvenFe)}</strong>
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
              <h2>Размер ставки</h2>
            </div>
            <label className="number-field">
              <span>Ставка, % банка</span>
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
                  <small>{formatPercent(calculateMetrics(size).breakEvenFe)} фолдов нужно</small>
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

        <section className="summary-grid">
          <article className="result-card primary">
            <p className="card-label">Фолдов нужно для нуля</p>
            <h3>{formatPercent(metrics.breakEvenFe)}</h3>
            <p>
              Мнемоника: ставка должна проходить{' '}
              <strong>{metrics.feFraction.numerator}</strong> раз из{' '}
              <strong>{metrics.feFraction.denominator}</strong>.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Шансы банка на колл</p>
            <h3>
              {formatRatio(
                metrics.valueToBluff.numerator,
                metrics.valueToBluff.denominator,
              )}
            </h3>
            <p>
              Оппонент платит <strong>1</strong>, чтобы бороться за{' '}
              <strong>{metrics.valueToBluff.numerator}</strong> части банка.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Сколько value на 1 bluff</p>
            <h3>
              {formatRatio(
                metrics.valueToBluff.numerator,
                metrics.valueToBluff.denominator,
              )}
            </h3>
            <p>Та же дробь, что и у шансов банка. Запоминай один ratio вместо двух.</p>
          </article>

          <article className="result-card">
            <p className="card-label">Блефов в ставке</p>
            <h3>{formatPercent(metrics.bluffShare)}</h3>
            <p>Это доля блефов внутри твоей ставки на ривере. Это не фолды, которые нужны.</p>
          </article>
        </section>
      </main>

      <section className="lesson-grid">
        <article className="surface lesson-card warning-card">
          <p className="kicker">Не смешивай цифры</p>
          <h2>
            Один и тот же сайзинг одновременно говорит про фолды, колл и баланс.
          </h2>
          <div className="warning-points">
            <p>
              <strong>{formatPercent(metrics.breakEvenFe)}</strong> нужно, чтобы
              чистый блеф не терял деньги.
            </p>
            <p>
              <strong>
                {formatRatio(
                  metrics.valueToBluff.numerator,
                  metrics.valueToBluff.denominator,
                )}
              </strong>{' '}
              читается и как шансы банка на колл, и как
              <span> value : bluff</span>.
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
              <strong>1 банк</strong>: риск 1, выигрыш 1, значит нужно{' '}
              <strong>1 / 2 фолдов</strong>.
            </li>
            <li>
              <strong>2 банка</strong>: риск 2, выигрыш 1, значит нужно{' '}
              <strong>2 / 3 фолдов</strong>.
            </li>
            <li>
              <strong>Запоминай одной дробью</strong>:
              <span> 3:1, 2:1, 3:2 одновременно и для колла, и для value:bluff.</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="surface cheat-table">
        <div className="section-head compact">
          <div>
            <p className="kicker">Шпаргалка</p>
            <h2>Популярные сайзинги без калькулятора</h2>
          </div>
          <p className="table-note">
            Быстрая память для ривера: сколько фолдов нужно, какой колл ты даешь
            и сколько блефов можно держать.
          </p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ставка</th>
                <th>Фолдов нужно</th>
                <th>Value : Bluff</th>
                <th>Блефов в ставке</th>
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
            {' '}
            {metrics.valueToBluff.numerator} value / {metrics.valueToBluff.denominator} bluff
          </strong>{' '}
          на ривере, а защищать против такого сайзинга нужно примерно{' '}
          <strong>{formatPercent(metrics.mdf)}</strong> диапазона.
        </p>
      </section>
    </>
  )
}

function IgorMode() {
  const [potInputMode, setPotInputMode] = useState<PotInputMode>('clean')
  const [knownMode, setKnownMode] = useState<IgorInventoryMode>('value')
  const [igorPot, setIgorPot] = useState(24)
  const [igorBet, setIgorBet] = useState(19)
  const [knownCount, setKnownCount] = useState(88)
  const [bluffPot, setBluffPot] = useState(100)
  const [bluffBet, setBluffBet] = useState(50)
  const [bluffEquity, setBluffEquity] = useState(25)
  const [bluffEquityInput, setBluffEquityInput] = useState('25')
  const [raisePot, setRaisePot] = useState(8)
  const [raiseBet, setRaiseBet] = useState(5)
  const [raiseTotal, setRaiseTotal] = useState(23)

  const inventory = calculateIgorInventory(
    igorPot,
    igorBet,
    potInputMode,
    knownMode,
    knownCount,
  )
  const raiseMetrics = calculateRaiseMetrics(raisePot, raiseBet, raiseTotal)
  const bluffWithEquity = calculateBluffWithEquity(
    bluffPot,
    bluffBet,
    bluffEquity,
  )

  function switchPotInputMode(nextMode: PotInputMode) {
    if (nextMode === potInputMode) {
      return
    }

    setIgorPot((currentPot) =>
      nextMode === 'client' ? currentPot + igorBet : Math.max(1, currentPot - igorBet),
    )
    setPotInputMode(nextMode)
  }

  function handleIgorBetChange(nextValue: number) {
    const nextBet = sanitizeNumber(nextValue, igorBet, 1, 100000)

    if (potInputMode === 'client') {
      setIgorPot((currentPot) => {
        const cleanPot = Math.max(1, currentPot - igorBet)
        return cleanPot + nextBet
      })
    }

    setIgorBet(nextBet)
  }

  function handleBluffEquityChange(nextRawValue: string) {
    setBluffEquityInput(nextRawValue)

    if (nextRawValue === '') {
      return
    }

    setBluffEquity(sanitizeNumber(Number(nextRawValue), bluffEquity, 0, 100))
  }

  function normalizeBluffEquityInput() {
    if (bluffEquityInput.trim() === '') {
      setBluffEquity(0)
      setBluffEquityInput('0')
      return
    }

    const normalizedValue = sanitizeNumber(Number(bluffEquityInput), bluffEquity, 0, 100)
    setBluffEquity(normalizedValue)
    setBluffEquityInput(String(normalizedValue))
  }

  return (
    <>
      <header className="hero-panel surface igor-hero">
        <div className="hero-copy">
          <p className="eyebrow">Таблица Игоря</p>
          <h1>Лестница сайзингов, конвертер value/bluff и споты против коллбота.</h1>
          <p className="hero-text">
            Здесь все сведено в живой формат: ladder для банка <span>100</span>,
            перевод из <span>value в bluff</span>, режим <span>как в клиенте</span>,
            блок рейзов против <span>коллбота</span> и расчет блефа, у которого
            есть <span>equity</span>.
          </p>
          <div className="hero-tags">
            <span>Банк 100</span>
            <span>Value ↔ Bluff</span>
            <span>Пот как в клиенте</span>
            <span>Коллбот и блеф с эквити</span>
          </div>
        </div>

        <div className="hero-focus igor-focus">
          <p className="focus-label">
            {potInputMode === 'client' ? 'Спот в формате клиента' : 'Текущий спот'}
          </p>
          <p className="focus-size">
            {formatDecimal(
              potInputMode === 'client' ? inventory.safePotInput : inventory.safePot,
            )}{' '}
            / {formatDecimal(inventory.safeBet)}
          </p>
          <p className="focus-subtitle">
            {potInputMode === 'client' ? (
              <>
                Клиент показывает банк <strong>{formatDecimal(inventory.safePotInput)}</strong>.
                Для математики это <strong>{formatDecimal(inventory.safePot)}</strong> до
                ставки и ставка <strong>{formatDecimal(inventory.safeBet)}</strong>.
              </>
            ) : (
              <>
                Банк <strong>{formatDecimal(inventory.safePot)}</strong>, ставка{' '}
                <strong>{formatDecimal(inventory.safeBet)}</strong>, колл по шансам{' '}
                <strong>{formatPercent(inventory.oddsPercent)}</strong>.
              </>
            )}
          </p>
          <div className="focus-metrics">
            <div>
              <span>Блефов на 1 value</span>
              <strong>{formatDecimal(inventory.bluffPerValue)}</strong>
            </div>
            <div>
              <span>Блефов в ставке</span>
              <strong>{formatPercent(inventory.bluffShareTotal)}</strong>
            </div>
            <div>
              <span>Сайзинг</span>
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
              <h2>Знаю value или bluff — хочу вторую сторону диапазона</h2>
            </div>
          </div>

          <div className="pot-mode-switch" role="group" aria-label="Pot input mode">
            <button
              className={potInputMode === 'clean' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => switchPotInputMode('clean')}
              type="button"
            >
              Чистый банк
            </button>
            <button
              className={potInputMode === 'client' ? 'mode-chip active' : 'mode-chip'}
              onClick={() => switchPotInputMode('client')}
              type="button"
            >
              Режим клиента
            </button>
          </div>

          <div className="section-head compact section-head-stack">
            <div className="inline-fields">
              <label className="number-field compact-field">
                <span>{potInputMode === 'client' ? 'Банк в клиенте' : 'Банк до ставки'}</span>
                <input
                  min={0}
                  onChange={(event) =>
                    setIgorPot(
                      sanitizeNumber(
                        Number(event.target.value),
                        igorPot,
                        0.01,
                        100000,
                      ),
                    )
                  }
                  step={1}
                  type="number"
                  value={igorPot}
                />
              </label>
              <label className="number-field compact-field">
                <span>Ставка</span>
                <input
                  min={1}
                  onChange={(event) => handleIgorBetChange(Number(event.target.value))}
                  step={1}
                  type="number"
                  value={igorBet}
                />
              </label>
            </div>
          </div>

          <p className="input-hint">
            {potInputMode === 'client' ? (
              <>
                Если в руме ты видишь банк <strong>{formatDecimal(inventory.safePotInput)}</strong>{' '}
                и ставку <strong>{formatDecimal(inventory.safeBet)}</strong>, калькулятор
                переводит это в <strong>{formatDecimal(inventory.safePot)}</strong> до
                ставки + <strong>{formatDecimal(inventory.safeBet)}</strong> ставки.
              </>
            ) : (
              <>
                Классический ввод: сначала чистый банк до ставки, потом размер ставки.
                Тот же самый спот можно ввести как{' '}
                <strong>{formatDecimal(inventory.clientPot)}</strong> в режиме клиента.
              </>
            )}
          </p>

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
              <span>{knownMode === 'value' ? 'Сколько value' : 'Сколько bluff'}</span>
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
                <span>Колл по шансам</span>
                <strong>{formatPercent(inventory.oddsPercent)}</strong>
              </article>
              <article className="sheet-card">
                <span>Блефов на 1 value</span>
                <strong>{formatDecimal(inventory.bluffPerValue)}</strong>
              </article>
              <article className="sheet-card">
                <span>Блефов в ставке</span>
                <strong>{formatPercent(inventory.bluffShareTotal)}</strong>
              </article>
              <article className="sheet-card">
                <span>{knownMode === 'value' ? 'Можно добавить bluff' : 'Нужно value'}</span>
                <strong>
                  {formatDecimal(
                    knownMode === 'value' ? inventory.bluffCount : inventory.valueCount,
                  )}
                </strong>
              </article>
            </div>
          </div>

          <p className="igor-summary">
            Мнемоника: сначала считай <strong>ставка / (банк + ставка)</strong>. При
            банке <strong>{formatDecimal(inventory.safePot)}</strong> и ставке{' '}
            <strong>{formatDecimal(inventory.safeBet)}</strong>
            {potInputMode === 'client' ? (
              <>
                {' '}
                (в клиенте это выглядело бы как{' '}
                <strong>{formatDecimal(inventory.safePotInput)}</strong>)
              </>
            ) : null}
            :{' '}
            <strong>{formatDecimal(inventory.valueCount)} value</strong> дают{' '}
            <strong>{formatDecimal(inventory.bluffCount)} bluff</strong>. Вся
            ставка при этом содержит <strong>{formatPercent(inventory.bluffShareTotal)}</strong>{' '}
            блефов.
          </p>
        </section>

        <section className="surface cheat-table igor-table">
          <div className="section-head compact">
            <div>
              <p className="kicker">Лестница</p>
              <h2>Банк 100: готовая лестница сайзингов</h2>
            </div>
            <p className="table-note">
              Та же верхняя табличка, только в понятных колонках: сколько фолдов
              нужно, сколько bluff на 1 value и сколько защиты требуется.
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ставка</th>
                  <th>Блефов, %</th>
                  <th>Фолдов нужно</th>
                  <th>MDF</th>
                  <th>Bluff / Value</th>
                  <th>Value на 1 bluff</th>
                  <th>1 колл = фолдов</th>
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
              <p className="kicker">Против коллбота</p>
              <h2>Сколько фолдов нужен рейзу и насколько сладкий колл ты оставляешь</h2>
            </div>
          </div>

          <div className="inline-fields">
            <label className="number-field compact-field">
              <span>Банк до ставки</span>
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
              <span>Ставка оппа</span>
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
              <span>Наш рейз total</span>
              <input
                min={0}
                onChange={(event) =>
                  setRaiseTotal(sanitizeNumber(Number(event.target.value), raiseTotal, 0.01, 100000))
                }
                step={1}
                type="number"
                value={raiseTotal}
              />
            </label>
          </div>

          <p className="input-hint">
            Мнемоника для коллбота: он смотрит на <strong>доплату</strong> и на{' '}
            <strong>финальный банк</strong>. Если доплата маленькая относительно банка,
            колл получается слишком вкусным.
          </p>

          <div className="igor-output-grid raise-grid">
            <article className="sheet-card dark">
              <span>Фолдов нужно</span>
              <strong>{formatPercent(raiseMetrics.feNeeded)}</strong>
            </article>
            <article className="sheet-card">
              <span>Доплата на колл</span>
              <strong>{formatDecimal(raiseMetrics.callAmount)}</strong>
            </article>
            <article className="sheet-card">
              <span>Банк после колла</span>
              <strong>{formatDecimal(raiseMetrics.finalPotIfCall)}</strong>
            </article>
            <article className="sheet-card">
              <span>Забираем сразу</span>
              <strong>{formatDecimal(raiseMetrics.immediateWin)}</strong>
            </article>
          </div>

          <p className="igor-summary">
            Здесь коллботу надо доплатить <strong>{formatDecimal(raiseMetrics.callAmount)}</strong>{' '}
            за банк <strong>{formatDecimal(raiseMetrics.finalPotIfCall)}</strong>, то есть ему
            хватает примерно <strong>{formatPercent(raiseMetrics.callerEqRequired)}</strong>{' '}
            equity на колл. Если это мало, рейз часто просто получает слишком широкий колл.
          </p>
        </section>

        <section className="surface igor-notes">
          <div className="section-head compact">
            <div>
              <p className="kicker">Блеф с эквити</p>
              <h2>Если у блефа есть ауты, фолдов нужно меньше</h2>
            </div>
            <p className="table-note">
              Не все блефы «мертвые». Если при колле у тебя остается equity, часть
              работы за FE уже делает доезд.
            </p>
          </div>

          <div className="section-head compact section-head-stack">
            <div className="inline-fields">
              <label className="number-field compact-field">
                <span>Банк</span>
                <input
                  min={0}
                  onChange={(event) =>
                    setBluffPot(sanitizeNumber(Number(event.target.value), bluffPot, 0.01, 100000))
                  }
                  step={1}
                  type="number"
                  value={bluffPot}
                />
              </label>
              <label className="number-field compact-field">
                <span>Ставка</span>
                <input
                  min={0}
                  onChange={(event) =>
                    setBluffBet(sanitizeNumber(Number(event.target.value), bluffBet, 0.01, 100000))
                  }
                  step={1}
                  type="number"
                  value={bluffBet}
                />
              </label>
              <label className="number-field compact-field">
                <span>Эквити при колле, %</span>
                <input
                  min={0}
                  max={100}
                  onBlur={normalizeBluffEquityInput}
                  onChange={(event) => handleBluffEquityChange(event.target.value)}
                  step={1}
                  type="number"
                  value={bluffEquityInput}
                />
              </label>
            </div>
          </div>

          <div className="igor-output-grid raise-grid">
            <article className="sheet-card dark">
              <span>Фолдов нужно с этой equity</span>
              <strong>{formatPercent(bluffWithEquity.feWithEquity)}</strong>
            </article>
            <article className="sheet-card">
              <span>Чистый блеф просил бы</span>
              <strong>{formatPercent(bluffWithEquity.pureFe)}</strong>
            </article>
            <article className="sheet-card">
              <span>Эквити без FE</span>
              <strong>{formatPercent(bluffWithEquity.noFoldEquity)}</strong>
            </article>
            <article className="sheet-card">
              <span>FE экономия</span>
              <strong>{formatPercent(bluffWithEquity.savedFe)}</strong>
            </article>
          </div>

          <p className="igor-summary">
            Проверка математики: при банке <strong>{formatDecimal(bluffPot)}</strong> и
            ставке <strong>{formatDecimal(bluffBet)}</strong> чистый блеф просит{' '}
            <strong>{formatPercent(bluffWithEquity.pureFe)}</strong> фолдов.
            Если при колле у тебя есть <strong>{formatPercent(bluffWithEquity.safeEquity)}</strong>{' '}
            equity, то
            блефу нужно уже не <strong>{formatPercent(bluffWithEquity.pureFe)}</strong>, а{' '}
            <strong>{formatPercent(bluffWithEquity.feWithEquity)}</strong> фолдов.
            Как только equity дотягивает до{' '}
            <strong>{formatPercent(bluffWithEquity.noFoldEquity)}</strong>, фолды вообще
            перестают быть обязательными, потому что колл сам по себе уже не делает ставку
            убыточной.
          </p>

          <p className="input-hint">
            Это <strong>не</strong> порог для value-бета. Здесь сравнение идет с
            <strong> give-up / нулевой реализацией</strong>: ставим блеф и смотрим, сколько
            фолдов нужно, чтобы сама ставка не была минусовой. У value-бета другая база
            сравнения: <strong>bet vs check</strong>. Поэтому на ривере value-бету действительно
            нужно <strong>50%+ против calling range</strong> вне зависимости от сайза, а этому
            виджету для semibluff хватает pot-odds-порога.
          </p>
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
