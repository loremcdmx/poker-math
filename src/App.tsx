import { useState } from 'react'
import './App.css'
import { IgorMode } from './modes/IgorMode'
import { QuickMode } from './modes/QuickMode'
import type { DisplayMode } from './lib/pokerMath'

type AppMode = 'quick' | 'igor'

function App() {
  const [appMode, setAppMode] = useState<AppMode>('quick')
  const [betPercent, setBetPercent] = useState(50)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent')

  return (
    <div className="app-shell">
      <div className="mode-switch surface" role="group" aria-label="App mode">
        <button
          aria-pressed={appMode === 'quick'}
          className={appMode === 'quick' ? 'mode-switch-item active' : 'mode-switch-item'}
          onClick={() => setAppMode('quick')}
          type="button"
        >
          Быстрый калькулятор
        </button>
        <button
          aria-pressed={appMode === 'igor'}
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
          onBetPercentChange={setBetPercent}
          onDisplayModeChange={setDisplayMode}
        />
      ) : (
        <IgorMode />
      )}
    </div>
  )
}

export default App
