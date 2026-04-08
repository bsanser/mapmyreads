import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateMagicToken,
  isTokenExpired,
  createTokenRecord,
  sendMagicLinkEmail,
} from '../lib/magicLink'

// ─── generateMagicToken ───────────────────────────────────────────────────────

describe('generateMagicToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateMagicToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns a different token each call', () => {
    expect(generateMagicToken()).not.toBe(generateMagicToken())
  })
})

// ─── isTokenExpired ───────────────────────────────────────────────────────────

describe('isTokenExpired', () => {
  it('returns true for a date in the past', () => {
    const past = new Date(Date.now() - 1000)
    expect(isTokenExpired(past)).toBe(true)
  })

  it('returns false for a date in the future', () => {
    const future = new Date(Date.now() + 60_000)
    expect(isTokenExpired(future)).toBe(false)
  })
})

// ─── createTokenRecord ────────────────────────────────────────────────────────

describe('createTokenRecord', () => {
  it('returns a record with the provided email', () => {
    const record = createTokenRecord('user@example.com')
    expect(record.email).toBe('user@example.com')
  })

  it('sets expiresAt ~15 minutes from now', () => {
    const before = Date.now()
    const record = createTokenRecord('user@example.com')
    const after = Date.now()
    const expiresMs = record.expiresAt.getTime()
    expect(expiresMs).toBeGreaterThanOrEqual(before + 14 * 60 * 1000)
    expect(expiresMs).toBeLessThanOrEqual(after + 16 * 60 * 1000)
  })

  it('includes a 64-char hex token', () => {
    const record = createTokenRecord('user@example.com')
    expect(record.token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('stores sessionId when provided', () => {
    const record = createTokenRecord('user@example.com', 'sess-123')
    expect(record.sessionId).toBe('sess-123')
  })

  it('sets sessionId to null when omitted', () => {
    const record = createTokenRecord('user@example.com')
    expect(record.sessionId).toBeNull()
  })
})

// ─── sendMagicLinkEmail ───────────────────────────────────────────────────────

// Single shared mockSend so all tests reference the same spy
const mockSend = vi.fn().mockResolvedValue({ id: 'mock-email-id' })

vi.mock('resend', () => ({
  Resend: function MockResend() {
    return { emails: { send: mockSend } }
  },
}))

describe('sendMagicLinkEmail', () => {
  beforeEach(() => {
    mockSend.mockClear()
    process.env.NEXT_PUBLIC_APP_URL = 'https://mapmyreads.com'
    process.env.RESEND_API_KEY = 'test-key'
  })

  it('constructs a magic link URL containing the token', async () => {
    const token = 'abc123def456'
    await sendMagicLinkEmail('user@example.com', token)
    expect(mockSend).toHaveBeenCalledOnce()
    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.html).toContain(`/api/auth/verify?token=${token}`)
  })

  it('sets a descriptive subject line', async () => {
    await sendMagicLinkEmail('user@example.com', 'sometoken')
    const callArgs = mockSend.mock.calls[0][0]
    expect(typeof callArgs.subject).toBe('string')
    expect(callArgs.subject.length).toBeGreaterThan(0)
  })

  it('sends to the provided email address', async () => {
    await sendMagicLinkEmail('target@test.com', 'sometoken')
    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.to).toBe('target@test.com')
  })
})
