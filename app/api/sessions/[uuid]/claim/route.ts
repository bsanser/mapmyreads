import { NextRequest, NextResponse } from 'next/server'
import { claimSession } from '../../../../../lib/sessionMigration'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params
  const userId = request.cookies.get('mmr_uid')?.value

  if (!userId) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  try {
    await claimSession(uuid, userId)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err.message === 'session_not_found') {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
    }
    if (err.message === 'session_already_claimed') {
      return NextResponse.json({ error: 'session_already_claimed' }, { status: 409 })
    }
    console.error('PATCH /api/sessions/[uuid]/claim error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
