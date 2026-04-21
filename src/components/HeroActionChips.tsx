type HeroActionChip = {
  href?: string
  label: string
  onClick?: () => void
}

type HeroActionChipsProps = {
  ariaLabel: string
  items: HeroActionChip[]
}

export function HeroActionChips({ ariaLabel, items }: HeroActionChipsProps) {
  return (
    <nav className="hero-tags" aria-label={ariaLabel}>
      {items.map((item) =>
        item.onClick ? (
          <button className="hero-chip" key={item.label} onClick={item.onClick} type="button">
            {item.label}
          </button>
        ) : (
          <a className="hero-chip" href={item.href} key={item.label}>
            {item.label}
          </a>
        ),
      )}
    </nav>
  )
}
