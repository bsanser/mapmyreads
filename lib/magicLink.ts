import crypto from 'crypto'
import { Resend } from 'resend'

// ─── Token generation ─────────────────────────────────────────────────────────

/** Returns a 64-character lowercase hex string (32 random bytes). */
export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** Returns true if the given date is in the past. */
export function isTokenExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now()
}

/** Returns a MagicToken-shaped record ready to insert into the DB. */
export function createTokenRecord(email: string, sessionId?: string) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  return {
    token: generateMagicToken(),
    email,
    sessionId: sessionId ?? null,
    expiresAt,
  }
}

// ─── Email sending ────────────────────────────────────────────────────────────

/** Sends a magic link email via Resend. */
export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: 'Map My Reads <noreply@mapmyreads.com>',
    to: email,
    subject: 'Your sign-in link for Map My Reads',
    html: `
      <p>Click the link below to sign in to Map My Reads. This link expires in 15 minutes.</p>
      <p><a href="${magicLink}">${magicLink}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  })
}
