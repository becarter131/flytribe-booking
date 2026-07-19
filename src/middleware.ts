import { NextRequest, NextResponse } from 'next/server'

// 管理画面（/ja/dashboard 配下）に HTTP ベーシック認証を課す。
// パスワードログイン・2段階認証に加えた「管理画面へのアクセス制限」の層。
// 認証情報は環境変数 DASHBOARD_BASIC_USER / DASHBOARD_BASIC_PASS。
export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_BASIC_USER
  const pass = process.env.DASHBOARD_BASIC_PASS
  // 未設定の環境（ローカル等）では素通りさせる
  if (!user || !pass) return NextResponse.next()

  const header = req.headers.get('authorization') ?? ''
  if (header.startsWith('Basic ')) {
    const decoded = atob(header.slice(6))
    const idx = decoded.indexOf(':')
    const u = decoded.slice(0, idx)
    const p = decoded.slice(idx + 1)
    if (u === user && p === pass) {
      return NextResponse.next()
    }
  }

  return new NextResponse('認証が必要です', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="FlyTribe Admin", charset="UTF-8"' },
  })
}

export const config = {
  matcher: ['/ja/dashboard/:path*', '/ja/dashboard'],
}
