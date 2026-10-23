import { useEffect } from 'react'
import { useSettings } from '../stores/SettingsContext'
import { switchLanguage, languageFor } from '../i18n'

// The page's language follows the person's choice (language: or the globe;
// ruled 16 October; stage 9, piece 4; C184), wherever the page is. Unchosen,
// or chosen and no longer offered, it follows the browser's languages
// (i18n.js). Draws nothing.

export default function InterfaceLanguage() {
  const { settings } = useSettings()
  const chosen = settings.interfaceLanguage ?? null
  useEffect(() => { switchLanguage(languageFor(chosen)).catch(() => {}) }, [chosen])
  return null
}
