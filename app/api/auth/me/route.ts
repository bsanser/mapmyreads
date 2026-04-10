import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('mmr_uid')?.value

  if (!userId) {
    return NextResponse.json({ user: null })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ user: null, sessionUuid: null })
  }

  const session = await prisma.session.findFirst({
    where: { userId },
    orderBy: { lastSyncedAt: 'desc' },
    select: { sessionId: true },
  })

  return NextResponse.json({ user, sessionUuid: session?.sessionId ?? null })
}
