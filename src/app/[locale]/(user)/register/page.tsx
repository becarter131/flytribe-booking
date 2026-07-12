'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, { error: 'お名前を入力してください' }).max(100),
  email: z.email({ error: 'メールアドレスの形式が正しくありません' }),
  phone: z
    .string()
    .min(8, { error: '電話番号を入力してください' })
    .max(20, { error: '電話番号が長すぎます' })
    .regex(/^[0-9+\-() ]+$/, { error: '電話番号の形式が正しくありません' }),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: '生年月日を入力してください' }),
})

type FormData = z.infer<typeof schema>

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500'

export default function RegisterPage() {
  const [apiError, setApiError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setApiError(null)
    try {
      const res = await fetch('/api/ft/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.id) {
        localStorage.setItem('ftUserId', body.id)
        window.location.assign('/ja')
      } else {
        setApiError(body.error ?? `エラーが発生しました (${res.status})`)
      }
    } catch (e) {
      setApiError(`通信エラー: ${String(e)}`)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">利用者登録</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">お名前</label>
            <input {...register('name')} className={inputClass} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input {...register('email')} type="email" className={inputClass} />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="090-0000-0000"
              className={inputClass}
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">生年月日</label>
            <input {...register('birthdate')} type="date" className={inputClass} />
            {errors.birthdate && (
              <p className="text-red-500 text-sm mt-1">{errors.birthdate.message}</p>
            )}
          </div>

          {apiError && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {apiError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sky-600 text-white py-3 rounded-lg font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? '登録中...' : '登録して予約に進む'}
          </button>
        </form>
      </div>
    </main>
  )
}
