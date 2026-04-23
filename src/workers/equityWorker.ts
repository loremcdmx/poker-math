import { calculateEquity, type EquityInput, type EquityResult } from '../lib/equity'
import type { CardCode } from '../lib/combinatorics'

type EquityWorkerRequest = {
  boardSlots: Array<CardCode | ''>
  heroInput: EquityInput
  iterations: number
  requestId: number
  villainInput: EquityInput
}

type EquityWorkerResponse = {
  requestId: number
  result: EquityResult
}

self.addEventListener('message', (event: MessageEvent<EquityWorkerRequest>) => {
  const { boardSlots, heroInput, iterations, requestId, villainInput } = event.data

  const response: EquityWorkerResponse = {
    requestId,
    result: calculateEquity(heroInput, villainInput, boardSlots, iterations),
  }

  self.postMessage(response)
})

export {}
