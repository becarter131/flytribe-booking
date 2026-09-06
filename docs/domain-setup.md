# flytribe.co.jp ドメイン移行手順

メール・公式ウェブサイト・予約システムを flytribe.co.jp 上で併存させるための手順。

## 構成（ゴール）

| 用途 | URL / レコード | 備考 |
|---|---|---|
| メール | MX レコード（既存） | **絶対に変更しない** |
| 公式サイト | https://flytribe.co.jp/ | このリポジトリのルートページ |
| 予約システム | https://flytribe.co.jp/booking/ | 旧 /ja/... は自動リダイレクト |
| 管理画面 | https://flytribe.co.jp/booking/dashboard | ベーシック認証つき |

## コード側の準備（完了済み）

- 予約システムを `/ja/...` から `/booking/...` へ移設（旧URLは 301 リダイレクト）
- ルート `/` を公式サイトのトップページ（プレースホルダー）に変更
- サイトURLを `src/lib/site.ts` の `SITE_URL` に一元化
  （メール署名・管理画面リンク・特商法表記などすべてここを参照）

## ドメイン切替手順（作業時に実施）

### 1. Vercel にドメインを追加

1. Vercel ダッシュボード → flytribe-booking プロジェクト → Settings → Domains
2. `flytribe.co.jp` を追加（`www.flytribe.co.jp` も追加し、apex へリダイレクト設定推奨）
3. Vercel が指示する DNS レコードを控える

### 2. DNS 設定（メールを止めない！）

ドメイン管理会社（お名前.com 等）の DNS 設定画面で:

- **追加するもの（Web用）**
  - `flytribe.co.jp` → A レコード `76.76.21.21`（Vercel 指定値を確認）
  - `www` → CNAME `cname.vercel-dns.com`（Vercel 指定値を確認）
- **触ってはいけないもの（メール用）**
  - MX レコード（メール配送先）
  - TXT レコード（SPF: `v=spf1 ...`）、DKIM、DMARC
  - メールサービスが使う CNAME（autodiscover 等）

> ⚠️ 「ネームサーバーを Vercel に変更」する方式は取らないこと。
> ネームサーバーを変えると既存の MX/SPF レコードが消えてメールが停止する。
> 必ず「今の DNS に A/CNAME レコードを追加」する方式で行う。

### 3. 環境変数の更新

Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SITE_URL=https://flytribe.co.jp
```

設定後、再デプロイして反映。

### 4. 切替後の確認チェックリスト

- [ ] https://flytribe.co.jp/ が公式トップを表示
- [ ] https://flytribe.co.jp/robots.txt が「Allow」+ sitemap を返す（NEXT_PUBLIC_SITE_URL 設定で自動切替。
      vercel.app のうちは noindex + Disallow で、移行後の重複インデックスを防いでいる）
- [ ] Google Search Console に flytribe.co.jp を登録し sitemap.xml を送信
- [ ] https://flytribe.co.jp/booking が予約システムを表示
- [ ] 旧URL https://flytribe-booking.vercel.app/ja/shop → /booking/shop にリダイレクト
- [ ] **メール送受信が正常**（info@flytribe.co.jp でテスト送受信）
- [ ] 予約・購入通知メールの署名リンクが flytribe.co.jp になっている
- [ ] 管理画面のベーシック認証が生きている

### 5. 外部サービスの登録URL更新

- **Stripe**: Webhook エンドポイントは `flytribe-booking.vercel.app/api/webhooks/stripe` のまま動作する
  （vercel.app ドメインは残り続けるため）。ただしダッシュボードの「ビジネス情報 → ウェブサイト」は
  flytribe.co.jp に更新しておく（特商法との整合のため）
- **Resend**: 送信ドメインが flytribe.co.jp ならそのままでOK
- **Vercel Cron**（リマインダー送信）: パス指定（/api/ft/cron/reminders）なので変更不要
