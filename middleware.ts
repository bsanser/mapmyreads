import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Respond to CORS preflight requests from the same origin
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin')
    const allowedOrigin = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
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

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
