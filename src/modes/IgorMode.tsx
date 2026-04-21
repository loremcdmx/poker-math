import { useState } from 'react'
import { EditableNumberField } from '../components/EditableNumberField'
import { HeroActionChips } from '../components/HeroActionChips'
import {
  formatBetLabel,
  formatDecimal,
  formatInteger,
  formatShare,
  formatSheetPercent,
  formatSheetRoundedPercent,
} from '../lib/formatters'
import {
  calculateBluffWithEquity,
  calculateIgorInventory,
  calculateMetrics,
  calculateRaiseMetrics,
  igorLadderBets,
  type DisplayMode,
  type IgorInventoryMode,
  type PotInputMode,
  sanitizeNumber,
} from '../lib/pokerMath'

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

type IgorModeProps = {
  displayMode: DisplayMode
}

export function IgorMode({ displayMode }: IgorModeProps) {
  const [potInputMode, setPotInputMode] = useState<PotInputMode>('clean')
  const [knownMode, setKnownMode] = useState<IgorInventoryMode>('value')
  const [igorPot, setIgorPot] = useState(24)
  const [igorBet, setIgorBet] = useState(19)
  const [knownCount, setKnownCount] = useState(88)
  const [bluffPot, setBluffPot] = useState(100)
  const [bluffBet, setBluffBet] = useState(50)
  const [bluffEquity, setBluffEquity] = useState(25)
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
  const bluffWithEquity = calculateBluffWithEquity(bluffPot, bluffBet, bluffEquity)

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

  const heroActions = [
    {
      label: 'Value ↔ Bluff',
      onClick: () => scrollToSection('igor-converter'),
    },
    {
      label: 'Пот как в клиенте',
      onClick: () => {
        switchPotInputMode('client')
        scrollToSection('igor-converter')
      },
    },
    {
      label: 'Коллбот и блеф с эквити',
      onClick: () => scrollToSection('igor-tools'),
    },
    {
      label: 'Банк 100',
      onClick: () => scrollToSection('igor-ladder'),
    },
  ]

  return (
    <>
      <header className="hero-panel surface igor-hero">
        <div className="hero-copy">
          <p className="eyebrow">Режим Игоря</p>
          <h1>Value ↔ bluff, клиентский пот и споты против коллбота.</h1>
          <p className="hero-text">
            Сверху текущий спот, ниже три рабочих блока: <span>конвертер диапазона</span>,
            рейз против <span>коллбота</span> и <span>semibluff с equity</span>. Таблица
            `банк 100` остается снизу как справочник, а не мешается в первом экране.
          </p>
          <HeroActionChips ariaLabel="Быстрые действия режима Игоря" items={heroActions} />
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
                Для математики это <strong>{formatDecimal(inventory.safePot)}</strong> до ставки
                и ставка <strong>{formatDecimal(inventory.safeBet)}</strong>.
              </>
            ) : (
              <>
                Банк <strong>{formatDecimal(inventory.safePot)}</strong>, ставка{' '}
                <strong>{formatDecimal(inventory.safeBet)}</strong>, колл по шансам{' '}
                <strong>{formatShare(inventory.oddsPercent, displayMode)}</strong>.
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
              <strong>{formatShare(inventory.bluffShareTotal, displayMode)}</strong>
            </div>
            <div>
              <span>Сайзинг</span>
              <strong>{formatBetLabel(inventory.betPercentOfPot, displayMode)}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="surface igor-converter jump-target" id="igor-converter">
        <div className="section-head">
          <div>
            <p className="kicker">Главный блок</p>
            <h2>Знаю value или bluff — хочу вторую сторону диапазона</h2>
          </div>
          <p className="table-note">
            Это основной рабочий калькулятор. Вводишь пот и ставку, а дальше сразу видишь
            колл по шансам, bluff share и перевод из одной стороны диапазона в другую. Здесь
            удобно помнить, что <strong>одна и та же цифра B/(P+2B)</strong> живет и как
            bluff share, и как equity на колл.
          </p>
        </div>

        <div className="pot-mode-switch" role="group" aria-label="Pot input mode">
          <button
            aria-pressed={potInputMode === 'clean'}
            className={potInputMode === 'clean' ? 'mode-chip active' : 'mode-chip'}
            onClick={() => switchPotInputMode('clean')}
            type="button"
          >
            Чистый банк
          </button>
          <button
            aria-pressed={potInputMode === 'client'}
            className={potInputMode === 'client' ? 'mode-chip active' : 'mode-chip'}
            onClick={() => switchPotInputMode('client')}
            type="button"
          >
            Режим клиента
          </button>
        </div>

        <div className="section-head compact section-head-stack">
          <div className="inline-fields">
            <EditableNumberField
              className="number-field compact-field"
              inputMin={0}
              label={potInputMode === 'client' ? 'Банк в клиенте' : 'Банк до ставки'}
              onValueChange={setIgorPot}
              sanitizeMin={0.01}
              value={igorPot}
            />
            <EditableNumberField
              className="number-field compact-field"
              inputMin={1}
              label="Ставка"
              onValueChange={handleIgorBetChange}
              sanitizeMin={1}
              value={igorBet}
            />
          </div>
        </div>

        <p className="input-hint">
          {potInputMode === 'client' ? (
            <>
              Если в руме ты видишь банк <strong>{formatDecimal(inventory.safePotInput)}</strong>{' '}
              и ставку <strong>{formatDecimal(inventory.safeBet)}</strong>, калькулятор переводит
              это в <strong>{formatDecimal(inventory.safePot)}</strong> до ставки +{' '}
              <strong>{formatDecimal(inventory.safeBet)}</strong> ставки.
            </>
          ) : (
            <>
              Классический ввод: сначала чистый банк до ставки, потом размер ставки. Тот же
              спот можно ввести как <strong>{formatDecimal(inventory.clientPot)}</strong> в
              режиме клиента.
            </>
          )}
        </p>

        <div className="inventory-switch" role="group" aria-label="Known inventory mode">
          <button
            aria-pressed={knownMode === 'value'}
            className={knownMode === 'value' ? 'mode-chip active' : 'mode-chip'}
            onClick={() => setKnownMode('value')}
            type="button"
          >
            Я знаю, сколько велью
          </button>
          <button
            aria-pressed={knownMode === 'bluff'}
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
          <EditableNumberField
            inputMin={0}
            label={knownMode === 'value' ? 'Сколько value' : 'Сколько bluff'}
            onValueChange={setKnownCount}
            sanitizeMin={0}
            value={knownCount}
          />

          <div className="igor-output-grid">
            <article className="sheet-card">
              <span>Колл по шансам</span>
              <strong>{formatShare(inventory.oddsPercent, displayMode)}</strong>
            </article>
            <article className="sheet-card">
              <span>Блефов на 1 value</span>
              <strong>{formatDecimal(inventory.bluffPerValue)}</strong>
            </article>
            <article className="sheet-card">
              <span>Блефов в ставке</span>
              <strong>{formatShare(inventory.bluffShareTotal, displayMode)}</strong>
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
          Мнемоника: сначала считай <strong>ставка / (банк + ставка)</strong>. При банке{' '}
          <strong>{formatDecimal(inventory.safePot)}</strong> и ставке{' '}
          <strong>{formatDecimal(inventory.safeBet)}</strong>
          {potInputMode === 'client' ? (
            <>
              {' '}
              (в клиенте это выглядело бы как <strong>{formatDecimal(inventory.safePotInput)}</strong>)
            </>
          ) : null}
          : <strong>{formatDecimal(inventory.valueCount)} value</strong> дают{' '}
          <strong>{formatDecimal(inventory.bluffCount)} bluff</strong>. Вся ставка при этом
          содержит <strong>{formatShare(inventory.bluffShareTotal, displayMode)}</strong> блефов. И эта
          же цифра одновременно равна <strong>equity на колл</strong> против ставки.
        </p>
      </section>

      <section className="igor-stack jump-target" id="igor-tools">
        <div className="section-head compact tool-suite-head">
          <div>
            <p className="kicker">Рабочие споты</p>
            <h2>Коллбот и semibluff рядом, чтобы проще сравнивать решения</h2>
          </div>
          <p className="table-note">
            Здесь уже не теория, а прикладные ситуации: сколько фолдов нужен рейзу и сколько
            fold equity экономит блеф, у которого есть ауты.
          </p>
        </div>

        <div className="igor-tool-grid">
          <section className="surface igor-raises">
            <div className="section-head compact">
              <div>
                <p className="kicker">Против коллбота</p>
                <h2>Сколько фолдов нужен рейзу и насколько сладкий колл ты оставляешь</h2>
              </div>
            </div>

            <div className="inline-fields">
              <EditableNumberField
                className="number-field compact-field"
                inputMin={0}
                label="Банк до ставки"
                onValueChange={setRaisePot}
                sanitizeMin={0.01}
                value={raisePot}
              />
              <EditableNumberField
                className="number-field compact-field"
                inputMin={0}
                label="Ставка оппа"
                onValueChange={setRaiseBet}
                sanitizeMin={0.01}
                value={raiseBet}
              />
              <EditableNumberField
                className="number-field compact-field"
                inputMin={0}
                label="Наш рейз total"
                onValueChange={setRaiseTotal}
                sanitizeMin={0.01}
                value={raiseTotal}
              />
            </div>

            <p className="input-hint">
              Мнемоника для коллбота: он смотрит на <strong>доплату</strong> и на{' '}
              <strong>финальный банк</strong>. Если доплата маленькая относительно банка, колл
              получается слишком вкусным. Короткая лестница памяти: <strong>1 в 1 = 50%</strong>,{' '}
              <strong>1 в 2 = 33%</strong>, <strong>1 в 3 = 25%</strong>,{' '}
              <strong>1 в 4 = 20%</strong>.
            </p>

            <div className="igor-output-grid raise-grid">
              <article className="sheet-card dark">
                <span>Фолдов нужно</span>
                <strong>{formatShare(raiseMetrics.feNeeded, displayMode)}</strong>
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
              хватает примерно <strong>{formatShare(raiseMetrics.callerEqRequired, displayMode)}</strong>{' '}
              equity на колл. Это всегда читается как <strong>доплата / финальный банк</strong>,
              а не как твой total. Если это мало, рейз часто просто получает слишком широкий колл.
            </p>
          </section>

          <section className="surface igor-notes">
            <div className="section-head compact">
              <div>
                <p className="kicker">Блеф с эквити</p>
                <h2>Если у блефа есть ауты, фолдов нужно меньше</h2>
              </div>
              <p className="table-note">
                Не все блефы «мертвые». Если при колле у тебя остается equity, часть работы за
                FE уже делает доезд. Самая полезная мнемоника тут: <strong>bluff share = call equity = equity без FE</strong>.
              </p>
            </div>

            <div className="section-head compact section-head-stack">
              <div className="inline-fields">
                <EditableNumberField
                  className="number-field compact-field"
                  inputMin={0}
                  label="Банк"
                  onValueChange={setBluffPot}
                  sanitizeMin={0.01}
                  value={bluffPot}
                />
                <EditableNumberField
                  className="number-field compact-field"
                  inputMin={0}
                  label="Ставка"
                  onValueChange={setBluffBet}
                  sanitizeMin={0.01}
                  value={bluffBet}
                />
                <EditableNumberField
                  className="number-field compact-field"
                  inputMax={100}
                  inputMin={0}
                  label="Эквити при колле, %"
                  onValueChange={setBluffEquity}
                  sanitizeMax={100}
                  sanitizeMin={0}
                  value={bluffEquity}
                />
              </div>
            </div>

            <div className="igor-output-grid raise-grid">
              <article className="sheet-card dark">
                <span>Фолдов нужно с этой equity</span>
                <strong>{formatShare(bluffWithEquity.feWithEquity, displayMode)}</strong>
              </article>
              <article className="sheet-card">
                <span>Чистый блеф просил бы</span>
                <strong>{formatShare(bluffWithEquity.pureFe, displayMode)}</strong>
              </article>
              <article className="sheet-card">
                <span>Эквити без FE</span>
                <strong>{formatShare(bluffWithEquity.noFoldEquity, displayMode)}</strong>
              </article>
              <article className="sheet-card">
                <span>FE экономия</span>
                <strong>{formatShare(bluffWithEquity.savedFe, displayMode)}</strong>
              </article>
            </div>

            <p className="igor-summary">
              Проверка математики: при банке <strong>{formatDecimal(bluffPot)}</strong> и ставке{' '}
              <strong>{formatDecimal(bluffBet)}</strong> чистый блеф просит{' '}
              <strong>{formatShare(bluffWithEquity.pureFe, displayMode)}</strong> фолдов. Если при колле у
              тебя есть <strong>{formatShare(bluffWithEquity.safeEquity, displayMode)}</strong> equity, то
              блефу нужно уже не <strong>{formatShare(bluffWithEquity.pureFe, displayMode)}</strong>, а{' '}
              <strong>{formatShare(bluffWithEquity.feWithEquity, displayMode)}</strong> фолдов. А порог{' '}
              <strong>{formatShare(bluffWithEquity.noFoldEquity, displayMode)}</strong> это как раз та же
              цифра, что и <strong>bluff share</strong> у river-ставки такого же сайзинга.
            </p>

            <p className="input-hint">
              Это <strong>не</strong> порог для value-бета. Здесь сравнение идет с
              <strong> give-up / нулевой реализацией</strong>: ставим блеф и смотрим, сколько
              фолдов нужно, чтобы сама ставка не была минусовой. Поэтому на ривере value-бету
              действительно нужно <strong>50%+ против calling range</strong>, а этому виджету
              для semibluff хватает pot-odds-порога. В формулах это одна и та же точка:{' '}
              <strong>B / (P + 2B)</strong>.
            </p>
          </section>
        </div>
      </section>

      <section className="surface cheat-table igor-table jump-target" id="igor-ladder">
        <div className="section-head compact">
          <div>
            <p className="kicker">Справочник</p>
            <h2>Банк 100: готовая лестница сайзингов</h2>
          </div>
          <p className="table-note">
            Здесь живет reference-таблица: сколько фолдов нужно, сколько bluff на 1 value и
            сколько защиты требуется при стандартных сайзингах. Удобно смотреть как{' '}
            <strong>FE и MDF</strong> складываются в 100%, а <strong>1 колл = фолдов</strong>{' '}
            повторяет размер ставки в банках.
          </p>
        </div>

        <div className="table-wrap">
          <table>
            <caption>Лестница сайзингов для банка 100.</caption>
            <thead>
              <tr>
                <th scope="col">Ставка</th>
                <th scope="col">Блефов, %</th>
                <th scope="col">Фолдов нужно</th>
                <th scope="col">MDF</th>
                <th scope="col">Bluff / Value</th>
                <th scope="col">Value на 1 bluff</th>
                <th scope="col">1 колл = фолдов</th>
              </tr>
            </thead>
            <tbody>
              {igorLadderBets.map((bet) => {
                const metrics = calculateMetrics(bet / 100)

                return (
                  <tr key={bet}>
                    <td>
                      {displayMode === 'percent'
                        ? `${formatInteger(bet)}%`
                        : formatBetLabel(bet / 100, displayMode)}
                    </td>
                    <td>
                      {displayMode === 'percent'
                        ? formatSheetPercent(metrics.bluffShare)
                        : formatShare(metrics.bluffShare, displayMode)}
                    </td>
                    <td>
                      {displayMode === 'percent'
                        ? formatSheetRoundedPercent(metrics.breakEvenFe)
                        : formatShare(metrics.breakEvenFe, displayMode)}
                    </td>
                    <td>
                      {displayMode === 'percent'
                        ? formatSheetRoundedPercent(metrics.mdf)
                        : formatShare(metrics.mdf, displayMode)}
                    </td>
                    <td>{formatDecimal(metrics.breakEvenFe)}</td>
                    <td>
                      {formatDecimal(
                        metrics.valueToBluff.numerator / metrics.valueToBluff.denominator,
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
    </>
  )
}
