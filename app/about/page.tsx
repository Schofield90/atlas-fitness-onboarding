'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">About Atlas Fitness</h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-gray-300 mb-8">
              Atlas Fitness is the complete AI-powered platform designed specifically for modern gyms and fitness businesses.
            </p>
            
            <div className="bg-gray-800 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-gray-300">
                To empower fitness businesses with cutting-edge technology that automates operations,
                enhances member experience, and drives sustainable growth.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">Why Atlas?</h2>
              <p className="text-gray-300 mb-4">
                Built by gym owners, for gym owners. We understand the unique challenges of running a fitness business
                because we've been there. Atlas combines years of industry experience with the latest in AI and automation
                technology to create a platform that actually works.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Our Values</h2>
              <ul className="space-y-3 text-gray-300">
                <li>• <strong>Innovation:</strong> Continuously pushing boundaries with AI and automation</li>
                <li>• <strong>Simplicity:</strong> Powerful features that are easy to use</li>
                <li>• <strong>Reliability:</strong> 99.9% uptime guarantee</li>
                <li>• <strong>Support:</strong> Real humans who understand your business</li>
                <li>• <strong>Growth:</strong> Your success is our success</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}