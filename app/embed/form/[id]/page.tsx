'use client'

import { useState } from 'react'

interface FormParams {
  params: { id: string }
}

export default function EmbedForm({ params }: FormParams) {
  const { id } = params
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    fitness_goals: [] as string[],
    preferred_location: '',
    preferred_time: '',
    current_fitness_level: '',
    interested_in: [] as string[]
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const fitnessGoals = [
    'Weight Loss',
    'Muscle Building',
    'General Fitness',
    'Athletic Performance',
    'Rehabilitation'
  ]

  const interestedInOptions = [
    'Personal Training',
    'Group Classes',
    'Gym Membership',
    'Nutrition Coaching'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/forms/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Form-ID': id
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setSuccess(true)
      // Track conversion if analytics is available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'form_submit', {
          form_id: id,
          lead_id: data.leadId
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const toggleArrayField = (field: 'fitness_goals' | 'interested_in', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }))
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600">We&apos;ll be in touch within 24 hours to help you start your fitness journey.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Start Your Fitness Journey</h2>
          <p className="text-gray-600 mb-8">Get your FREE trial and personalized fitness plan</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone (for exclusive offers)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+44 7XXX XXXXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are your fitness goals? (Select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {fitnessGoals.map(goal => (
                  <label key={goal} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.fitness_goals.includes(goal)}
                      onChange={() => toggleArrayField('fitness_goals', goal)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Location
              </label>
              <select
                value={formData.preferred_location}
                onChange={(e) => setFormData({...formData, preferred_location: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a location</option>
                <option value="harrogate">Harrogate - Claro Court</option>
                <option value="york">York - Auster Road</option>
                <option value="either">Either location works</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Best time to train?
              </label>
              <select
                value={formData.preferred_time}
                onChange={(e) => setFormData({...formData, preferred_time: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select preferred time</option>
                <option value="early_morning">Early Morning (6am-8am)</option>
                <option value="morning">Morning (8am-12pm)</option>
                <option value="afternoon">Afternoon (12pm-5pm)</option>
                <option value="evening">Evening (5pm-8pm)</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current fitness level
              </label>
              <select
                value={formData.current_fitness_level}
                onChange={(e) => setFormData({...formData, current_fitness_level: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select your level</option>
                <option value="beginner">Beginner - New to fitness</option>
                <option value="intermediate">Intermediate - Train occasionally</option>
                <option value="advanced">Advanced - Train regularly</option>
                <option value="athlete">Athlete - Competitive training</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interested in:
              </label>
              <div className="grid grid-cols-2 gap-3">
                {interestedInOptions.map(option => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.interested_in.includes(option)}
                      onChange={() => toggleArrayField('interested_in', option)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Get Your FREE Trial'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              By submitting, you agree to receive communications about our services. 
              We respect your privacy and you can unsubscribe anytime.
            </p>
          </form>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Powered by Atlas Fitness
          </p>
        </div>
      </div>
    </div>
  )
}