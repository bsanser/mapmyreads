import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    // Validate sessionId is provided and is a valid UUID
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(sessionId)) {
      return NextResponse.json(
        { error: 'sessionId must be a valid UUID' },
        { status: 400 }
      )
    }

    // Create session, falling back to findUnique on concurrent duplicate inserts
    let session
    try {
      session = await prisma.session.upsert({
        where: { sessionId },
        update: {},
        create: { sessionId },
      })
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Unique constraint — session was created by a concurrent request, just fetch it
        session = await prisma.session.findUnique({ where: { sessionId } })
      } else {
        throw e
      }
    }

    if (!session) throw new Error('Session not found after upsert conflict')

    return NextResponse.json({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
    })
  } catch (error) {
    console.error('POST /api/sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to create or retrieve session' },
      { status: 500 }
    )
  }
}
