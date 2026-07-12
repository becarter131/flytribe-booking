'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg text-center">
        <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
        <p className="text-red-600 text-sm mb-4 font-mono">{error.message}</p>
        <button
          onClick={reset}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
