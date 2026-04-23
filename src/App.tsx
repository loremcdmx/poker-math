import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import './App.css'
import { useLocalStorageState } from './lib/storage'
import { AdvancedMode } from './modes/AdvancedMode'
import { IgorMode } from './modes/IgorMode'
import { QuickMode } from './modes/QuickMode'
import type { DisplayMode } from './lib/pokerMath'

type AppMode = 'quick' | 'igor' | 'advanced'

const BASE_APP_MODES: AppMode[] = ['quick', 'igor']
const ADVANCED_MODE_ENABLED = import.meta.env.VITE_ENABLE_ADVANCED_MODE === '1'
const ADVANCED_MODE_PASSWORD = import.meta.env.VITE_ADVANCED_MODE_PASSWORD

function App() {
  const [appMode, setAppMode] = useLocalStorageState<AppMode>('pokermath.app.mode', 'quick')
  const [betPercent, setBetPercent] = useLocalStorageState('pokermath.quick.bet-percent', 50)
  const [displayMode, setDisplayMode] = useLocalStorageState<DisplayMode>(
    'pokermath.display-mode',
    'percent',
  )
  const [advMode, setAdvMode] = useLocalStorageState('pokermath.advanced.toggle', false)
  const [advancedPassword, setAdvancedPassword] = useState('')
  const [advancedUnlocked, setAdvancedUnlocked] = useState(false)
  const [advancedPasswordError, setAdvancedPasswordError] = useState('')
  const tabRefs = useRef<Record<AppMode, HTMLButtonElement | null>>({
    advanced: null,
    igor: null,
    quick: null,
  })

  const advancedVisible = ADVANCED_MODE_ENABLED && advMode
  const visibleModes = useMemo<AppMode[]>(
    () => (advancedVisible ? [...BASE_APP_MODES, 'advanced'] : BASE_APP_MODES),
    [advancedVisible],
  )
  const activeAppMode = visibleModes.includes(appMode) ? appMode : 'quick'

  useEffect(() => {
    if (!visibleModes.includes(appMode)) {
      setAppMode('quick')
    }
  }, [appMode, setAppMode, visibleModes])

  function handleModeTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentMode: AppMode) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const currentIndex = visibleModes.indexOf(currentMode)
    const nextIndex = (currentIndex + direction + visibleModes.length) % visibleModes.length
    const nextMode = visibleModes[nextIndex]
    setAppMode(nextMode)
    tabRefs.current[nextMode]?.focus()
  }

  function toggleAdvMode() {
    if (!ADVANCED_MODE_ENABLED) {
      return
    }

    setAdvMode((previousValue) => {
      const nextValue = !previousValue

      if (!nextValue && activeAppMode === 'advanced') {
        setAppMode('quick')
      }

      return nextValue
    })
  }

  function handleAdvancedUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (ADVANCED_MODE_PASSWORD === undefined || ADVANCED_MODE_PASSWORD === '') {
      setAdvancedPasswordError('Пароль адвансд мода не настроен.')
      return
    }

    if (advancedPassword === ADVANCED_MODE_PASSWORD) {
      setAdvancedUnlocked(true)
      setAdvancedPasswordError('')
      return
    }

    setAdvancedPasswordError('Неверный пароль.')
  }

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <div className="mode-switch surface" role="tablist" aria-label="App mode">
          <button
            aria-controls="quick-panel"
            aria-selected={activeAppMode === 'quick'}
            className={activeAppMode === 'quick' ? 'mode-switch-item active' : 'mode-switch-item'}
            id="quick-tab"
            onClick={() => setAppMode('quick')}
            onKeyDown={(event) => handleModeTabKeyDown(event, 'quick')}
            ref={(node) => {
              tabRefs.current.quick = node
            }}
            role="tab"
            tabIndex={activeAppMode === 'quick' ? 0 : -1}
            type="button"
          >
            Быстрый калькулятор
          </button>
          <button
            aria-controls="igor-panel"
            aria-selected={activeAppMode === 'igor'}
            className={activeAppMode === 'igor' ? 'mode-switch-item active' : 'mode-switch-item'}
            id="igor-tab"
            onClick={() => setAppMode('igor')}
            onKeyDown={(event) => handleModeTabKeyDown(event, 'igor')}
            ref={(node) => {
              tabRefs.current.igor = node
            }}
            role="tab"
            tabIndex={activeAppMode === 'igor' ? 0 : -1}
            type="button"
          >
            Режим Игоря
          </button>
          {advancedVisible ? (
            <button
              aria-controls="advanced-panel"
              aria-selected={activeAppMode === 'advanced'}
              className={activeAppMode === 'advanced' ? 'mode-switch-item active' : 'mode-switch-item'}
              id="advanced-tab"
              onClick={() => setAppMode('advanced')}
              onKeyDown={(event) => handleModeTabKeyDown(event, 'advanced')}
              ref={(node) => {
                tabRefs.current.advanced = node
              }}
              role="tab"
              tabIndex={activeAppMode === 'advanced' ? 0 : -1}
              type="button"
            >
              Адвансд мод
            </button>
          ) : null}
        </div>

        <div className="toolbar-right">
          <div className="global-display surface" role="group" aria-label="Global display mode">
            <span className="global-display-label">Показ</span>
            <div className="global-display-toggle">
              <button
                aria-pressed={displayMode === 'percent'}
                className={
                  displayMode === 'percent' ? 'global-display-item active' : 'global-display-item'
                }
                onClick={() => setDisplayMode('percent')}
                type="button"
              >
                Проценты
              </button>
              <button
                aria-pressed={displayMode === 'fraction'}
                className={
                  displayMode === 'fraction' ? 'global-display-item active' : 'global-display-item'
                }
                onClick={() => setDisplayMode('fraction')}
                type="button"
              >
                Дроби
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeAppMode === 'quick' ? (
        <section aria-labelledby="quick-tab" id="quick-panel" role="tabpanel" tabIndex={0}>
          <QuickMode
            betPercent={betPercent}
            displayMode={displayMode}
            onBetPercentChange={setBetPercent}
          />
        </section>
      ) : activeAppMode === 'igor' ? (
        <section aria-labelledby="igor-tab" id="igor-panel" role="tabpanel" tabIndex={0}>
          <IgorMode displayMode={displayMode} />
        </section>
      ) : (
        <section aria-labelledby="advanced-tab" id="advanced-panel" role="tabpanel" tabIndex={0}>
          {advancedUnlocked ? (
            <AdvancedMode displayMode={displayMode} />
          ) : (
            <section className="advanced-lock-wrap">
              <article className="surface advanced-lock-card">
                <p className="eyebrow">Адвансд мод</p>
                <h1>Режим закрыт паролем</h1>
                <p className="hero-text">
                  Здесь лежит продвинутая зона с комбинаторикой и эквити. Чтобы открыть её,
                  введи пароль.
                </p>

                <form className="advanced-lock-form" onSubmit={handleAdvancedUnlock}>
                  <label className="number-field" htmlFor="advanced-password">
                    <span>Пароль адвансд мода</span>
                    <input
                      autoComplete="current-password"
                      id="advanced-password"
                      onChange={(event) => {
                        setAdvancedPassword(event.target.value)
                        if (advancedPasswordError) {
                          setAdvancedPasswordError('')
                        }
                      }}
                      type="password"
                      value={advancedPassword}
                    />
                  </label>

                  <button className="mode-chip active" type="submit">
                    Открыть адвансд
                  </button>
                </form>

                {advancedPasswordError ? (
                  <p className="advanced-lock-error" role="alert">
                    {advancedPasswordError}
                  </p>
                ) : (
                  <p className="advanced-lock-note">Внутренний режим: пароль не подсказывается в UI.</p>
                )}
              </article>
            </section>
          )}
        </section>
      )}

      {ADVANCED_MODE_ENABLED ? (
        <section className="adv-dock-wrap" aria-label="Advanced mode controls">
          <div className="adv-dock surface">
            <div className="adv-dock-copy">
              <p className="kicker">Сервисный тумблер</p>
              <p className="adv-dock-note">
                Скрытая демка: включай `advanced` только когда нужно открыть комбинаторику и
                эквити.
              </p>
            </div>

            <button
              aria-label="Advanced mode"
              aria-pressed={advMode}
              className={advMode ? 'adv-toggle surface active' : 'adv-toggle surface'}
              onClick={toggleAdvMode}
              type="button"
            >
              <span className="adv-toggle-label">Adv</span>
              <span className="adv-toggle-indicator" aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default App
