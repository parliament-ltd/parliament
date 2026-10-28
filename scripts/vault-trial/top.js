// The page's side of the trial: frames the vault, opens the private channel
// after the frame loads, and asks it to write, read, persist and stream.

const VAULT = 'http://localhost:5191'
const out = document.getElementById('out')
const say = (line) => { out.textContent += `${line}\n` }
say(`this page: ${location.origin}`)

const frame = document.getElementById('vault')
let port = null
let next = 1
const waiting = new Map()

frame.addEventListener('load', () => {
  const channel = new MessageChannel()
  port = channel.port1
  port.onmessage = (e) => {
    const m = e.data
    if (m.piece) { say(`  ${m.piece}`); return }
    const done = waiting.get(m.id)
    if (done) { waiting.delete(m.id); done(m) }
  }
  frame.contentWindow.postMessage('vault-trial:hello', VAULT, [channel.port2])
  say('channel offered to the vault')
})

const ask = (msg) => new Promise((resolve) => {
  const id = next++
  waiting.set(id, resolve)
  port.postMessage({ id, ...msg })
})

const act = {
  async write() {
    const value = `t-${Math.random().toString(36).slice(2, 8)}`
    const r = await ask({ kind: 'write', value })
    say(r.ok ? `wrote ${value}` : `write failed: ${r.error}`)
  },
  async read() {
    const r = await ask({ kind: 'read' })
    say(r.ok ? `read: ${JSON.stringify(r.value)}` : `read failed: ${r.error}`)
  },
  async persist() {
    const r = await ask({ kind: 'persist' })
    say(r.ok ? `persist: ${JSON.stringify(r.value)}` : `persist failed: ${r.error}`)
  },
  async stream() {
    say('stream, in pieces:')
    const r = await ask({ kind: 'stream' })
    say(r.ok ? 'stream ended' : `stream failed: ${r.error}`)
  },
  async transfer() {
    const r = await ask({ kind: 'transfer' })
    if (!r.ok) { say(`whole stream not passed: ${r.error}`); return }
    const reader = r.stream.getReader()
    let text = ''
    for (;;) { const { done, value } = await reader.read(); if (done) break; text += value }
    say(`whole stream passed: ${text}`)
  },
}
for (const [name, fn] of Object.entries(act)) {
  document.getElementById(name).addEventListener('click', () => { fn().catch((e) => say(`${name} error: ${e}`)) })
}
