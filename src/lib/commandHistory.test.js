import 'fake-indexeddb/auto'
import { maybeSealed } from './__fixtures__/sealedHarness'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import { keepable, keepCommand, readCommands, stepRecall } from './commandHistory'
import { FIELDS } from './backupSchema'

const open = async (version) => maybeSealed(await openDB('history-test', version, { upgrade: upgradeSchema }))
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 20, 12, 0, clock++)).toISOString()

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  clock = 0
})

describe('what the history keeps', () => {
  it('keeps commands', () => {
    expect(keepable('bar:bottom')).toBe('bar:bottom')
    expect(keepable('  open:207 pop:library ')).toBe('open:207 pop:library')
    expect(keepable('name:"Q2 evidence"')).toBe('name:"Q2 evidence"')
  })

  it('never keeps a line shaped like a key', () => {
    expect(keepable('api:anthropic sk-ant-api03-abc')).toBeNull()
    expect(keepable('api:mistral 8fQ2kLmN0pR4sT6uV8wX0yZ2aB4cD6eF')).toBeNull()
  })

  it('never keeps the writing a command carries', () => {
    expect(keepable('note:203 "Try it without the ending"')).toBeNull()
    expect(keepable('bar:bottom tell:keep it short')).toBeNull()
  })

  it('keeps nothing that is not a command', () => {
    expect(keepable('')).toBeNull()
    expect(keepable('water tower')).toBeNull()
    expect(keepable('?')).toBeNull()
    expect(keepable('frobnicate:207')).toBeNull()
    expect(keepable('rename:"x"')).toBeNull()
    expect(keepable(`tag:${'x'.repeat(600)}`)).toBeNull()
  })
})

describe('the history at version 6', () => {
  let db
  beforeEach(async () => { db = await open(6) })
  afterEach(() => db.close())

  it('keeps lines that ran, newest first', async () => {
    await keepCommand(db, 'bar:bottom', { now: at() })
    await keepCommand(db, 'open:207', { now: at() })
    expect(await readCommands(db)).toEqual(['open:207', 'bar:bottom'])
  })

  it('keeps a line run twice in a row once', async () => {
    await keepCommand(db, 'bar:bottom', { now: at() })
    await keepCommand(db, 'bar:bottom', { now: at() })
    await keepCommand(db, 'open:207', { now: at() })
    await keepCommand(db, 'bar:bottom', { now: at() })
    expect(await readCommands(db)).toEqual(['bar:bottom', 'open:207', 'bar:bottom'])
  })

  it('refuses what it must not keep, and writes nothing', async () => {
    expect(await keepCommand(db, 'note:"private thought"')).toBeNull()
    expect(await keepCommand(db, 'api:anthropic sk-ant-xyz')).toBeNull()
    expect(await db.count('commandHistory')).toBe(0)
  })

  it('holds the last lines only', async () => {
    for (let i = 0; i < 8; i++) await keepCommand(db, `jump:${201 + i}`, { now: at(), limit: 5 })
    expect(await readCommands(db)).toEqual(['jump:208', 'jump:207', 'jump:206', 'jump:205', 'jump:204'])
  })
})

describe('backups', () => {
  it('never carry the history: it is not on the allowlist', () => {
    expect(Object.keys(FIELDS)).not.toContain('commandHistory')
  })
})

describe('at version 5', () => {
  it('keeps nothing, since the list does not exist yet', async () => {
    const db = await open(5)
    expect(await keepCommand(db, 'bar:bottom')).toBeNull()
    expect(await readCommands(db)).toEqual([])
    db.close()
  })
})

describe('walking back with the arrow keys', () => {
  const lines = ['open:207', 'bar:bottom', 'pop:library']

  it('goes back from the newest, and keeps the line being typed', () => {
    let walk = { lines, index: -1, draft: '' }
    walk = stepRecall(walk, 'up', 'clo')
    expect(walk).toMatchObject({ index: 0, value: 'open:207', draft: 'clo' })
    walk = stepRecall(walk, 'up', walk.value)
    expect(walk.value).toBe('bar:bottom')
    walk = stepRecall(walk, 'up', walk.value)
    walk = stepRecall(walk, 'up', walk.value)
    expect(walk).toMatchObject({ index: 2, value: 'pop:library' })
  })

  it('brings the line being typed back past the newest', () => {
    let walk = stepRecall({ lines, index: -1, draft: '' }, 'up', 'clo')
    walk = stepRecall(walk, 'down', walk.value)
    expect(walk).toMatchObject({ index: -1, value: 'clo' })
    walk = stepRecall(walk, 'down', walk.value)
    expect(walk).toMatchObject({ index: -1, value: 'clo' })
  })

  it('does nothing with an empty history', () => {
    expect(stepRecall({ lines: [], index: -1, draft: '' }, 'up', 'x').value).toBe('x')
  })
})
