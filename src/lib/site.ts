// サイトURLの一元管理。
// 独自ドメイン（flytribe.co.jp）へ切り替える際は、Vercel の環境変数
// NEXT_PUBLIC_SITE_URL に https://flytribe.co.jp を設定するだけでよい。
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flytribe-booking.vercel.app'
