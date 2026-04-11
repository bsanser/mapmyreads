import { NextRequest, NextResponse } from 'next/server'

// ─── Production guard: NEXT_PUBLIC_APP_URL must be set + HTTPS ───────────────

if (process.env.NODE_ENV === 'production') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl || !appUrl.startsWith('https://')) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL must be set to an https:// URL in production. ' +
      'Without it, auth redirects will point to localhost.'
    )
  }
}

// ─── Per-IP rate limiting for magic-link ─────────────────────────────────────

const IP_RATE_LIMIT = 5
const IP_RATE_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

const ipRequestLog = new Map<string, number[]>()

function isIpRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - IP_RATE_WINDOW_MS
  const timestamps = (ipRequestLog.get(ip) || []).filter(t => t > windowStart)
  ipRequestLog.set(ip, timestamps)

  if (timestamps.length >= IP_RATE_LIMIT) return true
  timestamps.push(now)
  return false
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ── CORS ──────────────────────────────────────────────────────────────────
  const origin = request.headers.get('origin')
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Reject CORS preflight from disallowed origins
  if (request.method === 'OPTIONS') {
    if (origin && origin !== allowedOrigin) {
      return new NextResponse(null, { status: 403 })
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Block cross-origin non-GET requests
  if (origin && origin !== allowedOrigin && request.method !== 'GET') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Per-IP rate limit on magic-link endpoint ──────────────────────────────
  if (pathname === '/api/auth/magic-link' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    if (isIpRateLimited(ip)) {
      // Return ok: true — never reveal rate limiting
      return NextResponse.json({ ok: true })
    }
  }

  // Set CORS header on all API responses
  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  return response
}

export const config = {
  matcher: '/api/:path*',
}
