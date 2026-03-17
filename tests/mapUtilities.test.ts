import { describe, it, expect } from 'vitest'
import { mapISO2ToDisplayName, mapDisplayNameToISO2, getCountryFlag } from '../lib/mapUtilities'

describe('mapISO2ToDisplayName', () => {
  it('returns the display name for a known ISO2 code', () => {
    expect(mapISO2ToDisplayName('US')).toBe('United States')
  })

  it('returns the input unchanged for an unknown code', () => {
    expect(mapISO2ToDisplayName('ZZ')).toBe('ZZ')
  })
})

describe('mapDisplayNameToISO2', () => {
  it('returns the ISO2 code for a known display name', () => {
    expect(mapDisplayNameToISO2('United States')).toBe('US')
  })

  it('returns the input unchanged for an unknown name', () => {
    expect(mapDisplayNameToISO2('Narnia')).toBe('Narnia')
  })
})

describe('getCountryFlag', () => {
  it('returns the US flag emoji for US', () => {
    expect(getCountryFlag('US')).toBe('🇺🇸')
  })

  it('returns the French flag emoji for FR', () => {
    expect(getCountryFlag('FR')).toBe('🇫🇷')
  })
})
