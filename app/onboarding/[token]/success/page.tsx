export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Onboarding Complete!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for completing your onboarding. Your signed documents have been
            securely saved and you&apos;ll receive confirmation shortly.
          </p>
          
          <p className="text-sm text-gray-500">
            Welcome to the Atlas Fitness team! We&apos;re excited to have you on board.
          </p>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              If you have any questions, please contact HR at{' '}
              <a
                href="mailto:sam@atlas-gyms.co.uk"
                className="text-blue-600 hover:text-blue-500"
              >
                sam@atlas-gyms.co.uk
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}