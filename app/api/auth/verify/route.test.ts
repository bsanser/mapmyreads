import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock next/server ─────────────────────────────────────────────────────────

vi.mock('next/server', () => {
  return {
    NextRequest: class {},
    NextResponse: {
      redirect: vi.fn((url: string) => ({ _type: 'redirect', url })),
      json: vi.fn((data: unknown) => ({ _type: 'json', data })),
    },
  }
})

// ─── Mock dependencies ────────────────────────────────────────────────────────

vi.mock('../../../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    magicToken: { update: vi.fn() },
  },
}))

vi.mock('../../../../lib/magicLink', () => ({
  verifyMagicToken: vi.fn(),
}))

vi.mock('../../../../lib/sessionMigration', () => ({
  claimSession: vi.fn(),
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { GET } from './route'
import { NextResponse } from 'next/server'
import { verifyMagicToken } from '../../../../lib/magicLink'
import { prisma } from '../../../../lib/prisma'

const mockRedirect = NextResponse.redirect as ReturnType<typeof vi.fn>
const mockVerifyToken = verifyMagicToken as ReturnType<typeof vi.fn>
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockUserCreate = prisma.user.create as ReturnType<typeof vi.fn>
const mockMagicTokenUpdate = prisma.magicToken.update as ReturnType<typeof vi.fn>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(token?: string) {
  const params = new URLSearchParams()
  if (token) params.set('token', token)
  return {
    nextUrl: { searchParams: params },
  } as any
}

describe('GET /api/auth/verify — auth_error normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects with invalid_or_expired (not not_found) when token param is missing', async () => {
    await GET(makeRequest())

    expect(mockRedirect).toHaveBeenCalledOnce()
    const url: string = mockRedirect.mock.calls[0][0]
    expect(url).toContain('auth_error=invalid_or_expired')
    expect(url).not.toContain('auth_error=not_found')
  })

  it('redirects with invalid_or_expired (not expired) when token is expired', async () => {
    mockVerifyToken.mockResolvedValue({ valid: false, reason: 'expired' })

    await GET(makeRequest('some-token'))

    expect(mockRedirect).toHaveBeenCalledOnce()
    const url: string = mockRedirect.mock.calls[0][0]
    expect(url).toContain('auth_error=invalid_or_expired')
    expect(url).not.toContain('auth_error=expired')
  })

  it('redirects with invalid_or_expired (not used) when token was already used', async () => {
    mockVerifyToken.mockResolvedValue({ valid: false, reason: 'used' })

    await GET(makeRequest('some-token'))

    expect(mockRedirect).toHaveBeenCalledOnce()
    const url: string = mockRedirect.mock.calls[0][0]
    expect(url).toContain('auth_error=invalid_or_expired')
    expect(url).not.toContain('auth_error=used')
  })

  it('redirects with invalid_or_expired (not not_found) when token does not exist in DB', async () => {
    mockVerifyToken.mockResolvedValue({ valid: false, reason: 'not_found' })

    await GET(makeRequest('unknown-token'))

    expect(mockRedirect).toHaveBeenCalledOnce()
    const url: string = mockRedirect.mock.calls[0][0]
    expect(url).toContain('auth_error=invalid_or_expired')
    expect(url).not.toContain('auth_error=not_found')
  })

  it('sets auth cookie and redirects to / on valid token', async () => {
    mockVerifyToken.mockResolvedValue({ valid: true, email: 'test@example.com', sessionId: null })
    const mockUser = { id: 'user-123', emailVerified: new Date() }
    mockUserFindUnique.mockResolvedValue(mockUser)
    mockMagicTokenUpdate.mockResolvedValue({})

    // NextResponse.redirect returns an object; simulate cookies.set
    const fakeResponse = { url: 'http://localhost:3000/', cookies: { set: vi.fn() } }
    mockRedirect.mockReturnValue(fakeResponse)

    const response = await GET(makeRequest('valid-token'))

    expect(response).toBe(fakeResponse)
    expect(fakeResponse.cookies.set).toHaveBeenCalledWith(
      'mmr_uid',
      'user-123',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    )
  })
})
