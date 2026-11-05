import { describe, it, expect } from 'vitest'
import { systemOf, originsCommand, MODEL_COMMAND } from './localSetup'

// A model on this computer, set up in steps (C293).
describe('the local model\'s setup', () => {
  it('reads the system from the browser', () => {
    expect(systemOf({ userAgentData: { platform: 'Windows' } })).toBe('windows')
    expect(systemOf({ platform: 'MacIntel' })).toBe('mac')
    expect(systemOf({ userAgentData: { platform: 'macOS' } })).toBe('mac')
    expect(systemOf({ platform: 'Linux x86_64' })).toBe('other')
    expect(systemOf({})).toBe('other')
  })
  it('gives the one command that lets it answer this site only, where there is one', () => {
    expect(originsCommand('windows', 'https://www.parliament.ltd')).toBe('setx OLLAMA_ORIGINS "https://www.parliament.ltd"')
    expect(originsCommand('mac', 'https://www.parliament.ltd')).toBe('launchctl setenv OLLAMA_ORIGINS "https://www.parliament.ltd"')
    expect(originsCommand('other', 'https://www.parliament.ltd')).toBeNull()
    expect(originsCommand('windows', 'https://www.parliament.ltd')).not.toMatch(/\*/)
    expect(MODEL_COMMAND).toMatch(/^ollama pull /)
  })
})
