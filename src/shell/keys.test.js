import { describe, it, expect } from 'vitest'
import { barKey, isTextField, hintFor, modKey } from './keys'

describe('the keys that reach the bar', () => {
  it('Cmd/Ctrl+K opens the field from anywhere, text fields included', () => {
    expect(barKey({ key: 'k', ctrlKey: true })).toBe('open')
    expect(barKey({ key: 'K', metaKey: true }, { inTextField: true })).toBe('open')
    expect(barKey({ key: 'k', ctrlKey: true, shiftKey: true })).toBeNull()
  })

  it('/ jumps to the field only when no other text field has focus', () => {
    expect(barKey({ key: '/' })).toBe('focus')
    expect(barKey({ key: '/' }, { inTextField: true })).toBeNull()
    expect(barKey({ key: '/' }, { inBar: true })).toBeNull()
    expect(barKey({ key: '/', ctrlKey: true })).toBeNull()
  })

  it('Escape belongs to the field when focus is in it', () => {
    expect(barKey({ key: 'Escape' }, { inBar: true })).toBe('escape')
    expect(barKey({ key: 'Escape' })).toBeNull()
  })

  it('nothing fires while an input method is composing', () => {
    expect(barKey({ key: 'k', ctrlKey: true, isComposing: true })).toBeNull()
    expect(barKey({ key: '/', isComposing: true })).toBeNull()
  })
})

describe('text fields', () => {
  it('are inputs that take text, text areas and editable regions', () => {
    expect(isTextField({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTextField({ tagName: 'INPUT', type: 'text' })).toBe(true)
    expect(isTextField({ tagName: 'INPUT', type: 'password' })).toBe(true)
    expect(isTextField({ tagName: 'INPUT', type: 'checkbox' })).toBe(false)
    expect(isTextField({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(isTextField({ tagName: 'BUTTON' })).toBe(false)
    expect(isTextField(null)).toBe(false)
  })
})

describe('the hint line', () => {
  it('names only the keys that work where focus is', () => {
    expect(hintFor({})).toBe('slashOrK')
    expect(hintFor({ inTextField: true })).toBe('kOnly')
  })

  it('writes the modifier as this computer does', () => {
    expect(modKey({ userAgentData: { platform: 'macOS' } })).toBe('⌘')
    expect(modKey({ platform: 'MacIntel' })).toBe('⌘')
    expect(modKey({ userAgentData: { platform: 'Windows' } })).toBe('Ctrl')
    expect(modKey({ platform: 'Linux x86_64' })).toBe('Ctrl')
    expect(modKey({})).toBe('Ctrl')
  })
})
