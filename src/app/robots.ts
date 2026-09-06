import type { MetadataRoute } from 'next'
import { IS_CANONICAL_DOMAIN, SITE_URL } from '@/lib/site'

// vercel.app の間は全体を拒否し、flytribe.co.jp 移行後（NEXT_PUBLIC_SITE_URL 設定後）に
// 自動でインデックス許可+サイトマップ配信へ切り替わる
export default function robots(): MetadataRoute.Robots {
  if (!IS_CANONICAL_DOMAIN) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/booking/dashboard', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
