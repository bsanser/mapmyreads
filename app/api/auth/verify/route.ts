import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { verifyMagicToken } from '../../../../lib/magicLink'
import { claimSession } from '../../../../lib/sessionMigration'
import { normalizeAuthError } from '../../../../lib/security'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=${normalizeAuthError('not_found')}`)
  }

  const result = await verifyMagicToken(token)

  if (result.valid === false) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=${normalizeAuthError(result.reason)}`)
  }

  // Find or create user by email
  let user = await prisma.user.findUnique({ where: { email: result.email } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: result.email,
        emailVerified: new Date(),
      },
    })
  } else if (!user.emailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    })
  }

  // Mark token as used
  await prisma.magicToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  // Claim anonymous session if sessionId was stored on the magic token
  if (result.sessionId) {
    try {
      await claimSession(result.sessionId, user.id)
    } catch (err) {
      console.warn('[verify] session claim failed (non-blocking):', err)
    }
  }

  // Set auth cookie
  const isProduction = process.env.NODE_ENV === 'production'
  const response = NextResponse.redirect(`${baseUrl}/`)

  response.cookies.set('mmr_uid', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 90 * 24 * 60 * 60, // 90 days
    path: '/',
  })

  return response
}
