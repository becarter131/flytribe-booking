// サイトURLの一元管理。
// 独自ドメイン（flytribe.co.jp）へ切り替える際は、Vercel の環境変数
// NEXT_PUBLIC_SITE_URL に https://flytribe.co.jp を設定するだけでよい。
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flytribe-booking.vercel.app'

// 正式ドメイン（flytribe.co.jp）で動いているか。
// vercel.app のうちは検索エンジンにインデックスさせない（移行後の重複インデックス防止）。
// NEXT_PUBLIC_SITE_URL を https://flytribe.co.jp に設定した時点で自動的に許可へ切り替わる
export const IS_CANONICAL_DOMAIN = SITE_URL.includes('flytribe.co.jp')
