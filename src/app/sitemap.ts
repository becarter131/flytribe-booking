import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'

// 主要ページ + 公開済みお知らせ/ブログ。robots.ts から参照される
// お知らせの追加がデプロイなしで反映されるよう1時間ごとに再生成
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/field`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/news`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/booking`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/booking/shop`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/booking/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/booking/legal/terms`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/booking/legal/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/booking/legal/tokushoho`, changeFrequency: 'yearly', priority: 0.1 },
  ]

  const { data: posts } = await supabaseAdmin
    .from('ft_posts')
    .select('id, updated_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(500)

  const newsPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${SITE_URL}/news/${p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticPages, ...newsPages]
}
