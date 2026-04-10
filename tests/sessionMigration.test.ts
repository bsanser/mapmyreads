import { describe, it, expect, vi, beforeEach } from 'vitest'
import { claimSession } from '../lib/sessionMigration'

// ─── Mock Prisma ────────────────────────────────────────────────────────────

const mockFindUnique = vi.fn()
const mockSessionUpdate = vi.fn().mockResolvedValue(undefined)
const mockBookUpdateMany = vi.fn().mockResolvedValue({ count: 0 })

const mockTx = {
  session: { update: (...args: any[]) => mockSessionUpdate(...args) },
  book: { updateMany: (...args: any[]) => mockBookUpdateMany(...args) },
}

vi.mock('../lib/prisma', () => ({
  prisma: {
    session: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
    $transaction: (fn: any) => fn(mockTx),
  },
}))

// ─── claimSession ───────────────────────────────────────────────────────────

describe('claimSession', () => {
  beforeEach(() => {
    mockFindUnique.mockReset()
    mockSessionUpdate.mockReset().mockResolvedValue(undefined)
    mockBookUpdateMany.mockReset().mockResolvedValue({ count: 0 })
  })

  it('claims an unclaimed session and updates book ownership', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'session-internal-id',
      sessionId: 'abc-uuid',
      userId: null,
    })

    await expect(claimSession('abc-uuid', 'user-123')).resolves.not.toThrow()

    // Should look up session by UUID
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { sessionId: 'abc-uuid' },
    })

    // Should update session ownership
    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { sessionId: 'abc-uuid' },
      data: { userId: 'user-123' },
    })

    // Should update book ownership for all books in that session
    expect(mockBookUpdateMany).toHaveBeenCalledWith({
      where: { sessions: { some: { sessionId: 'session-internal-id' } } },
      data: { userId: 'user-123' },
    })
  })

  it('throws "session_not_found" for a non-existent session', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(claimSession('nonexistent-uuid', 'user-123'))
      .rejects.toThrow('session_not_found')
  })

  it('throws "session_already_claimed" when claimed by a different user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'session-internal-id',
      sessionId: 'abc-uuid',
      userId: 'other-user',
    })

    await expect(claimSession('abc-uuid', 'user-123'))
      .rejects.toThrow('session_already_claimed')
  })

  it('succeeds silently if session is already claimed by the same user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'session-internal-id',
      sessionId: 'abc-uuid',
      userId: 'user-123',
    })

    // No updates needed — already owned
    await expect(claimSession('abc-uuid', 'user-123')).resolves.not.toThrow()
    expect(mockSessionUpdate).not.toHaveBeenCalled()
    expect(mockBookUpdateMany).not.toHaveBeenCalled()
  })
})
