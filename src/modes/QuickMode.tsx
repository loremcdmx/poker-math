import { EditableNumberField } from '../components/EditableNumberField'
import { HeroActionChips } from '../components/HeroActionChips'
import {
  formatBetLabel,
  formatRatio,
  formatShare,
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
  { label: 'К мнемонике', href: '#quick-memory' },
  { label: 'К шпаргалке', href: '#quick-cheatsheet' },
]

export function QuickMode({
  betPercent,
  displayMode,
  onBetPercentChange,
}: QuickModeProps) {
  const betMultiple = betPercent / 100
  const metrics = calculateMetrics(betMultiple)

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
              inputMax={300}
              inputMin={1}
              label="Ставка, % банка"
              onValueChange={onBetPercentChange}
              sanitizeMax={300}
              sanitizeMin={1}
              step={0.1}
              value={betPercent}
            />
          </div>

          <div className="slider-block">
            <input
              aria-label="Bet size slider"
              className="bet-slider"
              max={300}
              min={1}
              onChange={(event) => onBetPercentChange(Number(event.target.value))}
              step={0.1}
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
              <strong>{metrics.feFraction.numerator}</strong> раз из{' '}
              <strong>{metrics.feFraction.denominator}</strong>. Обратная сторона той же
              дроби: <strong>MDF {formatShare(metrics.mdf, displayMode)}</strong>.
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
              <strong>{metrics.valueToBluff.numerator}</strong> части банка. Это то же
              зеркало, что и <strong>value:bluff</strong>, просто с точки зрения колла.
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
            <p>
              Если FE читается как <strong>a/b</strong>, то balanced{' '}
              <strong>value:bluff = b:a</strong>. Запоминай зеркало, а не две разные цифры.
            </p>
          </article>

          <article className="result-card">
            <p className="card-label">Блефов в ставке</p>
            <h3>{formatShare(metrics.bluffShare, displayMode)}</h3>
            <p>
              Это доля блефов в betting range, а не процент фолдов, который нужен. На
              ривере эта же цифра совпадает с <strong>equity без FE</strong>.
            </p>
          </article>
        </section>
      </main>

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
