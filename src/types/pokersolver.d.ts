declare module 'pokersolver' {
  export type SolvedHand = {
    descr: string
    name: string
    rank: number
  }

  export const Hand: {
    solve(cards: string[]): SolvedHand
    winners(hands: SolvedHand[]): SolvedHand[]
  }
}
