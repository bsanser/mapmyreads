import { prisma } from './prisma'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function upsertSession(sessionId: string) {
  // Validate UUID format
  if (!sessionId || typeof sessionId !== 'string' || !UUID_REGEX.test(sessionId)) {
    throw new Error('Invalid sessionId: must be a valid UUID')
  }

  // Create session (simple version for testing)
  const session = await prisma.session.create({
    data: {
      sessionId: sessionId,
    },
  })

  return {
    id: session.id,
    sessionId: session.sessionId,
    createdAt: session.createdAt,
  }
}
