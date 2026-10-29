// The menus under the bar, drawn as the ? reference is (C279 (f); ruled by
// Stefan on 29 October: "for all menus, the same design layout as the
// command bar layout"). One panel as wide as the stage under the bar, and
// above it with the bar at the bottom; an uppercase heading with a hairline;
// groups flowing into as many columns as fit, a group never split; each row
// a name and what it is, in two aligned columns; the keys at the foot.
//
// The ? reference, the command menu board, who answers, where a reply goes,
// the frameworks and the languages are all drawn from these, so they stay
// alike. The classes are the reference's (chrome.css, .ch-ref); a menu adds
// .ch-menu for the box in front of each name. Escape closes the panel from
// a row in it, as it does from the field.

/**
 * @param {{ title: string, name?: string, aside?: import('react').ReactNode, foot: import('react').ReactNode,
 *   className?: string, onClose?: (() => void)|null, children: import('react').ReactNode }} props
 *   name: what a screen reader calls the panel, the title unless given
 */
export function MenuPanel({ title, name = title, aside = null, foot, className = '', onClose = null, children }) {
  const onKeyDown = (e) => {
    if (e.key !== 'Escape' || !onClose) return
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }
  return (
    <section className={className ? `ch-ref ${className}` : 'ch-ref'} aria-label={name} onKeyDown={onKeyDown}>
      <header className="ch-ref-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
      <p className="ch-ref-foot">{foot}</p>
    </section>
  )
}

/** The groups, flowing into as many 318px columns as fit (four at most). */
export function MenuColumns({ children }) {
  return <div className="ch-ref-cols">{children}</div>
}

/**
 * One group: its heading in capitals over a hairline, and its rows. With no
 * title, the rows alone, for a menu of one group whose panel names it.
 * @param {{ title?: string|null, aside?: import('react').ReactNode, children: import('react').ReactNode }} props
 *   aside: marginalia at the heading's end, such as "no tokens, no key"
 */
export function MenuGroup({ title = null, aside = null, children }) {
  return (
    <div className="ch-ref-grp" role={title ? 'group' : undefined} aria-label={title ?? undefined}>
      {title && <h3>{title}{aside}</h3>}
      {children}
    </div>
  )
}

/**
 * A row of a menu: a box, the name, and what it is. The box is ticked in
 * ink, with its place in the order where the order matters; round for one
 * choice of two. A row is a button, so Tab reaches it and Enter or Space
 * presses it; it keeps the caret in the field when clicked.
 * @param {{ on?: boolean, mark?: string|number, round?: boolean, faint?: boolean, later?: boolean,
 *   title?: string, label: import('react').ReactNode, lang?: string, onClick: () => void,
 *   children?: import('react').ReactNode }} props
 *   mark: what the box shows, such as its place; faint: waits for a key; later: not built yet, and does nothing
 */
export function MenuRow({ on = false, mark = '', round = false, faint = false, later = false, title, label, lang, onClick, children = null }) {
  return (
    <button
      type="button"
      className={`ch-ref-row${on ? ' on' : ''}${faint || later ? ' faint' : ''}${later ? ' later' : ''}`}
      aria-pressed={on}
      aria-disabled={later || undefined}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span className="ch-menu-lab">
        <span className={`ch-menu-box${round ? ' round' : ''}`} aria-hidden="true">{mark}</span>
        <span dir="auto" lang={lang}>{label}</span>
      </span>
      <span className="gloss">{children}</span>
    </button>
  )
}

/**
 * Facts under what a row is for, a dot between: a cost, what is done with
 * what it is sent. One given as { text, warn } is in ink.
 * @param {{ items: Array<string|{ text: string, warn?: boolean }> }} props
 */
export function MenuFacts({ items }) {
  const list = items.filter(Boolean)
  if (!list.length) return null
  return (
    <span className="ch-menu-facts">
      {list.map((it, i) => {
        const text = typeof it === 'string' ? it : it.text
        return (
          <span key={`${i}-${text}`} className={typeof it === 'object' && it.warn ? 'warn' : undefined}>
            {i > 0 && <span className="sep" aria-hidden="true">·</span>}
            {text}
          </span>
        )
      })}
    </span>
  )
}
