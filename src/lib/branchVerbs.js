// to: and the branches of the slider on screen (refactor-plan.md, stage 8,
// piece 3; branch slider v9; the editing spec's to:; C174). Planned before
// Enter: what the Enter line says, and what Enter does. Pure.
//
//   to:201b          the next prompts carry 201b on, until changed
//   to:201a, 201c    those two, each carrying its own on
//   to:all           every branch of the prompt

const flat = (args = []) => args.flatMap((a) => (a.kind === 'list' ? a.items : [a]))

/**
 * to: (C174). screens.branching: { shown, held }: the slider on screen
 * (branchView.lastShown(): its group, chats, line and members, each
 * { chatId, letter, address, name }) and what to: holds now.
 */
export function planTo(step, screens = {}) {
  const b = screens.branching
  const shown = b?.shown ?? null
  if (!shown) return { says: { message: 'toNone' }, act: null }
  const args = step.match?.values ?? []
  const before = b.held?.groupId === shown.groupId ? b.held.chats : null
  let ids
  if (args.length === 1 && args[0].kind === 'word' && args[0].value === 'all') {
    ids = [...shown.chats]
  } else {
    ids = []
    for (const a of flat(args)) {
      const said = String(a.text ?? a.value ?? '').toLowerCase()
      const m = shown.members.find((x) => String(x.address ?? '').toLowerCase() === said)
      if (!m) return { says: { message: 'toNotHere', values: { address: said, nums: shown.members.map((x) => x.address).filter(Boolean) } }, act: null }
      if (!ids.includes(m.chatId)) ids.push(m.chatId)
    }
  }
  if (before && before.length === ids.length && before.every((x, i) => x === ids[i])) return { says: { message: 'toSame' }, act: null }
  const act = { kind: 'replyTo', groupId: shown.groupId, chats: ids, before }
  const addressOf = (id) => shown.members.find((x) => x.chatId === id)?.address ?? ''
  if (ids.length === shown.chats.length && ids.length > 1) return { says: { message: 'toAll', values: { count: ids.length } }, act }
  if (ids.length > 1) return { says: { message: 'toSome', values: { nums: ids.map(addressOf) } }, act }
  const one = shown.members.find((x) => x.chatId === ids[0])
  return { says: { message: 'toOne', values: { address: one?.address ?? '', name: one?.name ?? '' } }, act }
}
