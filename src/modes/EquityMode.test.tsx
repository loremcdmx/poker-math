import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CardCode } from '../lib/combinatorics'
import { calculateEquity, type EquityInput, type EquityResult } from '../lib/equity'
import { EquityMode } from './EquityMode'

type WorkerRequest = {
  boardSlots: Array<CardCode | ''>
  heroInput: EquityInput
  iterations: number
  requestId: number
  villainInput: EquityInput
}

type WorkerResponse = {
  requestId: number
  result: EquityResult
}

describe('EquityMode', () => {
  it('does not block opposite exact-hand cards while the other side is in range mode', () => {
    render(<EquityMode displayMode="percent" embedded />)

    const heroSecondCard = screen.getByRole('combobox', { name: 'Hero Карта 2' })
    const kingHeartsOption = within(heroSecondCard).getByRole('option', { name: 'K♥' })

    expect(kingHeartsOption).toBeEnabled()
  })

  it('blocks opposite exact-hand cards once the other side switches to hand mode', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    await user.click(screen.getAllByRole('button', { name: 'Рука' })[1])

    const heroSecondCard = screen.getByRole('combobox', { name: 'Hero Карта 2' })
    const kingHeartsOption = within(heroSecondCard).getByRole('option', { name: 'K♥' })

    expect(kingHeartsOption).toBeDisabled()
  })

  it('blocks board cards that collide with exact hands', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    expect(screen.getByRole('button', { name: 'A♥' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'A♦' })).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: 'Рука' })[1])

    expect(screen.getByRole('button', { name: 'K♥' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'K♦' })).toBeDisabled()
  })

  it('clears hidden exact-hand blockers when switching a side from range to hand', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    await user.click(screen.getByRole('button', { name: 'K♥' }))
    await user.click(screen.getAllByRole('button', { name: 'Рука' })[1])

    expect(screen.getByRole('combobox', { name: 'Villain Карта 1' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: 'Villain Карта 2' })).toHaveValue('Kd')
  })

  it('marks results as stale after changing the board and explains empty matchups', async () => {
    const user = userEvent.setup()

    render(<EquityMode displayMode="percent" embedded />)

    expect(
      screen.getByText(/Текущий результат соответствует выбранным рукам/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2♣' }))

    expect(screen.getByText(/equity-цифры уже устарели/i)).toBeInTheDocument()

    const villainPresets = screen.getByRole('group', { name: 'Villain range presets' })
    await user.click(within(villainPresets).getByRole('button', { name: 'Очистить' }))
    await user.click(screen.getByRole('button', { name: 'Пересчитать equity' }))

    expect(screen.getByText(/нет валидных матчапов/i)).toBeInTheDocument()
  })

  it('ignores worker results that were invalidated by later input changes', async () => {
    const user = userEvent.setup()
    const previousWorker = globalThis.Worker

    class MockWorker {
      static instances: MockWorker[] = []

      messages: WorkerRequest[] = []

      private listeners: Array<(event: MessageEvent<WorkerResponse>) => void> = []

      constructor() {
        MockWorker.instances.push(this)
      }

      addEventListener(
        type: 'message',
        listener: (event: MessageEvent<WorkerResponse>) => void,
      ) {
        if (type === 'message') {
          this.listeners.push(listener)
        }
      }

      postMessage(message: WorkerRequest) {
        this.messages.push(message)
      }

      terminate() {
        // Test mock: nothing to release.
      }

      emit(data: WorkerResponse) {
        for (const listener of this.listeners) {
          listener({ data } as MessageEvent<WorkerResponse>)
        }
      }
    }

    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      value: MockWorker,
      writable: true,
    })

    try {
      render(<EquityMode displayMode="percent" embedded />)

      await waitFor(() => expect(MockWorker.instances).toHaveLength(1))

      await user.click(screen.getByRole('button', { name: 'Пересчитать equity' }))

      const worker = MockWorker.instances[0]
      expect(worker.messages).toHaveLength(1)

      const staleRequest = worker.messages[0]
      await user.click(screen.getByRole('button', { name: '2♣' }))

      expect(screen.getByText(/equity-цифры уже устарели/i)).toBeInTheDocument()

      await act(async () => {
        worker.emit({
          requestId: staleRequest.requestId,
          result: calculateEquity(
            staleRequest.heroInput,
            staleRequest.villainInput,
            staleRequest.boardSlots,
            staleRequest.iterations,
          ),
        })
      })

      expect(screen.getByText(/equity-цифры уже устарели/i)).toBeInTheDocument()
    } finally {
      if (previousWorker === undefined) {
        Reflect.deleteProperty(globalThis, 'Worker')
      } else {
        Object.defineProperty(globalThis, 'Worker', {
          configurable: true,
          value: previousWorker,
          writable: true,
        })
      }
    }
  })
})
