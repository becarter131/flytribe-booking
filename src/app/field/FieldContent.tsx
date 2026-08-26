'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// AICHI AIR BASE 施設案内（チーム制作の Netlify 版デザインを移植）
// 予約導線は Google フォームではなく自前の予約システム（/booking）へ接続

const FAQS: [string, React.ReactNode][] = [
  ['会員登録は必要ですか？', 'ご予約には予約システムでの会員登録（無料）が必要です。メールアドレスがあればその場で登録でき、初回からご利用いただけます。'],
  ['機体レンタルはありますか？', '原則お客様ご自身の機体でのご利用となります。レンタルをご希望の場合は、機種・用途を含めて別途ご相談ください。'],
  ['保険への加入は必要ですか？', '賠償責任保険へのご加入は必須となります。機体保険は任意です。ドローン保険にご加入されていない場合は、事前にご相談ください。'],
  ['夜間飛行は可能ですか？', '可能です。事前に飛行計画をご提出いただき、安全確認の上でのご案内となります。17:00以降のご利用は時間外料金（+20%）が発生します。'],
  ['法人契約や年間契約は可能ですか？', '可能です。定期利用のご要望に応じた優待プランをご用意しております。詳細はお問い合わせください。'],
  ['他社ドローンスクールの講習会場として貸切利用できますか？', 'はい、貸切利用に対応しております。座学スペース（プレハブ）と屋外実技エリアが揃っているため、講習開催に最適です。'],
  [
    'キャンセルポリシーは？',
    <>
      お客様都合によるキャンセルは、以下の通り申し受けます：
      <br />
      ・7日前まで：無料
      <br />
      ・6〜4日前：利用料の30%
      <br />
      ・3〜2日前：利用料の50%
      <br />
      ・前日：利用料の70%
      <br />
      ・当日・無連絡：利用料の100%
    </>,
  ],
  ['天候不良で飛行できない場合はどうなりますか？', '前日17:00までに双方合意の上で日程スライドが可能です。スライドは原則1回限り、3ヶ月以内の日程調整とさせていただきます。スライド時のキャンセル料は発生しません。'],
]

const FLOW_STEPS: [string, string][] = [
  ['Web予約申込', '予約システムからご希望日・利用区分を選んでお申し込み。24時間受付。'],
  ['空き状況確認', '1〜2営業日以内に担当者より確定可否をご連絡いたします。'],
  ['詳細ヒアリング', '利用目的・機体・人数を確認。オンライン相談可。'],
  ['予約確定', '利用日・金額を確定。銀行振込・カード決済対応。'],
  ['当日ご来場', '受付でお名前をお伝えください。担当者がサポート。'],
]

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="26" fill="none" stroke="#0A2540" strokeWidth="1.5" />
      <circle cx="30" cy="30" r="19" fill="none" stroke="#0A2540" strokeWidth="0.5" />
      <circle cx="30" cy="30" r="13" fill="none" stroke="#0A2540" strokeWidth="0.5" strokeDasharray="2 2" />
      <line x1="30" y1="0" x2="30" y2="4" stroke="#0A2540" strokeWidth="1" />
      <line x1="30" y1="56" x2="30" y2="60" stroke="#0A2540" strokeWidth="1" />
      <line x1="0" y1="30" x2="4" y2="30" stroke="#0A2540" strokeWidth="1" />
      <line x1="56" y1="30" x2="60" y2="30" stroke="#0A2540" strokeWidth="1" />
      <path d="M 30 6 L 35 32 L 30 30 Z" fill="#F5A623" />
      <path d="M 30 6 L 25 32 L 30 30 Z" fill="#D48512" />
      <path d="M 30 54 L 35 28 L 30 30 Z" fill="#0A2540" opacity="0.3" />
      <path d="M 30 54 L 25 28 L 30 30 Z" fill="#0A2540" opacity="0.5" />
      <circle cx="30" cy="30" r="2.5" fill="#FFFFFF" stroke="#0A2540" strokeWidth="0.8" />
    </svg>
  )
}

function Compass() {
  return (
    <svg className="compass" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="88" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3" />
      <g stroke="#ffffff" strokeWidth="1" opacity="0.4">
        <line x1="100" y1="12" x2="100" y2="20" />
        <line x1="100" y1="180" x2="100" y2="188" />
        <line x1="12" y1="100" x2="20" y2="100" />
        <line x1="180" y1="100" x2="188" y2="100" />
      </g>
      <path d="M 100 22 L 108 100 L 100 96 Z" fill="#F5A623" />
      <path d="M 100 22 L 92 100 L 100 96 Z" fill="#D48512" />
      <path d="M 100 178 L 108 100 L 100 104 Z" fill="#ffffff" opacity="0.3" />
      <path d="M 100 178 L 92 100 L 100 104 Z" fill="#ffffff" opacity="0.5" />
      <circle cx="100" cy="100" r="6" fill="#0A2540" stroke="#F5A623" strokeWidth="1.5" />
      <text x="100" y="8" textAnchor="middle" fill="#F5A623" fontFamily="monospace" fontSize="11" fontWeight="600">
        N
      </text>
    </svg>
  )
}

function FaqIcon() {
  return (
    <span className="faq-icon">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="5" y1="1" x2="5" y2="9" />
        <line x1="1" y1="5" x2="9" y2="5" />
      </svg>
    </span>
  )
}

export default function FieldContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // スクロールに応じたフェードイン表示
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.1 }
    )
    document
      .querySelectorAll('.field-page .section-head, .field-page .value-card, .field-page .case-card, .field-page .flow-step, .field-page .pricing-card')
      .forEach((el) => {
        el.classList.add('fade-in')
        io.observe(el)
      })
    return () => io.disconnect()
  }, [])

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <BrandMark />
            <div>
              <div className="brand-text">AICHI AIR BASE</div>
              <div className="brand-coord">N 35°16&apos;20&quot;　E 137°07&apos;37&quot;</div>
            </div>
          </Link>
          <div className="nav-status">
            <div className="status-pill">BASE OPERATIONAL</div>
            <Link href="/booking" className="nav-cta">
              ご予約はこちら
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" id="top">
        <div className="hero-photo"></div>
        <div className="hero-grid"></div>
        <div className="hero-corners">
          <span></span>
        </div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">Aichi · Seto · Est. 2026</div>
            <h1 className="hero-title">
              あらゆるフライトが、
              <br />
              <span className="accent">ここから始まる。</span>
            </h1>
            <div className="hero-brand">AICHI AIR BASE — Drone Operations Field</div>
            <p className="hero-desc">
              愛知県瀬戸市に誕生した、ドローン専用フィールド。
              <br />
              小型機体から空飛ぶクルマ・eVTOLまで、あらゆる運用に対応します。
            </p>
            <div className="hero-cta-row">
              <Link href="/booking" className="btn btn-primary">
                ご予約・お申し込み
                <span className="btn-arrow">→</span>
              </Link>
              <a href="#field" className="btn btn-secondary">
                フィールドを見る
                <span className="btn-arrow">↓</span>
              </a>
            </div>
          </div>

          <div className="hero-right">
            <div className="coord-display">
              <span className="coord-corner tl"></span>
              <span className="coord-corner tr"></span>
              <span className="coord-corner bl"></span>
              <span className="coord-corner br"></span>

              <div className="coord-label">Field Coordinate</div>
              <div className="coord-value">N 35°16&apos;20&quot;　E 137°07&apos;37&quot;</div>

              <div className="compass-wrap">
                <Compass />
              </div>

              <div className="data-grid">
                <div className="data-item">
                  <div className="data-label">Location</div>
                  <div className="data-value small">Seto, Aichi</div>
                </div>
                <div className="data-item">
                  <div className="data-label">Status</div>
                  <div className="data-value">Operational</div>
                </div>
                <div className="data-item">
                  <div className="data-label">Total Area</div>
                  <div className="data-value">25 ha</div>
                </div>
                <div className="data-item">
                  <div className="data-label">Hours</div>
                  <div className="data-value">09:00 – 17:00</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-strip">
          <div className="strip-item">Base Operational</div>
          <div className="strip-item">Available for Public Access</div>
          <div className="strip-item">JST · UTC+9</div>
        </div>
      </header>

      {/* MISSION */}
      <section className="mission">
        <div className="mission-inner">
          <div className="eyebrow mission-eyebrow">
            <span className="dot"></span>Mission
          </div>
          <div className="mission-quote">
            愛知に、あらゆる
            <br />
            機体を試せる
            <br />
            拠点をつくる。
            <span className="en">A field for all flights, from Aichi.</span>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="stats-band">
        <div className="stats-inner">
          <div className="stats-hero">
            <div className="stats-hero-label">Site Scale · 総敷地面積</div>
            <div className="stats-hero-value">
              25<span className="unit">ha</span>
            </div>
            <div className="stats-hero-sub">250,000 ㎡ · 国内大型ドーム 約5個分</div>
            <div className="stats-hero-desc">
              日本国内でも希少な、25 ヘクタール規模の運用フィールド。
              <br />
              大規模実証実験・複数機同時運用にも余裕で対応できる、圧倒的な広さ。
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Aircraft Support</div>
            <div className="stat-value">All types</div>
            <div className="stat-note">
              小型〜産業用大型機、
              <br />
              eVTOL・空飛ぶクルマ対応
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Operational Zones</div>
            <div className="stat-value">
              2<span className="unit-small">zones</span>
            </div>
            <div className="stat-note">
              メイン飛行場＋森林エリア
              <br />
              用途に応じて使い分け可能
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="section">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Why AICHI AIR BASE
            </div>
            <h2 className="section-title">3つの、選ばれる理由。</h2>
            <p className="section-lead">
              プロフェッショナルな運用のために必要な、広さ・設備・料金の透明性。すべてを、シンプルなかたちで。
            </p>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <span className="value-num">01 / 03</span>
              <h3 className="value-title">
                2つの
                <br />
                ゾーン
              </h3>
              <p className="value-desc">
                開けたメイン飛行場と、林間の実験ゾーン。用途に応じて2つのフィールドを使い分けられる、中部地区でも希少な運用環境です。
              </p>
            </div>
            <div className="value-card">
              <span className="value-num">02 / 03</span>
              <h3 className="value-title">
                完備された
                <br />
                インフラ
              </h3>
              <p className="value-desc">
                Starlink衛星通信・電源・水道・トイレ・座学スペース完備。研修から実証実験、1日の運用が完結する本格的な設備が整っています。
              </p>
            </div>
            <div className="value-card">
              <span className="value-num">03 / 03</span>
              <h3 className="value-title">
                明瞭な
                <br />
                料金体系
              </h3>
              <p className="value-desc">
                追加請求なしの明朗会計。1日 ¥46,000〜（税別）から。法人利用・年間契約もご相談ください。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="section cases-section" id="cases">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Use Cases
            </div>
            <h2 className="section-title">利用シーン</h2>
            <p className="section-lead">実証実験から個人練習まで、あらゆるドローン運用に対応します。</p>
          </div>
          <div className="cases-grid">
            <div className="case-card">
              <div className="case-head">
                <span className="case-num">01</span>
                <div className="case-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="case-title">新機体の実証実験</h3>
                <p className="case-desc">ドローンメーカー・スタートアップの開発中機体・センサー・ソフトウェアのテストフライトに。</p>
              </div>
            </div>

            <div className="case-card">
              <div className="case-head">
                <span className="case-num">02</span>
                <div className="case-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 12h18M12 3v18M6 6l12 12M6 18l12-12" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="case-title">空飛ぶクルマ・eVTOL試験</h3>
                <p className="case-desc">次世代エアモビリティの試験フライト。愛知＝自動車産業集積地の強みを活かした実証拠点。</p>
              </div>
            </div>

            <div className="case-card">
              <div className="case-head">
                <span className="case-num">03</span>
                <div className="case-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="8" width="16" height="12" rx="1" />
                    <path d="M8 8V4h8v4M12 12v4M9 15h6" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="case-title">Dock・自動運用検証</h3>
                <p className="case-desc">Dockの検証運用実績あり。Starlink衛星通信完備で、無人自動運用・遠隔運用の実証にも対応します。</p>
              </div>
            </div>

            <div className="case-card">
              <div className="case-head">
                <span className="case-num">04</span>
                <div className="case-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16v16H4z" />
                    <path d="M4 12h16M12 4v16" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="case-title">スクール講習会場</h3>
                <p className="case-desc">他ドローンスクールの実技講習・検定にも貸切対応。座学スペース（プレハブ）と屋外練習エリアが揃った、講習に最適な環境。</p>
              </div>
            </div>

            <div className="case-card">
              <div className="case-head">
                <span className="case-num">05</span>
                <div className="case-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="case-title">大学・研究機関</h3>
                <p className="case-desc">卒業研究・学術実験・共同研究の飛行フィールドに。研究計画に応じた柔軟な運用が可能。データ収集にも対応。</p>
              </div>
            </div>

            <div className="case-card">
              <div className="case-head">
                <span className="case-num">06</span>
                <div className="case-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="6" width="20" height="14" rx="2" />
                    <circle cx="12" cy="13" r="4" />
                    <path d="M8 6l2-3h4l2 3" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="case-title">空撮・撮影ロケ</h3>
                <p className="case-desc">プロモーション映像・番組ロケ・スチール撮影の拠点として。自然光・広い空間・多様なアングルを活かした撮影が可能。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FIELD SHOWCASE */}
      <section className="section field-section" id="field">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>The Field
            </div>
            <h2 className="section-title">フィールドを見る。</h2>
            <p className="section-lead">
              愛知県瀬戸市の丘陵地帯に広がる、ドローンのためだけの空間。市街地の喧騒から離れた、実証と練習に集中できるフィールドです。
            </p>
          </div>

          <div className="field-media">
            <div className="field-grid"></div>
            <span className="fc tl"></span>
            <span className="fc tr"></span>
            <span className="fc bl"></span>
            <span className="fc br"></span>

            <div className="field-ribbon">
              <div className="ribbon-item">
                <span className="ribbon-dot"></span>Base Operational
              </div>
              <div className="ribbon-item">Elevation 248 m</div>
              <div className="ribbon-item">Aerial View · Top-down</div>
            </div>

            <div className="field-label lbl-1">
              Field / Main
              <span className="lbl-sub">Operations Area</span>
            </div>

            <div className="field-coordbar">
              <div className="ribbon-item">
                <span className="coord-strong">35.2722° N</span>
              </div>
              <div className="ribbon-item">
                <span className="coord-strong">137.1269° E</span>
              </div>
              <div className="ribbon-item">Seto · Aichi · JP</div>
            </div>
          </div>

          <div className="specs-table">
            <div className="spec-row">
              <div className="spec-label">Site</div>
              <div className="spec-value">愛知県瀬戸市北丘町76-8</div>
            </div>
            <div className="spec-row">
              <div className="spec-label">Coordinate</div>
              <div className="spec-value mono">35.2722° N, 137.1269° E</div>
            </div>
            <div className="spec-row">
              <div className="spec-label">Area</div>
              <div className="spec-value">約 25 ha（250,000 ㎡）</div>
            </div>
            <div className="spec-row">
              <div className="spec-label">Facilities</div>
              <div className="spec-value">プレハブ・電源・駐車場・トイレ</div>
            </div>
            <div className="spec-row">
              <div className="spec-label">Aircraft</div>
              <div className="spec-value">小型ドローン〜産業用大型機、eVTOL対応</div>
            </div>
            <div className="spec-row">
              <div className="spec-label">Operation</div>
              <div className="spec-value mono">09:00 – 17:00 JST</div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO ZONES */}
      <section className="section zones-section" id="zones">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Two Zones
            </div>
            <h2 className="section-title">2つの、運用ゾーン。</h2>
            <p className="section-lead">
              開けたメイン飛行場と、林間の実験ゾーン。用途に応じて使い分けられる、中部地区でも希少な構成です。
            </p>
          </div>

          <div className="zones-grid">
            <div className="zone-card">
              <div className="zone-photo">
                <span className="zone-badge">Zone A</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/field/main-field-ground.jpg" alt="メイン飛行場" loading="lazy" />
                <div className="zone-photo-label">Main Airfield · Open Space</div>
              </div>
              <div className="zone-info">
                <div className="zone-name-en">Zone A · Main Airfield</div>
                <h3 className="zone-name">メイン飛行場</h3>
                <p className="zone-desc">
                  開けた広い運用エリア。大型機体の飛行、離着陸訓練、実証実験、イベントに最適。周辺は森に囲まれ、視界も開けています。
                </p>
                <div className="zone-tags">
                  <span className="zone-tag">大型機OK</span>
                  <span className="zone-tag">FlyCart</span>
                  <span className="zone-tag">eVTOL試験</span>
                  <span className="zone-tag">イベント</span>
                </div>
              </div>
            </div>

            <div className="zone-card">
              <div className="zone-photo">
                <span className="zone-badge">Zone B</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/field/hero-aerial.jpg" alt="森林エリア" loading="lazy" />
                <div className="zone-photo-label">Forest Zone · Test &amp; Training</div>
              </div>
              <div className="zone-info">
                <div className="zone-name-en">Zone B · Forest Zone</div>
                <h3 className="zone-name">森林エリア</h3>
                <p className="zone-desc">
                  林間の実験ゾーン。奥まで車両でアクセス可能で、大型小屋（研修室）を併設。目視外飛行の検証、FPV訓練、Dock運用テストに。
                </p>
                <div className="zone-tags">
                  <span className="zone-tag">Dock検証</span>
                  <span className="zone-tag">研修室</span>
                  <span className="zone-tag">車両アクセス</span>
                  <span className="zone-tag">FPV訓練</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FACILITY GALLERY */}
      <section className="section gallery-section" id="facilities">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Facilities
            </div>
            <h2 className="section-title">充実の、インフラ。</h2>
            <p className="section-lead">
              Starlink衛星通信・電源・水道・トイレ・研修室──1日の運用が完結する、本格的な設備が揃っています。
            </p>
          </div>

          <div className="gallery-grid">
            <div className="gallery-item hero-tile">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/training-room-active.jpg" alt="研修室での講習の様子" loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-tag">Training Room · 01</div>
                <div className="gallery-title">研修室 · プロジェクター・机・椅子完備</div>
              </div>
            </div>

            <div className="gallery-item square">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/starlink.jpg" alt="Starlink衛星通信" loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-tag">Connectivity · 02</div>
                <div className="gallery-title">Starlink · 衛星高速通信</div>
              </div>
            </div>

            <div className="gallery-item data-tile">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              <div className="data-tile-content">
                <div className="data-tile-label">Complete Infrastructure</div>
                <div className="data-tile-value">
                  <span className="big">Starlink</span>
                  電源／水道／トイレ
                  <br />
                  駐車場／研修室
                </div>
              </div>
            </div>

            <div className="gallery-item square">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/small-hut-ground.jpg" alt="森林ゾーン小屋（大）" loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-tag">Building · 03</div>
                <div className="gallery-title">研修棟 · 森林ゾーン</div>
              </div>
            </div>

            <div className="gallery-item square">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/utility-power.jpg" alt="電源・水道設備" loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-tag">Utilities · 04</div>
                <div className="gallery-title">電源・水道・給水設備</div>
              </div>
            </div>

            <div className="gallery-item square">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/main-field-hut.jpg" alt="メイン飛行場小屋" loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-tag">Field Hut · 05</div>
                <div className="gallery-title">メイン飛行場小屋 · 待機/整備</div>
              </div>
            </div>

            <div className="gallery-item square">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/toilet-facility.jpg" alt="トイレ・洗い場" loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-tag">Sanitation · 06</div>
                <div className="gallery-title">トイレ · 洗い場</div>
              </div>
            </div>

            <div className="gallery-item wide">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/entrance-road.jpg" alt="メイン飛行場入口" loading="lazy" />
              <div className="gallery-caption">
                <div className="gallery-tag">Access · 07</div>
                <div className="gallery-title">アクセス路 · 車両搬入対応</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRACK RECORD */}
      <section className="section track-section">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Track Record
            </div>
            <h2 className="section-title">実績。</h2>
            <p className="section-lead">
              開設前より、法人イベントの開催やDockの検証運用など、実運用のフィールドとして機能してきました。
            </p>
          </div>

          <div className="track-grid">
            <div className="track-item">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/event-drone.jpg" alt="法人イベント開催実績" loading="lazy" />
              <div className="track-info">
                <div className="track-tag">Event · Field Ops</div>
                <div className="track-title">法人向けイベント・技術デモの開催実績</div>
                <p className="track-desc">
                  車両・機材の搬入から、ヘリパッド設営、複数人での運用まで対応。企業向けデモや技術説明会の実績があります。
                </p>
              </div>
            </div>

            <div className="track-item">
              <span className="corner tl"></span>
              <span className="corner tr"></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/field/dock-testing.jpg" alt="Dock検証運用" loading="lazy" />
              <div className="track-info">
                <div className="track-tag">Verified · Dock</div>
                <div className="track-title">Dockの検証運用に対応</div>
                <p className="track-desc">
                  気象観測用機器の設置、Dockの検証運用実績あり。無人自動運用の実証拠点として、継続的な設置・運用が可能です。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section pricing-section" id="pricing">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Pricing
            </div>
            <h2 className="section-title">明瞭な、料金体系。</h2>
            <p className="section-lead">追加請求なしの明朗会計。ご利用目的に応じて、最適なプランをご案内します。</p>
          </div>

          <div className="pricing-wrap">
            <div className="pricing-left">
              <div className="pricing-card">
                <div className="pricing-head">
                  <div className="pricing-plan-label">Standard Plan</div>
                  <div className="pricing-plan-name">1日利用プラン</div>
                  <div className="pricing-price-row">
                    <span className="price-currency">¥</span>
                    <span className="price-amount">46,000</span>
                    <span className="price-unit">/ day</span>
                  </div>
                  <div className="pricing-subprice">〜 ¥50,000（プレハブ利用時）／ 税別</div>
                </div>
                <div className="pricing-lines">
                  <div className="pricing-line">
                    <span className="pricing-line-label">フィールド利用料（管理費・立会費込）</span>
                    <span className="pricing-line-value">¥46,000</span>
                  </div>
                  <div className="pricing-line">
                    <span className="pricing-line-label">プレハブ利用（オプション）</span>
                    <span className="pricing-line-value">¥4,000</span>
                  </div>
                </div>
                <div className="pricing-note">
                  <strong>時間外料金：</strong>17:00以降のご利用は合計金額の20%を加算いたします。
                  <br />
                  <strong>見学：</strong>無料です。まずはお気軽にお問い合わせください。
                  <br />
                  <strong>法人契約：</strong>年間契約・優待プランをご相談いただけます。
                  <br />
                  <strong>キャンセル：</strong>7日前まで無料。詳細はFAQをご確認ください。
                  <br />
                  <strong>プレハブ電源：</strong>消費電力が大きい設備を同時に使用するとブレーカーが落ちる可能性があります。
                </div>
              </div>
            </div>

            <div>
              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 40 }}>
                <div className="eyebrow" style={{ marginBottom: 20 }}>
                  <span className="dot"></span>Note
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--display-jp)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    marginBottom: 24,
                    lineHeight: 1.5,
                  }}
                >
                  透明な料金、柔軟な運用。
                </h3>
                <p style={{ color: 'var(--slate)', lineHeight: 1.9, marginBottom: 40 }}>
                  AICHI AIR BASEは、追加請求のない明朗会計を運営方針としています。フィールド利用料・管理費・立会費用のすべてを明示し、当日追加費用が発生することはありません。
                </p>

                <div className="eyebrow" style={{ marginBottom: 20 }}>
                  <span className="dot"></span>Options
                </div>
                <ul style={{ listStyle: 'none', display: 'grid', gap: 16, paddingTop: 16, margin: 0, paddingLeft: 0 }}>
                  {[
                    '機体レンタル・講師派遣は別途お見積り',
                    '貸切利用（他スクール講習会場等）はご相談ください',
                    '法人年間契約は、優先予約枠と優待料金をご用意',
                    '大学・研究機関との共同研究プランに対応',
                  ].map((text, i) => (
                    <li
                      key={text}
                      style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 16, alignItems: 'baseline' }}
                    >
                      <span className="mono" style={{ color: 'var(--amber)', fontSize: 11 }}>
                        +{String(i + 1).padStart(2, '0')}
                      </span>
                      <span style={{ color: 'var(--slate)' }}>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section className="section flow-section" id="flow">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Booking Flow
            </div>
            <h2 className="section-title">ご予約の流れ</h2>
            <p className="section-lead">お申し込みから当日ご利用まで、シンプルな5ステップです。</p>
          </div>

          <div className="flow-steps">
            {FLOW_STEPS.map(([title, desc], i) => (
              <div className="flow-step" key={title}>
                <div className="flow-node">{String(i + 1).padStart(2, '0')}</div>
                <div className="flow-content">
                  <div className="flow-num">Step {String(i + 1).padStart(2, '0')}</div>
                  <div className="flow-title">{title}</div>
                  <div className="flow-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCESS */}
      <section className="section access-section" id="access">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Access
            </div>
            <h2 className="section-title">アクセス</h2>
          </div>

          <div className="access-wrap">
            <div className="access-info">
              <div className="access-address">〒480-1204</div>
              <h3 className="access-title">愛知県瀬戸市北丘町76-8</h3>

              <div className="access-coords">
                <span className="label">Field Coordinate</span>
                <span>N 35°16&apos;20&quot;　E 137°07&apos;37&quot;</span>
              </div>

              <div className="access-routes">
                <div className="access-route">
                  <div className="route-label">Car / A</div>
                  <div className="route-detail">
                    東海環状自動車道「せと品野IC」から<strong>約5分</strong>
                  </div>
                </div>
                <div className="access-route">
                  <div className="route-label">Car / B</div>
                  <div className="route-detail">名古屋市中心部から約40分</div>
                </div>
                <div className="access-route">
                  <div className="route-label">Car / C</div>
                  <div className="route-detail">名古屋第二環状「引山IC」から約20分</div>
                </div>
                <div className="access-route">
                  <div className="route-label">Car / D</div>
                  <div className="route-detail">東名高速「日進JCT」から約25分</div>
                </div>
                <div className="access-route">
                  <div className="route-label">Parking</div>
                  <div className="route-detail">無料駐車場完備（機材車・大型車対応）</div>
                </div>
              </div>
            </div>

            <div>
              <div className="access-map">
                <iframe
                  src="https://maps.google.co.jp/maps?output=embed&q=%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%80%AC%E6%88%B8%E5%B8%82%E5%8C%97%E4%B8%98%E7%94%BA76-8&hl=ja&z=15"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="AICHI AIR BASE Location Map"
                ></iframe>
              </div>
              <div className="access-map-actions">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%80%AC%E6%88%B8%E5%B8%82%E5%8C%97%E4%B8%98%E7%94%BA76-8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-btn"
                >
                  経路案内
                  <span>→</span>
                </a>
                <a
                  href="https://www.google.com/maps/place/%E6%84%9B%E7%9F%A5%E7%9C%8C%E7%80%AC%E6%88%B8%E5%B8%82%E5%8C%97%E4%B8%98%E7%94%BA76-8/@35.2722,137.1269,17z"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-btn secondary"
                >
                  Google Mapsで開く
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section faq-section" id="faq">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Frequently Asked
            </div>
            <h2 className="section-title">よくあるご質問</h2>
          </div>

          <div className="faq-list">
            {FAQS.map(([q, a], i) => (
              <div className={`faq-item${openFaq === i ? ' open' : ''}`} key={i}>
                <button className="faq-question" type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="faq-q-num">Q.{String(i + 1).padStart(2, '0')}</span>
                  <span className="faq-q-text">{q}</span>
                  <FaqIcon />
                </button>
                <div className="faq-answer">
                  <div className="faq-a-text">{a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT / CTA */}
      <section className="section form-section" id="contact">
        <div className="section-inner">
          <div className="section-head">
            <div className="eyebrow section-eyebrow">
              <span className="dot"></span>Contact
            </div>
            <h2 className="section-title">ご予約・お問い合わせ</h2>
            <p className="section-lead">
              ご予約は予約システムから24時間受け付けています。ご不明な点はお問い合わせフォームよりご連絡ください。
            </p>
          </div>

          <div className="form-cta-box">
            <div>
              <div className="form-cta-label">Reservation · FlyTribe Booking</div>
              <div className="form-cta-title">ご予約はこちら</div>
              <div className="form-cta-desc">
                空き状況カレンダーの確認から、貸切業務・講座・飛行会の
                <br />
                お申し込みまで、オンラインで完結します。
              </div>
            </div>
            <Link href="/booking" className="form-cta-btn">
              予約システムを開く
              <span className="arrow">→</span>
            </Link>
          </div>

          <div className="form-cta-box" style={{ marginTop: 32 }}>
            <div>
              <div className="form-cta-label">General Inquiry</div>
              <div className="form-cta-title">お問い合わせはこちら</div>
              <div className="form-cta-desc">
                その他のご質問・ご相談は、
                <br />
                お問い合わせフォームよりご連絡ください。
              </div>
            </div>
            <Link href="/booking/contact" className="form-cta-btn">
              お問い合わせフォームへ
              <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand-col">
              <div className="footer-brand">AICHI AIR BASE</div>
              <div className="footer-tagline">
                あらゆるフライトが、
                <br />
                ここから始まる。
              </div>
              <div className="footer-coord">N 35°16&apos;20&quot;　E 137°07&apos;37&quot;</div>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Field</div>
              <ul>
                <li>
                  <a href="#field">フィールド紹介</a>
                </li>
                <li>
                  <a href="#facilities">設備・スペック</a>
                </li>
                <li>
                  <a href="#cases">利用シーン</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Info</div>
              <ul>
                <li>
                  <a href="#pricing">料金プラン</a>
                </li>
                <li>
                  <a href="#flow">ご予約の流れ</a>
                </li>
                <li>
                  <a href="#faq">よくあるご質問</a>
                </li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Contact</div>
              <ul>
                <li>愛知県瀬戸市北丘町76-8</li>
                <li>
                  <Link href="/booking/contact">お問い合わせフォームへ →</Link>
                </li>
                <li>
                  <Link href="/">株式会社フライトライブ 公式トップ →</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 AICHI AIR BASE. All Rights Reserved.</div>
            <div className="footer-operator">Operated by 株式会社フライトライブ</div>
          </div>
        </div>
      </footer>
    </>
  )
}
