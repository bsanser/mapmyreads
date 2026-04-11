import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock next/server ─────────────────────────────────────────────────────────

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status: number }) => ({
      _type: 'json',
      data,
      status: init?.status ?? 200,
    })),
  },
}))

// ─── Mock dependencies ────────────────────────────────────────────────────────

vi.mock('../../../../../lib/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    book: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    sessionBook: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { POST } from './route'
import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

const mockJson = NextResponse.json as ReturnType<typeof vi.fn>
const mockSessionFindUnique = prisma.session.findUnique as ReturnType<typeof vi.fn>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(books: unknown[], cookieUserId?: string) {
  return {
    json: async () => ({ books }),
    cookies: {
      get: (key: string) =>
        key === 'mmr_uid' && cookieUserId ? { value: cookieUserId } : undefined,
    },
  } as any
}

const params = { params: { uuid: 'test-session-uuid' } }

describe('POST /api/sessions/[uuid]/sync — ownership check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when session has a userId and no mmr_uid cookie', async () => {
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1', sessionId: 'test-session-uuid', userId: 'user-123' })

    const response = await POST(makeRequest([], undefined), params)

    expect(mockJson).toHaveBeenCalledWith({ error: 'Forbidden' }, { status: 403 })
    expect(response.status).toBe(403)
  })

  it('returns 403 when session has a userId and cookie does not match', async () => {
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1', sessionId: 'test-session-uuid', userId: 'user-123' })

    const response = await POST(makeRequest([], 'user-456'), params)

    expect(mockJson).toHaveBeenCalledWith({ error: 'Forbidden' }, { status: 403 })
    expect(response.status).toBe(403)
  })

  it('allows sync when session has no userId (anonymous session)', async () => {
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1', sessionId: 'test-session-uuid', userId: null })
    // Mock out the rest of the sync flow
    ;(prisma.book.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.book.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'book-1' })
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const response = await POST(makeRequest([], undefined), params)

    // Should NOT return 403
    expect(response.status).not.toBe(403)
    expect(mockJson).not.toHaveBeenCalledWith({ error: 'Forbidden' }, { status: 403 })
  })

  it('allows sync when cookie matches session owner', async () => {
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1', sessionId: 'test-session-uuid', userId: 'user-123' })
    ;(prisma.book.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.book.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'book-1' })
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const response = await POST(makeRequest([], 'user-123'), params)

    expect(response.status).not.toBe(403)
    expect(mockJson).not.toHaveBeenCalledWith({ error: 'Forbidden' }, { status: 403 })
  })

  it('returns 404 when session does not exist', async () => {
    mockSessionFindUnique.mockResolvedValue(null)

    const response = await POST(makeRequest([]), params)

    expect(mockJson).toHaveBeenCalledWith({ error: 'Session not found' }, { status: 404 })
    expect(response.status).toBe(404)
  })
})
