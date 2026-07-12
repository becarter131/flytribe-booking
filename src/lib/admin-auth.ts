import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

// Authorization: Bearer <ADMIN_PASSWORD> を検証する。
// 認証NGならエラーレスポンスを返し、OKなら null を返す。
export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 })
  }

  const header = req.headers.get('authorization') ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''

  // 長さ差でタイミング比較が失敗しないようハッシュ化してから比較する
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
