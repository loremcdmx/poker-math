import { useState, type KeyboardEvent } from 'react'
import './App.css'
import { AdvancedMode } from './modes/AdvancedMode'
import { IgorMode } from './modes/IgorMode'
import { QuickMode } from './modes/QuickMode'
import type { DisplayMode } from './lib/pokerMath'

type AppMode = 'quick' | 'igor' | 'advanced'

const BASE_APP_MODES: AppMode[] = ['quick', 'igor']

function App() {
  const [appMode, setAppMode] = useState<AppMode>('quick')
  const [betPercent, setBetPercent] = useState(50)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent')
  const [advMode, setAdvMode] = useState(false)

  const visibleModes: AppMode[] = advMode
    ? [...BASE_APP_MODES, 'advanced']
    : BASE_APP_MODES

  function handleModeTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentMode: AppMode) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const currentIndex = visibleModes.indexOf(currentMode)
    const nextIndex = (currentIndex + direction + visibleModes.length) % visibleModes.length
    setAppMode(visibleModes[nextIndex])
  }

  function toggleAdvMode() {
    setAdvMode((prev) => {
      const next = !prev
      if (!next && appMode === 'advanced') {
        setAppMode('quick')
      }
      return next
    })
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
            role="tab"
            tabIndex={appMode === 'quick' ? 0 : -1}
            type="button"
          >
            Быстрый калькулятор
          </button>
          <button
            aria-controls="igor-panel"
            aria-selected={appMode === 'igor'}
            className={appMode === 'igor' ? 'mode-switch-item active' : 'mode-switch-item'}
            id="igor-tab"
            onClick={() => setAppMode('igor')}
            onKeyDown={(event) => handleModeTabKeyDown(event, 'igor')}
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
              className={displayMode === 'percent' ? 'global-display-item active' : 'global-display-item'}
              onClick={() => setDisplayMode('percent')}
              type="button"
            >
              Проценты
            </button>
            <button
              aria-pressed={displayMode === 'fraction'}
              className={displayMode === 'fraction' ? 'global-display-item active' : 'global-display-item'}
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
        <section
          aria-labelledby="quick-tab"
          id="quick-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <QuickMode
            betPercent={betPercent}
            displayMode={displayMode}
            onBetPercentChange={setBetPercent}
          />
        </section>
      ) : appMode === 'igor' ? (
        <section
          aria-labelledby="igor-tab"
          id="igor-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <IgorMode displayMode={displayMode} />
        </section>
      ) : (
        <section
          aria-labelledby="advanced-tab"
          id="advanced-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <AdvancedMode displayMode={displayMode} />
        </section>
      )}
    </div>
  )
}

export default App
