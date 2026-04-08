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

    // Upsert session: create if not exists, return existing if it does
    const session = await prisma.session.upsert({
      where: { sessionId: sessionId },
      update: {}, // No updates needed on existing sessions
      create: { sessionId: sessionId },
    })

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
