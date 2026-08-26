import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono, Noto_Sans_JP, Zen_Kaku_Gothic_New } from 'next/font/google'
import FieldContent from './FieldContent'
import './field.css'

// AICHI AIR BASE 施設案内ページ。
// デザイン固有のフォントは next/font で自己ホストし、CSS変数で field.css に渡す

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
})
const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-jp',
  preload: false,
})
const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['500', '700', '900'],
  variable: '--font-zen-kaku',
  preload: false,
})

export const metadata: Metadata = {
  title: 'AICHI AIR BASE 施設案内 | 株式会社フライトライブ',
  description:
    '愛知県瀬戸市の総敷地面積25haのドローン専用フィールド「AICHI AIR BASE」。実証実験・練習・撮影・研究に対応。Starlink・プレハブ・電源・駐車場完備。予約制。',
  openGraph: {
    title: 'AICHI AIR BASE — 総敷地面積25ha・愛知県瀬戸市のドローン専用フィールド',
    description:
      '実証実験・練習・撮影・研究のためのドローン専用フィールド。総敷地面積25ha、愛知県瀬戸市。',
    type: 'website',
  },
}

export default function FieldPage() {
  return (
    <div className={`field-page ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${notoSansJp.variable} ${zenKaku.variable}`}>
      <FieldContent />
    </div>
  )
}
