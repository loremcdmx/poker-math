import {
  cardSuits,
  rangeRanks,
  type CardCode,
  type CardSuit,
} from '../lib/combinatorics'

const suitGlyphMap = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
} as const

const suitLabelMap: Record<CardSuit, string> = {
  c: 'Трефы',
  d: 'Бубны',
  h: 'Червы',
  s: 'Пики',
}

const boardLabels = ['Флоп 1', 'Флоп 2', 'Флоп 3', 'Тёрн', 'Ривер'] as const

type BoardPickerProps = {
  ariaLabel?: string
  boardCards: Array<CardCode | ''>
  boardSummary: string
  isCardDisabled?: (card: CardCode) => boolean
  onClearBoard: () => void
  onClearSlot: (slotIndex: number) => void
  onToggleCard: (card: CardCode) => void
}

function formatCard(card: CardCode) {
  return `${card[0]}${suitGlyphMap[card[1] as keyof typeof suitGlyphMap]}`
}

function getCardTone(card: CardCode) {
  return card[1] === 'h' || card[1] === 'd' ? 'red' : 'dark'
}

export function BoardPicker({
  ariaLabel = 'Board picker',
  boardCards,
  boardSummary,
  isCardDisabled,
  onClearBoard,
  onClearSlot,
  onToggleCard,
}: BoardPickerProps) {
  const selectedCards = new Set(boardCards.filter((card): card is CardCode => card !== ''))
  const firstEmptyBoardSlot = boardCards.indexOf('')
  const boardFull = firstEmptyBoardSlot === -1
  const hasBoardCards = selectedCards.size > 0

  return (
    <div className="board-picker-panel" aria-label={ariaLabel}>
      <div className="board-picker-header">
        <div className="board-picker-active">
          <p className="board-picker-kicker">Выбранный борд</p>
          <strong>{boardSummary}</strong>
        </div>
        <div className="board-picker-actions">
          <button
            aria-label="Очистить борд"
            className="mode-chip"
            disabled={!hasBoardCards}
            onClick={onClearBoard}
            type="button"
          >
            Очистить
          </button>
        </div>
      </div>

      <div className="board-slots" role="group" aria-label="Board slots">
        {boardLabels.map((label, index) => {
          const card = boardCards[index]
          const filled = card !== ''
          const isNext = !filled && firstEmptyBoardSlot === index

          return (
            <button
              aria-label={filled ? `${label}: ${formatCard(card)} — убрать` : `${label} — пусто`}
              className={`board-slot${filled ? ' filled' : ''}${isNext ? ' next' : ''}`}
              key={label}
              onClick={() => onClearSlot(index)}
              type="button"
            >
              <span className="board-slot-label">{label}</span>
              {filled ? (
                <span className={`board-slot-card ${getCardTone(card)}`}>{formatCard(card)}</span>
              ) : (
                <span aria-hidden="true" className="board-slot-card empty">
                  —
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="card-picker" role="group" aria-label="Card picker">
        {cardSuits.map((suit) => (
          <div className="card-picker-row" key={suit}>
            <span
              className={`card-picker-suit ${suit === 'h' || suit === 'd' ? 'red' : 'dark'}`}
            >
              {suitGlyphMap[suit]}
              <span className="visually-hidden">{suitLabelMap[suit]}</span>
            </span>
            {rangeRanks.map((rank) => {
              const card = `${rank}${suit}` as CardCode
              const selected = selectedCards.has(card)
              const disabled = !selected && (boardFull || Boolean(isCardDisabled?.(card)))

              return (
                <button
                  aria-label={`${formatCard(card)}${selected ? ' выбрано' : ''}`}
                  aria-pressed={selected}
                  className={`card-picker-cell ${getCardTone(card)}${
                    selected ? ' selected' : ''
                  }${disabled ? ' disabled' : ''}`}
                  disabled={disabled}
                  key={card}
                  onClick={() => onToggleCard(card)}
                  type="button"
                >
                  {rank}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <p className="combo-board-hint" aria-live="polite">
        {hasBoardCards
          ? 'Клик по выбранной карте или слоту убирает её. Новая карта попадает в первый пустой слот.'
          : 'Выбери 3 карты флопа, потом тёрн и ривер. Сетка ниже сама подсветит выбранные карты.'}
      </p>
    </div>
  )
}
