import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ブラウザ用クライアント（一般ユーザー権限）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サーバー用クライアント（管理者権限・APIルート内でのみ使用）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
