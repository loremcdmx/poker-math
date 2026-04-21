export type DisplayMode = 'percent' | 'fraction'
export type PotInputMode = 'clean' | 'client'
export type IgorInventoryMode = 'value' | 'bluff'

export type Fraction = {
  numerator: number
  denominator: number
}

export const quickPresetSizes = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.25, 1.5, 2]
export const igorLadderBets = [10, 20, 25, 33, 40, 50, 66, 70, 75, 100, 125, 150, 175, 200, 250]

function greatestCommonDivisor(a: number, b: number) {
  let x = Math.abs(a)
  let y = Math.abs(b)

  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }

  return x || 1
}

export function simplifyFraction(numerator: number, denominator: number): Fraction {
  const safeDenominator = denominator || 1
  const divisor = greatestCommonDivisor(numerator, safeDenominator)

  return {
    numerator: numerator / divisor,
    denominator: safeDenominator / divisor,
  }
}

export function approximateFraction(value: number, maxDenominator = 16): Fraction {
  let best = simplifyFraction(Math.round(value), 1)
  let smallestError = Math.abs(value - best.numerator / best.denominator)

  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator)

    if (numerator === 0) {
      continue
    }

    const error = Math.abs(value - numerator / denominator)

    if (error < smallestError) {
      smallestError = error
      best = simplifyFraction(numerator, denominator)
    }
  }

  return best
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function sanitizeNumber(value: number, fallback: number, min = 0.01, max = 100000) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback
  }

  return clamp(value, min, max)
}

export function calculateMetrics(betMultiple: number) {
  const safeBetMultiple = Math.max(0.0001, betMultiple)
  const betFraction = approximateFraction(safeBetMultiple)
  const breakEvenFe = safeBetMultiple / (1 + safeBetMultiple)
  const bluffShare = safeBetMultiple / (1 + 2 * safeBetMultiple)
  const mdf = 1 / (1 + safeBetMultiple)
  const feFraction = simplifyFraction(
    betFraction.numerator,
    betFraction.denominator + betFraction.numerator,
  )
  const valueToBluff = simplifyFraction(
    betFraction.denominator + betFraction.numerator,
    betFraction.numerator,
  )

  return {
    betFraction,
    breakEvenFe,
    bluffShare,
    mdf,
    feFraction,
    valueToBluff,
  }
}

export function calculateIgorInventory(
  potInput: number,
  bet: number,
  potInputMode: PotInputMode,
  knownMode: IgorInventoryMode,
  knownCount: number,
) {
  const safeBet = Math.max(0.01, bet)
  const safePotInput = Math.max(potInputMode === 'client' ? safeBet + 0.01 : 0.01, potInput)
  const safePot = potInputMode === 'client' ? safePotInput - safeBet : safePotInput
  const safeCount = Math.max(0, knownCount)
  const bluffPerValue = safeBet / (safePot + safeBet)
  const valuePerBluff = (safePot + safeBet) / safeBet
  const oddsPercent = safeBet / (safePot + safeBet + safeBet)
  const bluffShareTotal = safeBet / (safePot + safeBet + safeBet)
  const valueCount = knownMode === 'value' ? safeCount : safeCount * valuePerBluff
  const bluffCount = knownMode === 'bluff' ? safeCount : safeCount * bluffPerValue

  return {
    safePotInput,
    safePot,
    safeBet,
    safeCount,
    clientPot: safePot + safeBet,
    bluffPerValue,
    valuePerBluff,
    oddsPercent,
    bluffShareTotal,
    valueCount,
    bluffCount,
    betPercentOfPot: safeBet / safePot,
  }
}

export function calculateRaiseMetrics(potBefore: number, villainBet: number, heroRaiseTotal: number) {
  const safePotBefore = Math.max(0.01, potBefore)
  const safeVillainBet = Math.max(0.01, villainBet)
  const safeRaiseTotal = Math.max(safeVillainBet, heroRaiseTotal)
  const callAmount = Math.max(0, safeRaiseTotal - safeVillainBet)
  const immediateWin = safePotBefore + safeVillainBet
  const finalPotIfCall = safePotBefore + safeRaiseTotal + safeRaiseTotal
  const feNeeded = safeRaiseTotal / (safePotBefore + safeVillainBet + safeRaiseTotal)
  const callerEqRequired = callAmount / finalPotIfCall

  return {
    safePotBefore,
    safeVillainBet,
    safeRaiseTotal,
    callAmount,
    feNeeded,
    callerEqRequired,
    immediateWin,
    finalPotIfCall,
  }
}

export function calculateBluffWithEquity(pot: number, bet: number, equityPercent: number) {
  const safePot = Math.max(0.01, pot)
  const safeBet = Math.max(0.01, bet)
  const safeEquity = clamp(equityPercent / 100, 0, 1)
  const calledEv = safeEquity * (safePot + safeBet + safeBet) - safeBet
  const pureFe = safeBet / (safePot + safeBet)
  const feWithEquityRaw = calledEv >= 0 ? 0 : -calledEv / (safePot - calledEv)
  const feWithEquity = clamp(feWithEquityRaw, 0, 1)
  const savedFe = Math.max(0, pureFe - feWithEquity)
  const noFoldEquity = safeBet / (safePot + safeBet + safeBet)

  return {
    safeEquity,
    calledEv,
    pureFe,
    feWithEquity,
    savedFe,
    noFoldEquity,
  }
}
