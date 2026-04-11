import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    magicToken: {
      count: vi.fn(),
    },
  },
}))

import { isEmailRateLimited } from './magicLink'
import { prisma } from './prisma'

const mockCount = prisma.magicToken.count as ReturnType<typeof vi.fn>

describe('isEmailRateLimited', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false when fewer than 3 tokens exist in the 30-min window', async () => {
    mockCount.mockResolvedValue(2)
    expect(await isEmailRateLimited('test@example.com')).toBe(false)
  })

  it('returns true when exactly 3 tokens exist in the window', async () => {
    mockCount.mockResolvedValue(3)
    expect(await isEmailRateLimited('test@example.com')).toBe(true)
  })

  it('returns true when more than 3 tokens exist', async () => {
    mockCount.mockResolvedValue(7)
    expect(await isEmailRateLimited('test@example.com')).toBe(true)
  })

  it('queries only unused tokens created in the last 30 minutes', async () => {
    mockCount.mockResolvedValue(0)
    await isEmailRateLimited('alice@example.com')

    expect(mockCount).toHaveBeenCalledOnce()
    const args = mockCount.mock.calls[0][0]
    expect(args.where.email).toBe('alice@example.com')
    expect(args.where.usedAt).toBeNull()
    expect(args.where.createdAt.gte).toBeInstanceOf(Date)

    // The gte date should be ~30 minutes ago (with some tolerance)
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000
    const queriedTime = args.where.createdAt.gte.getTime()
    expect(Math.abs(queriedTime - thirtyMinAgo)).toBeLessThan(1000)
  })
})
