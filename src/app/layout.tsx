import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '株式会社フライトライブ',
  description:
    'AICHI AIR BASE（ドローン飛行場）の運営、ドローンスクール、貸切業務を行う株式会社フライトライブの公式サイト',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
