import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import './App.css'
import { AdvancedMode } from './modes/AdvancedMode'
import { CombinatoricsMode } from './modes/CombinatoricsMode'
import { IgorMode } from './modes/IgorMode'
import { QuickMode } from './modes/QuickMode'
import type { DisplayMode } from './lib/pokerMath'

type AppMode = 'quick' | 'combinatorics' | 'igor' | 'advanced'

const BASE_APP_MODES: AppMode[] = ['quick', 'combinatorics', 'igor']

function App() {
  const [appMode, setAppMode] = useState<AppMode>('quick')
  const [betPercent, setBetPercent] = useState(50)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent')
  const [advMode, setAdvMode] = useState(false)
  const [advancedPassword, setAdvancedPassword] = useState('')
  const [advancedUnlocked, setAdvancedUnlocked] = useState(false)
  const [advancedPasswordError, setAdvancedPasswordError] = useState('')
  const tabRefs = useRef<Record<AppMode, HTMLButtonElement | null>>({
    advanced: null,
    combinatorics: null,
    igor: null,
    quick: null,
  })

  const visibleModes: AppMode[] = advMode ? [...BASE_APP_MODES, 'advanced'] : BASE_APP_MODES

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
    setAdvMode((previousValue) => {
      const nextValue = !previousValue

      if (!nextValue && appMode === 'advanced') {
        setAppMode('quick')
      }

      return nextValue
    })
  }

  function handleAdvancedUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (advancedPassword === '123') {
      setAdvancedUnlocked(true)
      setAdvancedPasswordError('')
      return
    }

    setAdvancedPasswordError('Неверный пароль. Подсказка: сейчас это 123.')
  }

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <div className="mode-switch surface" role="tablist" aria-label="App mode">
          <button
            aria-controls="quick-panel"
            aria-selected={appMode === 'quick'}
            className={appMode === 'quick' ? 'mode-switch-item active' : 'mode-switch-item'}
            id="quick-tab"
            onClick={() => setAppMode('quick')}
            onKeyDown={(event) => handleModeTabKeyDown(event, 'quick')}
            ref={(node) => {
              tabRefs.current.quick = node
            }}
            role="tab"
            tabIndex={appMode === 'quick' ? 0 : -1}
            type="button"
          >
            Базовые формулы шансов
          </button>
          <button
            aria-controls="combinatorics-panel"
            aria-selected={appMode === 'combinatorics'}
            className={
              appMode === 'combinatorics' ? 'mode-switch-item active' : 'mode-switch-item'
            }
            id="combinatorics-tab"
            onClick={() => setAppMode('combinatorics')}
            onKeyDown={(event) => handleModeTabKeyDown(event, 'combinatorics')}
            ref={(node) => {
              tabRefs.current.combinatorics = node
            }}
            role="tab"
            tabIndex={appMode === 'combinatorics' ? 0 : -1}
            type="button"
          >
            Комбинаторика
          </button>
          <button
            aria-controls="igor-panel"
            aria-selected={appMode === 'igor'}
            className={appMode === 'igor' ? 'mode-switch-item active' : 'mode-switch-item'}
            id="igor-tab"
            onClick={() => setAppMode('igor')}
            onKeyDown={(event) => handleModeTabKeyDown(event, 'igor')}
            ref={(node) => {
              tabRefs.current.igor = node
            }}
            role="tab"
            tabIndex={appMode === 'igor' ? 0 : -1}
            type="button"
          >
            Режим Игоря
          </button>
          {advMode ? (
            <button
              aria-controls="advanced-panel"
              aria-selected={appMode === 'advanced'}
              className={appMode === 'advanced' ? 'mode-switch-item active' : 'mode-switch-item'}
              id="advanced-tab"
              onClick={() => setAppMode('advanced')}
              onKeyDown={(event) => handleModeTabKeyDown(event, 'advanced')}
              ref={(node) => {
                tabRefs.current.advanced = node
              }}
              role="tab"
              tabIndex={appMode === 'advanced' ? 0 : -1}
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
      </div>

      {appMode === 'quick' ? (
        <section aria-labelledby="quick-tab" id="quick-panel" role="tabpanel" tabIndex={0}>
          <QuickMode
            betPercent={betPercent}
            displayMode={displayMode}
            onBetPercentChange={setBetPercent}
          />
        </section>
      ) : appMode === 'combinatorics' ? (
        <section
          aria-labelledby="combinatorics-tab"
          id="combinatorics-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <CombinatoricsMode displayMode={displayMode} />
        </section>
      ) : appMode === 'igor' ? (
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
                  <p className="advanced-lock-note">Демо-пароль сейчас: 123.</p>
                )}
              </article>
            </section>
          )}
        </section>
      )}
    </div>
  )
}

export default App
