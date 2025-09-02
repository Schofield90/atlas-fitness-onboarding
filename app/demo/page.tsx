'use client'

import Link from 'next/link'
import { Calendar, ArrowLeft } from 'lucide-react'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Book a Demo</h1>
          <p className="text-xl text-gray-300 mb-8">
            See Atlas Fitness in action with a personalized demo
          </p>
          
          <div className="bg-gray-800 rounded-lg p-8">
            <Calendar className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">
              Our team will walk you through all the features and show you how Atlas can transform your gym's operations.
            </p>
            <a 
              href="mailto:demo@atlas-fitness.com?subject=Demo Request"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg"
            >
              Request Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}