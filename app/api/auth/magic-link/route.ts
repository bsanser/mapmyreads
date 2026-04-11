import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { createTokenRecord, sendMagicLinkEmail, isEmailRateLimited } from '../../../../lib/magicLink'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, sessionId } = body

    // Validate email — always return { ok: true } to avoid leaking whether email exists
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      // Timing delay: equalize response time with the full DB-write path
      await new Promise(r => setTimeout(r, 200 + Math.random() * 200))
      return NextResponse.json({ ok: true })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Rate limit: max 3 unused tokens per email in a 30-min window
    if (await isEmailRateLimited(normalizedEmail)) {
      // Return ok: true — never reveal rate limiting to the caller
      return NextResponse.json({ ok: true })
    }

    // Create token record
    const tokenRecord = createTokenRecord(normalizedEmail, sessionId ?? undefined)

    // Persist token to DB
    await prisma.magicToken.create({
      data: {
        token: tokenRecord.token,
        email: tokenRecord.email,
        sessionId: tokenRecord.sessionId,
        expiresAt: tokenRecord.expiresAt,
      },
    })

    // Send email (non-blocking — don't fail the request if email fails)
    sendMagicLinkEmail(tokenRecord.email, tokenRecord.token).catch(err =>
      console.error('[magic-link] email send failed:', err)
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/auth/magic-link error:', error)
    // Always return ok: true — never reveal internal errors to the caller
    return NextResponse.json({ ok: true })
  }
}
