'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { analytics } from '@/app/lib/analytics/client'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // User is logged in, redirect to dashboard
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      setLoading(false)
    }
  }

  const handleEmailSubmit = () => {
    if (email) {
      analytics.trackFormSubmit('hero-email-capture', { email: email })
      analytics.trackCustomEvent('lead_capture', { source: 'hero_section' })
    }
  }

  const handleWatchDemo = () => {
    analytics.trackClick('watch-demo-button', { location: 'hero' })
    analytics.trackCustomEvent('demo_interest', { source: 'hero_section' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold text-orange-500">
            Gymleadhub
          </div>
          <nav className="flex items-center space-x-6">
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="hover:text-orange-400 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-orange-400 transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-orange-400 transition-colors">Contact</a>
            </div>
            <Link 
              href="/login"
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors border border-gray-600"
              data-track="header-sign-in"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Your Gym Leads Are{' '}
            <span className="text-orange-500">Texting Your Competitors</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 text-gray-300 leading-relaxed">
            Stop losing potential members to faster-responding gyms. Our AI-powered system 
            captures, qualifies, and nurtures leads 24/7 so you never miss another opportunity.
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-8">
            <Link 
              href="/signup"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
              data-track="hero-start-trial"
            >
              Start Free Trial
            </Link>
            <button 
              className="border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-bold py-4 px-8 rounded-lg text-lg transition-all"
              onClick={handleWatchDemo}
              data-track="hero-watch-demo"
            >
              Watch Demo
            </button>
          </div>
          
          <div className="text-center mb-16">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-500 hover:text-orange-400 font-medium">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Email Capture */}
          <div className="max-w-md mx-auto mb-16">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
              <button 
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                onClick={handleEmailSubmit}
                data-track="hero-email-submit"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-20">
          <h2 className="text-4xl font-bold text-center mb-16">
            Why Gym Owners Choose Gymleadhub
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-8 rounded-lg">
              <div className="text-orange-500 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-4">Instant Response</h3>
              <p className="text-gray-300">
                AI responds to leads within seconds, 24/7. Never lose a potential member to slow response times again.
              </p>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-lg">
              <div className="text-orange-500 text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-4">Smart Qualification</h3>
              <p className="text-gray-300">
                Automatically qualify leads based on budget, goals, and commitment level before they reach your sales team.
              </p>
            </div>
            
            <div className="bg-gray-800 p-8 rounded-lg">
              <div className="text-orange-500 text-4xl mb-4">📈</div>
              <h3 className="text-xl font-bold mb-4">Conversion Tracking</h3>
              <p className="text-gray-300">
                Track every lead from first contact to membership signup with detailed analytics and insights.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-bold text-orange-500 mb-2">3x</div>
              <div className="text-xl">Faster Response Time</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-orange-500 mb-2">85%</div>
              <div className="text-xl">Lead Conversion Rate</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-orange-500 mb-2">24/7</div>
              <div className="text-xl">Automated Follow-up</div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center bg-gray-800 rounded-lg">
          <h2 className="text-4xl font-bold mb-8">
            Ready to Stop Losing Leads?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of gym owners who've transformed their lead management 
            with Gymleadhub. Start your free trial today.
          </p>
          <Link 
            href="/signup"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg inline-block"
            data-track="cta-start-trial"
          >
            Start Free Trial - No Credit Card Required
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 Gymleadhub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}