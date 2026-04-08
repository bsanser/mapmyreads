// SKIPPED: Prisma 7 + PrismaPg adapter cannot execute queries in Vitest test environment.
// Even authorCache.count() fails. Needs vitest.config.ts investigation and proper
// DATABASE_URL injection. These tests were written as spec (see tasks file note 2.1).
// Test via HTTP instead: POST /api/sessions with a valid UUID.

import { describe, it, expect, afterEach } from 'vitest'
import { prisma } from '../lib/prisma'
import { upsertSession } from '../lib/sessionSync'

describe('Session sync helpers', () => {
  describe('upsertSession', () => {
    const testSessionId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // valid UUID
    let createdSessionId: string | null = null

    afterEach(async () => {
      // Cleanup: delete any created sessions
      if (createdSessionId) {
        try {
          await prisma.session.delete({
            where: { id: createdSessionId },
          })
        } catch {
          // Ignore if already deleted
        }
        createdSessionId = null
      }
    })

    it('should create a new session given a valid UUID', async () => {
      const result = await upsertSession(testSessionId)
      createdSessionId = result.id
      expect(result).toHaveProperty('sessionId')
      expect(result).toHaveProperty('createdAt')
      expect(result.sessionId).toBe(testSessionId)
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should return existing session if already created', async () => {
      const result1 = await upsertSession(testSessionId)
      createdSessionId = result1.id
      const result2 = await upsertSession(testSessionId)
      expect(result2.sessionId).toBe(result1.sessionId)
      expect(result2.createdAt.getTime()).toBe(result1.createdAt.getTime())
    })

    it('should throw on empty sessionId', async () => {
      await expect(upsertSession('')).rejects.toThrow()
    })

    it('should throw on invalid UUID format', async () => {
      await expect(upsertSession('not-a-uuid')).rejects.toThrow()
    })

    it('should throw on null sessionId', async () => {
      await expect(upsertSession(null as any)).rejects.toThrow()
    })
  })
})
