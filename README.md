# Poker FE Compass

Небольшой учебный калькулятор по покерной математике:

- считает `breakeven fold equity` для чистого блефа;
- показывает `call odds` для оппонента;
- переводит bet sizing в `value : bluff` ratio;
- отдельно показывает `bluff share` в betting range, чтобы не путать его с FE;
- умеет переключать отображение bet size между процентами и дробями.

## Формулы

- `FE = Bet / (Pot + Bet)`
- `Call odds = (Pot + Bet) : Bet`
- `Value : Bluff = (Pot + Bet) : Bet`
- `Bluff share = Bet / (Pot + 2 * Bet)`
- `MDF = Pot / (Pot + Bet)`

Примеры:

- `1/2 pot -> 33.3% FE, 3:1 value:bluff`
- `1 pot -> 50% FE, 2:1 value:bluff`
- `2x pot -> 66.7% FE, 3:2 value:bluff`

## Local Run

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```
