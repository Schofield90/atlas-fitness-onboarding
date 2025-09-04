'use client'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-2">Unable to Load Billing Information</h3>
          <p className="text-gray-400 mb-2 leading-relaxed">We couldn't fetch your billing details right now.</p>
          <p className="text-gray-400 mb-6 leading-relaxed">This might be a temporary issue. You can try again later.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => reset()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Try Again
            </button>
            <a 
              href="mailto:support@atlasfitness.com?subject=Billing System Issue"
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

