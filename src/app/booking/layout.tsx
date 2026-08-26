import type { Metadata } from 'next'
import SiteFooter from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'フライトライブ予約システム',
  description: 'ドローン飛行場の利用予約システム（貸切業務・国家資格講座・飛行会）',
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
