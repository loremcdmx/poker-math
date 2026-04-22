import { EquityMode } from './EquityMode'
import type { DisplayMode } from '../lib/pokerMath'

type AdvancedModeProps = {
  displayMode: DisplayMode
}

export function AdvancedMode({ displayMode }: AdvancedModeProps) {
  return <EquityMode displayMode={displayMode} />
}
