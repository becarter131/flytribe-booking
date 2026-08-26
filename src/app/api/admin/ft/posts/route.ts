import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'

// お知らせ/ブログ（ft_posts）の管理API

interface PostRow {
  id: string
  category: string
  title: string
  body: string
  is_published: boolean
  published_at: string
  created_at: string
  updated_at: string
}

function toApi(p: PostRow) {
  return {
    id: p.id,
    category: p.category,
    title: p.title,
    body: p.body,
    isPublished: p.is_published,
    publishedAt: p.published_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

// 記事一覧（下書き含む・管理者用）
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { data, error } = await supabaseAdmin
    .from('ft_posts')
    .select('*')
    .order('published_at', { ascending: false })
  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  return NextResponse.json(((data ?? []) as PostRow[]).map(toApi))
}

const createSchema = z.object({
  category: z.enum(['news', 'blog']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().optional(), // YYYY-MM-DD（表示日付）
})

// 記事作成
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { category, title, body, isPublished, publishedAt } = parsed.data

  const { data, error } = await supabaseAdmin
    .from('ft_posts')
    .insert({
      category,
      title,
      body,
      is_published: isPublished ?? false,
      ...(publishedAt ? { published_at: new Date(`${publishedAt}T09:00:00+09:00`).toISOString() } : {}),
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: '作成に失敗しました' }, { status: 500 })
  return NextResponse.json(toApi(data as PostRow))
}

const updateSchema = z.object({
  id: z.uuid(),
  category: z.enum(['news', 'blog']).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().optional(),
})

// 記事更新（送信されたキーのみ反映）
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400 })
  }
  const { id, category, title, body, isPublished, publishedAt } = parsed.data

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (category !== undefined) patch.category = category
  if (title !== undefined) patch.title = title
  if (body !== undefined) patch.body = body
  if (isPublished !== undefined) patch.is_published = isPublished
  if (publishedAt !== undefined) {
    patch.published_at = new Date(`${publishedAt}T09:00:00+09:00`).toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('ft_posts')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  return NextResponse.json(toApi(data as PostRow))
}

// 記事削除
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 })

  const { error } = await supabaseAdmin.from('ft_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
