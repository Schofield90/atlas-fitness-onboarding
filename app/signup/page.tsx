'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Simulate successful signup by storing data locally
      const userData = {
        email,
        name,
        organizationName,
        signedUpAt: new Date().toISOString(),
        trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      localStorage.setItem('gymleadhub_trial_data', JSON.stringify(userData))
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Show success message
      setSuccess(true)
      
      // Redirect to a simple dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-white">
              🎉 Welcome to Your 14-Day Free Trial!
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Your Gymleadhub trial has started successfully.
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Redirecting to your dashboard...
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link 
            href="/"
            className="flex justify-center text-2xl font-bold text-orange-500 mb-8"
          >
            Gymleadhub
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Start Your Free Trial
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            No credit card required • 14-day free trial
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="rounded-md bg-red-900 border border-red-600 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">
                    Error creating account
                  </h3>
                  <div className="mt-2 text-sm text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-1">
                Gym/Organization Name
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your gym name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-gray-400">
                Password must be at least 6 characters
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating your account...' : 'Start Free Trial'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-orange-500 hover:text-orange-400">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}