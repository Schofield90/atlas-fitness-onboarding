'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Dumbbell, Mail, Phone } from 'lucide-react'
import toast from '@/app/lib/toast'

export default function MemberPortalLogin() {
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSendCode = async () => {
    if (!emailOrPhone.trim()) {
      toast.error('Please enter your email or phone number')
      return
    }

    setLoading(true)
    try {
      if (method === 'email') {
        // Send magic link via email
        const { error } = await supabase.auth.signInWithOtp({
          email: emailOrPhone,
          options: {
            emailRedirectTo: `${window.location.origin}/portal`
          }
        })

        if (error) throw error
        
        toast.success('Check your email for the login link!')
        setCodeSent(true)
      } else {
        // Send OTP via SMS
        const { error } = await supabase.auth.signInWithOtp({
          phone: emailOrPhone
        })

        if (error) throw error
        
        toast.success('Check your phone for the verification code!')
        setCodeSent(true)
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Failed to send login code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: emailOrPhone,
        token: verificationCode,
        type: 'sms'
      })

      if (error) throw error
      
      toast.success('Login successful!')
      router.push('/portal')
    } catch (error: any) {
      console.error('Verification error:', error)
      toast.error(error.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-600 rounded-full mb-4">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Member Portal</h1>
          <p className="text-gray-400">Access your fitness journey</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8">
          {!codeSent ? (
            <>
              {/* Method Selector */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setMethod('email')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    method === 'email'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-5 h-5 inline mr-2" />
                  Email
                </button>
                <button
                  onClick={() => setMethod('phone')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                    method === 'phone'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Phone className="w-5 h-5 inline mr-2" />
                  Phone
                </button>
              </div>

              {/* Input Field */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {method === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <input
                  type={method === 'email' ? 'email' : 'tel'}
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder={method === 'email' ? 'you@example.com' : '+44 7XXX XXXXXX'}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending...
                  </span>
                ) : (
                  `Send ${method === 'email' ? 'Magic Link' : 'Code'}`
                )}
              </button>
            </>
          ) : method === 'phone' ? (
            <>
              {/* Verification Code Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-2xl tracking-wider"
                  maxLength={6}
                />
                <p className="text-sm text-gray-400 mt-2">
                  We sent a code to {emailOrPhone}
                </p>
              </div>

              {/* Verify Button */}
              <button
                onClick={handleVerifyCode}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </span>
                ) : (
                  'Verify & Login'
                )}
              </button>

              {/* Resend Option */}
              <button
                onClick={() => {
                  setCodeSent(false)
                  setVerificationCode('')
                }}
                className="w-full mt-3 text-gray-400 hover:text-white text-sm"
              >
                Didn't receive the code? Try again
              </button>
            </>
          ) : (
            <>
              {/* Email Sent Confirmation */}
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
                <p className="text-gray-400 mb-6">
                  We've sent a magic link to<br />
                  <span className="font-medium text-white">{emailOrPhone}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Click the link in the email to login to your account
                </p>
              </div>

              {/* Back Button */}
              <button
                onClick={() => {
                  setCodeSent(false)
                  setEmailOrPhone('')
                }}
                className="w-full mt-4 text-gray-400 hover:text-white text-sm"
              >
                Use a different email
              </button>
            </>
          )}

          {/* Help Text */}
          {!codeSent && (
            <div className="mt-6 text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <a href="/signup" className="text-orange-500 hover:text-orange-400">
                Contact your gym
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Powered by Atlas Fitness
        </div>
      </div>
    </div>
  )
}