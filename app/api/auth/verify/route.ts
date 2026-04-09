import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { verifyMagicToken } from '../../../../lib/magicLink'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=not_found`)
  }

  const result = await verifyMagicToken(token)

  if (result.valid === false) {
    return NextResponse.redirect(`${baseUrl}/?auth_error=${result.reason}`)
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

  // Set auth cookie
  const isProduction = process.env.NODE_ENV === 'production'
  const response = NextResponse.redirect(`${baseUrl}/`)

  response.cookies.set('mmr_uid', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  })

  return response
}
