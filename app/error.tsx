'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Something went wrong!</h2>
        <button
          onClick={() => reset()}
          className="mt-4 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}