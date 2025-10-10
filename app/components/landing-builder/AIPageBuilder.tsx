'use client'

import { useState } from 'react'
import { Wand2, X } from 'lucide-react'

interface AIPageBuilderProps {
  onGenerate: (description: string) => void
  loading?: boolean
}

export default function AIPageBuilder({ onGenerate, loading = false }: AIPageBuilderProps) {
  const [description, setDescription] = useState('')
  const [showDialog, setShowDialog] = useState(false)

  const handleGenerate = () => {
    if (description.trim().length < 10) {
      alert('Please provide a more detailed description (at least 10 characters)')
      return
    }
    onGenerate(description.trim())
    setShowDialog(false)
    setDescription('')
  }

  return (
    <>
      {/* AI Builder Button */}
      <button
        onClick={() => setShowDialog(true)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Wand2 className="w-5 h-5" />
        {loading ? 'Generating...' : 'AI Build Page'}
      </button>

      {/* AI Builder Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    AI Page Builder
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Describe your landing page and let AI build it for you
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <label className="block mb-2 text-sm font-medium text-gray-300">
                Describe your landing page
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Create a landing page for a fitness coaching service. Include a hero section with a sign-up form, features section highlighting personal training and nutrition plans, testimonials from clients, pricing tiers, and a call-to-action."
                className="w-full h-48 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                {description.length}/500 characters • Be specific about sections, features, and content
              </p>

              {/* Examples */}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-400 mb-2">Quick Examples:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDescription('Create a landing page for a SaaS product. Include hero with demo video, feature grid, customer testimonials, pricing table with 3 tiers, and FAQ section.')}
                    className="text-left p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-purple-600 transition-colors text-sm text-gray-300"
                  >
                    SaaS Product
                  </button>
                  <button
                    onClick={() => setDescription('Create a landing page for an online course. Hero with course intro, curriculum breakdown, instructor bio, student reviews, pricing options, and enrollment CTA.')}
                    className="text-left p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-purple-600 transition-colors text-sm text-gray-300"
                  >
                    Online Course
                  </button>
                  <button
                    onClick={() => setDescription('Create a landing page for a local gym. Hero with membership offer, class schedule, facility photos, trainer profiles, pricing plans, and contact form.')}
                    className="text-left p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-purple-600 transition-colors text-sm text-gray-300"
                  >
                    Gym/Fitness
                  </button>
                  <button
                    onClick={() => setDescription('Create a landing page for a marketing agency. Hero with results, services offered, case studies, client logos, team introduction, and consultation form.')}
                    className="text-left p-3 bg-gray-900 border border-gray-700 rounded-lg hover:border-purple-600 transition-colors text-sm text-gray-300"
                  >
                    Agency
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={description.trim().length < 10 || loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                Generate Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
