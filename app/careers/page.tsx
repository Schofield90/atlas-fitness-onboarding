'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'

export default function CareersPage() {
  const positions = [
    {
      title: 'Senior Full Stack Developer',
      location: 'Remote',
      type: 'Full-time',
      department: 'Engineering'
    },
    {
      title: 'Customer Success Manager',
      location: 'London, UK',
      type: 'Full-time',
      department: 'Customer Success'
    },
    {
      title: 'AI/ML Engineer',
      location: 'Remote',
      type: 'Full-time',
      department: 'Engineering'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl text-gray-300">Help us revolutionize the fitness industry</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Why Work at Atlas?</h2>
            <ul className="space-y-2 text-gray-300">
              <li>✓ Remote-first culture</li>
              <li>✓ Competitive compensation</li>
              <li>✓ Health and wellness benefits</li>
              <li>✓ Professional development budget</li>
              <li>✓ Work on cutting-edge AI technology</li>
            </ul>
          </div>
          
          <h2 className="text-2xl font-bold mb-6">Open Positions</h2>
          <div className="space-y-4">
            {positions.map((position) => (
              <div key={position.title} className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">{position.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {position.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {position.type}
                  </span>
                  <span>{position.department}</span>
                </div>
                <button className="mt-4 text-orange-500 hover:text-orange-400">
                  View Details →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}