import Link from 'next/link'

// 全ページ共通フッター（法務ページ・お問い合わせへの導線）
export default function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-2xl mx-auto px-4 py-6 text-xs text-gray-500 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link href="/ja/legal/terms" className="hover:text-sky-700">
          利用規約
        </Link>
        <Link href="/ja/legal/privacy" className="hover:text-sky-700">
          プライバシーポリシー
        </Link>
        <Link href="/ja/legal/tokushoho" className="hover:text-sky-700">
          特定商取引法に基づく表記
        </Link>
        <Link href="/ja/contact" className="hover:text-sky-700">
          お問い合わせ
        </Link>
        <span>© {new Date().getFullYear()} 株式会社フライトライブ</span>
      </div>
    </footer>
  )
}
