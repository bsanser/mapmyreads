import { describe, it, expect } from 'vitest'
import { normalizeAuthError, validateSessionOwnership } from './security'

describe('normalizeAuthError', () => {
  it('collapses not_found to invalid_or_expired', () => {
    expect(normalizeAuthError('not_found')).toBe('invalid_or_expired')
  })

  it('collapses expired to invalid_or_expired', () => {
    expect(normalizeAuthError('expired')).toBe('invalid_or_expired')
  })

  it('collapses used to invalid_or_expired', () => {
    expect(normalizeAuthError('used')).toBe('invalid_or_expired')
  })

  it('collapses any unexpected reason to invalid_or_expired', () => {
    expect(normalizeAuthError('something_else')).toBe('invalid_or_expired')
  })
})

describe('validateSessionOwnership', () => {
  it('allows sync for anonymous sessions (no userId on session)', () => {
    expect(validateSessionOwnership(null, null)).toBe(true)
    expect(validateSessionOwnership(null, 'some-user')).toBe(true)
  })

  it('allows sync when cookie matches session owner', () => {
    expect(validateSessionOwnership('user-123', 'user-123')).toBe(true)
  })

  it('rejects sync when cookie does not match session owner', () => {
    expect(validateSessionOwnership('user-123', 'user-456')).toBe(false)
  })

  it('rejects sync when session has owner but no cookie present', () => {
    expect(validateSessionOwnership('user-123', null)).toBe(false)
  })
})
