import type { Metadata } from 'next'
import { IS_CANONICAL_DOMAIN, SITE_URL } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '株式会社フライトライブ',
  description:
    'AICHI AIR BASE（ドローン飛行場）の運営、ドローンスクール、貸切業務を行う株式会社フライトライブの公式サイト',
  // vercel.app の間は noindex（flytribe.co.jp 移行時に環境変数で自動解除）
  robots: IS_CANONICAL_DOMAIN ? undefined : { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
