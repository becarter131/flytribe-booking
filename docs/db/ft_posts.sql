-- お知らせ/ブログ（2026-08-26 適用済み。適用は pg 直接続スクリプトで行う）
create table if not exists ft_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'news' check (category in ('news', 'blog')),
  title text not null,
  body text not null,
  is_published boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- この Supabase は自動権限付与が効かないため明示 grant が必須
grant all on table ft_posts to service_role;
