import { useState, type KeyboardEvent } from 'react'
import './App.css'
import { IgorMode } from './modes/IgorMode'
import { QuickMode } from './modes/QuickMode'
import type { DisplayMode } from './lib/pokerMath'

type AppMode = 'quick' | 'igor'

function App() {
  const [appMode, setAppMode] = useState<AppMode>('quick')
  const [betPercent, setBetPercent] = useState(50)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent')

  function handleModeTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentMode: AppMode) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }

    event.preventDefault()

    if (currentMode === 'quick') {
      setAppMode('igor')
      return
    }

    setAppMode('quick')
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
        </div>

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
      ) : (
        <section
          aria-labelledby="igor-tab"
          id="igor-panel"
          role="tabpanel"
          tabIndex={0}
        >
          <IgorMode displayMode={displayMode} />
        </section>
      )}
    </div>
  )
}

export default App
