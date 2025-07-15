import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Gym Coach Platform
        </h1>
        <p className="text-center text-gray-600 mb-8">
          AI-powered gym and business coaching SaaS platform
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/auth/login"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}