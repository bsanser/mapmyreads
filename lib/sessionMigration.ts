import { prisma } from './prisma'

/**
 * Claims an anonymous session for an authenticated user.
 * Sets Session.userId and Book.userId for all books in that session — in a single transaction.
 *
 * Throws 'session_not_found' if sessionId doesn't exist.
 * Throws 'session_already_claimed' if session belongs to a different user.
 * No-ops silently if session is already claimed by the same user.
 */
export async function claimSession(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { sessionId },
  })

  if (!session) throw new Error('session_not_found')
  if (session.userId && session.userId !== userId) throw new Error('session_already_claimed')
  if (session.userId === userId) return // already claimed by this user

  await prisma.$transaction(async (tx: any) => {
    await tx.session.update({
      where: { sessionId },
      data: { userId },
    })
    await tx.book.updateMany({
      where: {
        sessions: {
          some: { sessionId: session.id },
        },
      },
      data: { userId },
    })
  })
}
