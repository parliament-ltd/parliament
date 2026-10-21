// Dates in the Almanac, as the reader's language writes them: the day a
// thing was made ("21 Oct"), and how long ago it was last active ("2 hours
// ago", or the day once it is more than a week back).

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

const at = (iso) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : null
}

function format(make, locale) {
  try {
    return make(locale)
  } catch {
    return make('en')
  }
}

/** The day, with the year only when it is not this year's. */
export function dayOf(i18n, iso, now = Date.now()) {
  const t = at(iso)
  if (t == null) return ''
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear()
  const options = sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }
  return format((locale) => new Intl.DateTimeFormat(locale, options).format(t), i18n.locale)
}

/** How long ago: minutes, hours or days within a week, then the day. */
export function agoOf(i18n, iso, now = Date.now()) {
  const t = at(iso)
  if (t == null) return ''
  const diff = t - now
  const ago = Math.abs(diff)
  if (ago >= WEEK) return dayOf(i18n, iso, now)
  const [value, unit] = ago < MINUTE ? [0, 'second']
    : ago < HOUR ? [Math.round(diff / MINUTE), 'minute']
      : ago < DAY ? [Math.round(diff / HOUR), 'hour']
        : [Math.round(diff / DAY), 'day']
  return format((locale) => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit), i18n.locale)
}
