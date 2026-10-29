import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import { ownNameOf, nameOf } from '../lib/languages'
import { MenuPanel, MenuColumns, MenuGroup, MenuRow, MenuFacts } from './Menu'
import { footOf } from './menus'

// The languages' picker (ruled 16 October; LPN §2.2; stage 9, piece 4;
// C184). Opened by a bare language: or the globe, under the field, and
// drawn as the ? reference is (29 October; Menu.jsx), one group. Each
// language by its own name, never a flag, with its name in the page's
// language beside it. A click runs language: as Enter would, so someone who
// cannot read the page can still pick theirs, and undo: has it.

/**
 * @param {{ items: Array<{ tag: string, draft: boolean }>, now: string, onPick: (tag: string) => void, onClose?: () => void }} props
 *   now: the page's language
 */
export default function LanguagePicker({ items, now, onPick, onClose = null }) {
  const { i18n } = useLingui()
  return (
    <MenuPanel
      className="ch-menu"
      title={i18n._(COPY.languagePicker.title)}
      foot={footOf(i18n._(COPY.languagePicker.foot), i18n._(COPY.languagePicker.keys), i18n._(COPY.shell.referenceClose))}
      onClose={onClose}
    >
      <MenuColumns>
        <MenuGroup>
          {items.map((l, i) => {
            const here = nameOf(l.tag, i18n.locale)
            const own = ownNameOf(l.tag)
            return (
              <MenuRow key={l.tag} on={l.tag === now} mark={i + 1} label={own} lang={l.tag} onClick={() => onPick(l.tag)}>
                {here !== own && here}
                <MenuFacts items={[l.draft && i18n._(COPY.languagePicker.draft)]} />
              </MenuRow>
            )
          })}
        </MenuGroup>
      </MenuColumns>
    </MenuPanel>
  )
}
