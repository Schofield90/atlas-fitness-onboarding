'use client'

import Link from 'next/link'

export default function TestLoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Atlas Fitness - Local Development</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-900/50 rounded-lg">
            <p className="text-white mb-2">✅ Your local server is working!</p>
            <p className="text-gray-300 text-sm">Now you need to log in to access the app.</p>
          </div>
          
          <div className="space-y-3">
            <Link 
              href="/login" 
              className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-lg hover:bg-blue-700 transition"
            >
              Go to Login Page
            </Link>
            
            <Link 
              href="/signup" 
              className="block w-full bg-gray-700 text-white text-center py-3 px-4 rounded-lg hover:bg-gray-600 transition"
            >
              Create New Account
            </Link>
          </div>
          
          <div className="mt-6 p-4 bg-gray-900 rounded-lg">
            <p className="text-gray-400 text-sm mb-2">Direct URLs:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Login: <span className="text-blue-400">http://localhost:3000/login</span></li>
              <li>• Signup: <span className="text-blue-400">http://localhost:3000/signup</span></li>
              <li>• Dashboard: <span className="text-blue-400">http://localhost:3000/dashboard</span></li>
            </ul>
          </div>
          
          <div className="mt-6 text-center">
            <a 
              href="https://atlas-fitness-onboarding.vercel.app" 
              className="text-sm text-gray-400 hover:text-white"
              target="_blank"
              rel="noopener noreferrer"
            >
              Or use the deployed version →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}