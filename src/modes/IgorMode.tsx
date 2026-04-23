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
  pluralizeRu,
} from '../lib/formatters'
import {
  buildMultiStreetLine,
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
import { useLocalStorageState } from '../lib/storage'

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'auto', block: 'start' })
}

type IgorModeProps = {
  displayMode: DisplayMode
}

const INVENTORY_DRILL_SPOTS = [
  { bet: 50, knownCount: 12, knownMode: 'value', pot: 100 },
  { bet: 25, knownCount: 16, knownMode: 'value', pot: 75 },
  { bet: 100, knownCount: 10, knownMode: 'value', pot: 100 },
  { bet: 50, knownCount: 4, knownMode: 'bluff', pot: 100 },
  { bet: 40, knownCount: 8, knownMode: 'bluff', pot: 60 },
] as const

type InventoryDrillSpot = (typeof INVENTORY_DRILL_SPOTS)[number]

export function IgorMode({ displayMode }: IgorModeProps) {
  const [potInputMode, setPotInputMode] = useLocalStorageState<PotInputMode>(
    'pokermath.igor.pot-mode',
    'clean',
  )
  const [knownMode, setKnownMode] = useLocalStorageState<IgorInventoryMode>(
    'pokermath.igor.known-mode',
    'value',
  )
  const [igorPot, setIgorPot] = useLocalStorageState('pokermath.igor.pot', 24)
  const [igorBet, setIgorBet] = useLocalStorageState('pokermath.igor.bet', 19)
  const [knownCount, setKnownCount] = useLocalStorageState('pokermath.igor.known-count', 88)
  const [bluffPot, setBluffPot] = useLocalStorageState('pokermath.igor.bluff-pot', 100)
  const [bluffBet, setBluffBet] = useLocalStorageState('pokermath.igor.bluff-bet', 50)
  const [bluffEquity, setBluffEquity] = useLocalStorageState('pokermath.igor.bluff-equity', 25)
  const [raisePot, setRaisePot] = useLocalStorageState('pokermath.igor.raise-pot', 8)
  const [raiseBet, setRaiseBet] = useLocalStorageState('pokermath.igor.raise-bet', 5)
  const [raiseTotal, setRaiseTotal] = useLocalStorageState('pokermath.igor.raise-total', 23)
  const [lineStartPot, setLineStartPot] = useLocalStorageState('pokermath.igor.line-start-pot', 40)
  const [lineFlopBet, setLineFlopBet] = useLocalStorageState('pokermath.igor.line-flop-bet', 33)
  const [lineTurnBet, setLineTurnBet] = useLocalStorageState('pokermath.igor.line-turn-bet', 75)
  const [lineRiverBet, setLineRiverBet] = useLocalStorageState('pokermath.igor.line-river-bet', 125)
  const [inventoryDrillIndex, setInventoryDrillIndex] = useState(0)
  const [inventoryDrillGuess, setInventoryDrillGuess] = useState(4)
  const [inventoryDrillChecked, setInventoryDrillChecked] = useState(false)
  const [inventoryDrillStreak, setInventoryDrillStreak] = useState(0)

  const inventory = calculateIgorInventory(
    igorPot,
    igorBet,
    potInputMode,
    knownMode,
    knownCount,
  )
  const raiseMetrics = calculateRaiseMetrics(raisePot, raiseBet, raiseTotal)
  const bluffWithEquity = calculateBluffWithEquity(bluffPot, bluffBet, bluffEquity)
  const linePlan = buildMultiStreetLine(lineStartPot, [lineFlopBet, lineTurnBet, lineRiverBet])
  const activeLineSteps = linePlan.steps.filter((step) => step.active)
  const lastActiveLineStep = activeLineSteps[activeLineSteps.length - 1] ?? null
  const lineGrowthFactor = linePlan.finalPotIfCalled / linePlan.safeStartPot
  const inventoryDrillSpot = INVENTORY_DRILL_SPOTS[inventoryDrillIndex] ?? INVENTORY_DRILL_SPOTS[0]
  const inventoryDrillMath = calculateIgorInventory(
    inventoryDrillSpot.pot,
    inventoryDrillSpot.bet,
    'clean',
    inventoryDrillSpot.knownMode,
    inventoryDrillSpot.knownCount,
  )
  const inventoryDrillAnswer =
    inventoryDrillSpot.knownMode === 'value'
      ? inventoryDrillMath.bluffCount
      : inventoryDrillMath.valueCount
  const inventoryDrillDifference = Math.abs(inventoryDrillAnswer - inventoryDrillGuess)
  const inventoryDrillSolved = inventoryDrillDifference <= 0.5

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

  function getInventoryDrillAnswer(spot: InventoryDrillSpot) {
    const spotMath = calculateIgorInventory(
      spot.pot,
      spot.bet,
      'clean',
      spot.knownMode,
      spot.knownCount,
    )
    return spot.knownMode === 'value' ? spotMath.bluffCount : spotMath.valueCount
  }

  function checkInventoryDrill() {
    setInventoryDrillChecked(true)
    setInventoryDrillStreak((currentStreak) => (inventoryDrillSolved ? currentStreak + 1 : 0))
  }

  function nextInventoryDrillRound() {
    const nextOptions = INVENTORY_DRILL_SPOTS.map((_, index) => index).filter(
      (index) => index !== inventoryDrillIndex,
    )
    const nextIndex = nextOptions[Math.floor(Math.random() * nextOptions.length)] ?? 0
    const nextSpot = INVENTORY_DRILL_SPOTS[nextIndex] ?? INVENTORY_DRILL_SPOTS[0]

    setInventoryDrillIndex(nextIndex)
    setInventoryDrillGuess(Math.round(getInventoryDrillAnswer(nextSpot)))
    setInventoryDrillChecked(false)
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
      label: 'План линии',
      onClick: () => scrollToSection('igor-line-builder'),
    },
    {
      label: 'Справочник сайзингов',
      onClick: () => scrollToSection('igor-ladder'),
    },
  ]

  return (
    <>
      <header className="hero-panel surface igor-hero">
        <div className="hero-copy">
          <p className="eyebrow">Режим Игоря</p>
          <h1>Сначала вводишь спот, потом сразу видишь математику ставки.</h1>
          <p className="hero-text">
            Этот режим нужен для трёх частых задач: быстро перевести{' '}
            <span>value ↔ bluff</span>, не путаться с <span>банком из клиента</span> и
            проверить, как выглядит спот против <span>коллбота</span>. Если ты здесь
            впервые, просто начни с главного блока ниже: выбери, как записан банк, введи
            банк и ставку, а потом скажи калькулятору, сколько у тебя value или bluff.
          </p>
          <HeroActionChips ariaLabel="Быстрые действия режима Игоря" items={heroActions} />
        </div>

        <div className="hero-focus igor-focus">
          <p className="focus-label">С чего начать</p>
          <p className="igor-focus-title">
            Фиксируешь формат банка, вводишь ставку и выбираешь известную сторону диапазона.
          </p>
          <div className="igor-focus-steps">
            <div className="igor-focus-step">
              <strong>1. Как записан банк</strong>
              <p>Либо чистый пот до ставки, либо цифра из клиента, если рум уже показал банк после ставки.</p>
            </div>
            <div className="igor-focus-step">
              <strong>2. Что у тебя уже известно</strong>
              <p>Дальше говоришь калькулятору, знаешь ли ты количество value или количество bluff.</p>
            </div>
            <div className="igor-focus-step">
              <strong>3. Что получаешь на выходе</strong>
              <p>На выходе сразу видишь сайзинг, pot odds на колл и вторую сторону диапазона.</p>
            </div>
          </div>
          <div className="focus-equation">
            <span>{potInputMode === 'client' ? 'Пример на цифрах из клиента' : 'Пример на текущих числах'}</span>
            <p className="igor-focus-example">
              {formatDecimal(
                potInputMode === 'client' ? inventory.safePotInput : inventory.safePot,
              )}{' '}
              / {formatDecimal(inventory.safeBet)} ={' '}
              {formatBetLabel(inventory.betPercentOfPot, displayMode)}
            </p>
            <p>
              {potInputMode === 'client' ? (
                <>
                  Рум показывает банк <strong>{formatDecimal(inventory.safePotInput)}</strong>.
                  Калькулятор автоматически переводит это в чистый пот{' '}
                  <strong>{formatDecimal(inventory.safePot)}</strong> до ставки и дальше считает
                  баланс спота уже по корректной базе.
                </>
              ) : (
                <>
                  Это не отдельный режим, а просто живой пример того, что посчитает главный
                  блок ниже: колл по шансам <strong>{formatShare(inventory.oddsPercent, displayMode)}</strong>,
                  а на каждое <strong>1 value</strong> здесь можно держать примерно{' '}
                  <strong>{formatDecimal(inventory.bluffPerValue)} bluff</strong>.
                </>
              )}
            </p>
          </div>
          <div className="focus-metrics">
            <div>
              <span>Колл по шансам</span>
              <strong>{formatShare(inventory.oddsPercent, displayMode)}</strong>
            </div>
            <div>
              <span>Блефов на 1 value</span>
              <strong>{formatDecimal(inventory.bluffPerValue)}</strong>
            </div>
            <div>
              <span>Сайзинг</span>
              <strong>{formatBetLabel(inventory.betPercentOfPot, displayMode)}</strong>
            </div>
          </div>
          <p className="focus-subtitle">
            {potInputMode === 'client' ? (
              <>
                Если хочешь сразу работать с этими числами, жми <strong>«Пот как в клиенте»</strong>,
                а ниже уже можно докрутить спот до нужного value ↔ bluff баланса.
              </>
            ) : (
              <>
                Главный рабочий экран идёт сразу после этого блока: там те же числа можно
                перевести в <strong>value</strong>, <strong>bluff</strong> и баланс ставки без
                лишней теории.
              </>
            )}
          </p>
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

        <div className="quick-drill-card igor-inventory-drill">
          <div className="section-head compact">
            <div>
              <p className="kicker">Мини-дрилл</p>
              <h3>Переведи value ↔ bluff без калькулятора</h3>
            </div>
            <p className="table-note">
              Тренировка на главный river-шаблон: сначала находишь коэффициент, потом
              умножаешь известную сторону диапазона.
            </p>
          </div>

          <div className="summary-grid compact-summary">
            <article className="result-card primary">
              <p className="card-label">Спот</p>
              <h3>
                Банк {formatDecimal(inventoryDrillSpot.pot)}, ставка{' '}
                {formatDecimal(inventoryDrillSpot.bet)}
              </h3>
              <p>
                Известно{' '}
                <strong>
                  {formatDecimal(inventoryDrillSpot.knownCount)}{' '}
                  {inventoryDrillSpot.knownMode === 'value' ? 'value' : 'bluff'}
                </strong>
                . Назови{' '}
                {inventoryDrillSpot.knownMode === 'value'
                  ? 'сколько bluff можно добавить'
                  : 'сколько value нужно'}.
              </p>
            </article>
            <article className="result-card">
              <p className="card-label">Серия</p>
              <h3>{formatInteger(inventoryDrillStreak)}</h3>
              <p>Ответ принимается в пределах 0,5 комбо от точного числа.</p>
            </article>
          </div>

          <div className="quick-drill-controls">
            <EditableNumberField
              ariaLabel="Inventory drill answer"
              className="number-field compact-field"
              inputMin={0}
              label={
                inventoryDrillSpot.knownMode === 'value'
                  ? 'Твой ответ, bluff'
                  : 'Твой ответ, value'
              }
              onValueChange={(value) => {
                setInventoryDrillGuess(value)
                if (inventoryDrillChecked) {
                  setInventoryDrillChecked(false)
                }
              }}
              sanitizeMin={0}
              value={inventoryDrillGuess}
            />

            <div className="quick-drill-actions">
              <button className="mode-chip active" onClick={checkInventoryDrill} type="button">
                Проверить
              </button>
              <button className="mode-chip" onClick={nextInventoryDrillRound} type="button">
                Новый спот
              </button>
            </div>
          </div>

          <p className="igor-summary">
            Подсказка без спойлера:{' '}
            {inventoryDrillSpot.knownMode === 'value' ? (
              <>
                для value сначала найди <strong>bluff на 1 value</strong> как
                ставка / (банк + ставка).
              </>
            ) : (
              <>
                для bluff сначала найди <strong>value на 1 bluff</strong> как
                (банк + ставка) / ставка.
              </>
            )}
          </p>

          {inventoryDrillChecked ? (
            <article
              className={
                inventoryDrillSolved
                  ? 'result-card quick-drill-result success'
                  : 'result-card quick-drill-result'
              }
            >
              <p className="card-label">{inventoryDrillSolved ? 'Попал' : 'Мимо, но близко'}</p>
              <h3>{formatDecimal(inventoryDrillAnswer)}</h3>
              <p>
                Твой ответ: <strong>{formatDecimal(inventoryDrillGuess)}</strong>, ошибка около{' '}
                <strong>{formatDecimal(inventoryDrillDifference)}</strong> комбо.
              </p>
              <div className="quick-drill-solution" aria-label="Решение value bluff">
                <p className="card-label">Решение по алгоритму</p>
                {inventoryDrillSpot.knownMode === 'value' ? (
                  <ol>
                    <li>
                      Сначала считаем bluff на 1 value:{' '}
                      <strong>
                        {formatDecimal(inventoryDrillSpot.bet)} / (
                        {formatDecimal(inventoryDrillSpot.pot)} +{' '}
                        {formatDecimal(inventoryDrillSpot.bet)})
                      </strong>
                      .
                    </li>
                    <li>
                      Коэффициент ={' '}
                      <strong>{formatDecimal(inventoryDrillMath.bluffPerValue)}</strong>.
                    </li>
                    <li>
                      Bluff = value × коэффициент ={' '}
                      <strong>
                        {formatDecimal(inventoryDrillSpot.knownCount)} ×{' '}
                        {formatDecimal(inventoryDrillMath.bluffPerValue)} ={' '}
                        {formatDecimal(inventoryDrillAnswer)}
                      </strong>
                      .
                    </li>
                  </ol>
                ) : (
                  <ol>
                    <li>
                      Сначала считаем value на 1 bluff:{' '}
                      <strong>
                        ({formatDecimal(inventoryDrillSpot.pot)} +{' '}
                        {formatDecimal(inventoryDrillSpot.bet)}) /{' '}
                        {formatDecimal(inventoryDrillSpot.bet)}
                      </strong>
                      .
                    </li>
                    <li>
                      Коэффициент ={' '}
                      <strong>{formatDecimal(inventoryDrillMath.valuePerBluff)}</strong>.
                    </li>
                    <li>
                      Value = bluff × коэффициент ={' '}
                      <strong>
                        {formatDecimal(inventoryDrillSpot.knownCount)} ×{' '}
                        {formatDecimal(inventoryDrillMath.valuePerBluff)} ={' '}
                        {formatDecimal(inventoryDrillAnswer)}
                      </strong>
                      .
                    </li>
                  </ol>
                )}
              </div>
            </article>
          ) : null}
        </div>
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

      <section className="surface igor-line-builder jump-target" id="igor-line-builder">
        <div className="igor-line-builder-top">
          <div className="igor-line-builder-copy">
            <p className="kicker">План линии</p>
            <h2>Собери c-bet / barrel / jam и увидь математику всей линии заранее</h2>
            <p className="hero-text">
              Это уже не одна ставка в вакууме, а связная линия по улицам. Видно, как после
              каждого колла растёт банк, во что превращается следующая ставка в абсолютных
              фишках и сколько фолдов просит каждая улица, если оппонент продолжает.
            </p>
          </div>

          <aside className="igor-line-builder-note">
            <p className="card-label">Что видно сразу</p>
            <h3>Не отдельный сайзинг, а целое давление по линии</h3>
            <div className="igor-line-builder-note-list">
              <p>
                <strong>Банк раздувается каскадом.</strong> Поэтому одинаковые проценты на
                тёрне и ривере ощущаются совсем по-разному.
              </p>
              <p>
                <strong>Каждая улица читает свою FE.</strong> Можно заранее понять, где линия
                остаётся связной, а где уже начинает просить слишком много фолдов.
              </p>
              <p>
                <strong>Инвестиция видна целиком.</strong> Не только последняя ставка, а вся
                сумма денег, которую ты реально вкладываешь в давление.
              </p>
            </div>
          </aside>
        </div>

        <div className="igor-line-builder-strip">
          <article className="igor-line-builder-stat">
            <span>Активно в линии</span>
            <strong>
              {activeLineSteps.length} из {linePlan.steps.length}
            </strong>
            <p>
              Сейчас в работе {activeLineSteps.length}{' '}
              {pluralizeRu(activeLineSteps.length, ['улица', 'улицы', 'улиц'])} давления.
            </p>
          </article>
          <article className="igor-line-builder-stat">
            <span>Банк к последней ставке</span>
            <strong>
              {formatDecimal(lastActiveLineStep?.potBefore ?? linePlan.safeStartPot)}
            </strong>
            <p>С таким банком линия подходит к последнему активному решению.</p>
          </article>
          <article className="igor-line-builder-stat">
            <span>Рост банка при коллах</span>
            <strong>x{formatDecimal(lineGrowthFactor)}</strong>
            <p>Во столько раз линия раздувает пот, если каждую улицу продолжают коллом.</p>
          </article>
        </div>

        <div className="igor-line-builder-controls">
          <div className="igor-line-builder-controls-head">
            <p className="card-label">Конструктор линии</p>
            <p className="table-note">
              Читай слева направо, как последовательность узлов. Каждая следующая улица уже
              наследует раздутый банк после колла предыдущей ставки. Если улица проходит через
              чек, просто поставь <strong>0</strong>.
            </p>
          </div>

          <div className="line-builder-flow">
            <article className="line-builder-node line-builder-node-start">
              <div className="line-builder-node-head">
                <span className="line-builder-node-step">Старт</span>
                <strong>Пот до флопа</strong>
              </div>
              <EditableNumberField
                className="number-field line-builder-field"
                inputMin={0}
                label="Стартовый банк"
                onValueChange={setLineStartPot}
                sanitizeMin={0.01}
                value={lineStartPot}
              />
              <div className="line-builder-node-meta line-builder-node-meta-single">
                <div>
                  <span>База линии</span>
                  <strong>{formatDecimal(linePlan.safeStartPot)}</strong>
                </div>
              </div>
            </article>

            {linePlan.steps.map((step, index) => (
              <article
                className={
                  step.active
                    ? 'line-builder-node line-builder-node-street'
                    : 'line-builder-node line-builder-node-street is-inactive'
                }
                key={step.street}
              >
                <div className="line-builder-node-head">
                  <span className="line-builder-node-step">{step.street}</span>
                  <strong>
                    {step.active
                      ? displayMode === 'percent'
                        ? `${formatInteger(step.betPercent)}% банка`
                        : formatBetLabel(step.betMultiple, displayMode)
                      : 'Чек / 0%'}
                  </strong>
                </div>
                <EditableNumberField
                  className="number-field line-builder-field"
                  inputMin={0}
                  label={`${step.street}, % банка`}
                  onValueChange={
                    index === 0
                      ? setLineFlopBet
                      : index === 1
                        ? setLineTurnBet
                        : setLineRiverBet
                  }
                  sanitizeMin={0}
                  value={step.betPercent}
                />
                <div className="line-builder-node-meta">
                  <div>
                    <span>Банк до</span>
                    <strong>{formatDecimal(step.potBefore)}</strong>
                  </div>
                  <div>
                    <span>Ставка</span>
                    <strong>{step.active ? formatDecimal(step.betSize) : 'Чек'}</strong>
                  </div>
                  <div>
                    <span>Фолдов нужно</span>
                    <strong>
                      {step.metrics === null
                        ? '—'
                        : formatShare(step.metrics.breakEvenFe, displayMode)}
                    </strong>
                  </div>
                </div>
                <p className="line-builder-node-foot">
                  После колла <strong>{formatDecimal(step.potAfterCall)}</strong>
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="summary-grid compact-summary">
          <article className="result-card primary">
            <p className="card-label">Финальный банк после коллов</p>
            <h3>{formatDecimal(linePlan.finalPotIfCalled)}</h3>
            <p>Во сколько раз линия раздувает пот, если каждую улицу просто коллят.</p>
          </article>
          <article className="result-card">
            <p className="card-label">Всего инвестируем</p>
            <h3>{formatDecimal(linePlan.totalInvestment)}</h3>
            <p>Сумма всех ставок по линии без учёта префлопа и рейк-эффектов.</p>
          </article>
        </div>

        <div className="table-wrap">
          <table>
            <caption>Пошаговая математика линии по улицам.</caption>
            <thead>
              <tr>
                <th scope="col">Улица</th>
                <th scope="col">Банк до ставки</th>
                <th scope="col">Ставка</th>
                <th scope="col">Фолдов нужно</th>
                <th scope="col">Bluff share</th>
                <th scope="col">Банк после колла</th>
                <th scope="col">Инвестировано суммарно</th>
              </tr>
            </thead>
            <tbody>
              {linePlan.steps.map((step) => (
                <tr key={step.street}>
                  <td>{step.street}</td>
                  <td>{formatDecimal(step.potBefore)}</td>
                  <td>
                    {step.active
                      ? `${formatDecimal(step.betSize)} (${formatInteger(step.betPercent)}%)`
                      : 'Чек'}
                  </td>
                  <td>
                    {step.metrics === null
                      ? '—'
                      : formatShare(step.metrics.breakEvenFe, displayMode)}
                  </td>
                  <td>
                    {step.metrics === null
                      ? '—'
                      : formatShare(step.metrics.bluffShare, displayMode)}
                  </td>
                  <td>{formatDecimal(step.potAfterCall)}</td>
                  <td>{formatDecimal(step.cumulativeInvestment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="igor-summary">
          Логика чтения простая: каждая следующая улица уже работает от раздутого банка. Поэтому
          даже одинаковый по проценту сайзинг на тёрне и ривере в абсолютных фишках ощущается
          совсем по-разному.
        </p>
      </section>

      <section className="surface cheat-table igor-table jump-target" id="igor-ladder">
        <div className="section-head compact">
          <div>
            <p className="kicker">Справочник</p>
            <h2>Стандартные сайзинги на одной шкале</h2>
          </div>
          <p className="table-note">
            Здесь нет отдельного спота с банком <strong>100</strong>. Мы просто мысленно
            принимаем пот за <strong>100 фишек</strong>, чтобы сайзинг сразу переводился в
            числа: <strong>33% = 33</strong>, <strong>75% = 75</strong>,{' '}
            <strong>125% = 125</strong>. Сами <strong>FE</strong>, <strong>MDF</strong> и
            баланс от абсолютного банка не меняются.
          </p>
        </div>

        <div className="igor-ladder-grid">
          <article className="sheet-card dark">
            <span>Зачем здесь 100</span>
            <strong>Это просто линейка</strong>
            <p>
              Нормализованный банк нужен только для быстрого перевода процентов в фишки без
              калькулятора.
            </p>
          </article>
          <article className="sheet-card">
            <span>Что смотреть первым</span>
            <strong>FE + MDF = 100%</strong>
            <p>
              Если ставка просит 43% фолдов, то защищать против неё нужно примерно 57%
              диапазона.
            </p>
          </article>
          <article className="sheet-card">
            <span>Как читать баланс</span>
            <strong>Блефы и value рядом</strong>
            <p>
              Каждая строка сразу показывает, сколько блефов допустимо в ставке и сколько
              value приходится на один bluff.
            </p>
          </article>
        </div>

        <div className="table-wrap">
          <table>
            <caption>
              Нормализованная шкала: представь, что текущий банк равен 100, и проценты сразу
              превратятся в фишки.
            </caption>
            <thead>
              <tr>
                <th scope="col">Сайзинг</th>
                <th scope="col">Если банк = 100</th>
                <th scope="col">Блефов в ставке</th>
                <th scope="col">Фолдов нужно</th>
                <th scope="col">MDF</th>
                <th scope="col">Блефов на 1 value</th>
                <th scope="col">Value на 1 bluff</th>
              </tr>
            </thead>
            <tbody>
              {igorLadderBets.map((bet) => {
                const metrics = calculateMetrics(bet / 100)

                return (
                  <tr key={bet}>
                    <td>
                      {displayMode === 'percent'
                        ? `${formatInteger(bet)}% банка`
                        : formatBetLabel(bet / 100, displayMode)}
                    </td>
                    <td>{formatInteger(bet)}</td>
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
