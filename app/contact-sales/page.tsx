'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, Building2, Users, Phone, Mail } from 'lucide-react'

export default function ContactSalesPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    gymCount: '',
    memberCount: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const response = await fetch('/api/contact-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setSent(true)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
            <p className="text-gray-400 mb-6">
              We've received your message and will get back to you within 24 hours.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center text-orange-500 hover:text-orange-400"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pricing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/pricing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pricing
        </Link>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Enterprise Sales</h1>
            <p className="text-xl text-gray-300">
              Let's discuss how GymLeadHub can transform your gym chain
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-6">Why Enterprise?</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-orange-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Multi-Location Management</h3>
                    <p className="text-gray-400 text-sm">
                      Centralized control with location-specific customization
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-orange-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Unlimited Scale</h3>
                    <p className="text-gray-400 text-sm">
                      No limits on members, staff, or usage
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-orange-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Dedicated Support</h3>
                    <p className="text-gray-400 text-sm">
                      Priority support with dedicated account management
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="font-semibold mb-3">What you'll get:</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• Custom onboarding & training</li>
                  <li>• API access for integrations</li>
                  <li>• Custom feature development</li>
                  <li>• SLA guarantees</li>
                  <li>• White-label options</li>
                  <li>• Bulk pricing discounts</li>
                </ul>
              </div>
            </div>

            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Gyms</label>
                    <select
                      value={formData.gymCount}
                      onChange={(e) => setFormData({ ...formData, gymCount: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">Select</option>
                      <option value="1">1</option>
                      <option value="2-5">2-5</option>
                      <option value="6-10">6-10</option>
                      <option value="11-25">11-25</option>
                      <option value="26+">26+</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Members</label>
                    <select
                      value={formData.memberCount}
                      onChange={(e) => setFormData({ ...formData, memberCount: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">Select</option>
                      <option value="<500">&lt;500</option>
                      <option value="500-1000">500-1,000</option>
                      <option value="1000-5000">1,000-5,000</option>
                      <option value="5000-10000">5,000-10,000</option>
                      <option value="10000+">10,000+</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tell us about your needs</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                    placeholder="What features are most important to you?"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Request Demo & Pricing
                    </>
                  )}
                </button>
              </form>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                We'll respond within 24 hours. For immediate assistance, call +44 7490 253471
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}