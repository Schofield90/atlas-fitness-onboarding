'use client'

import Link from 'next/link'
import { ArrowLeft, Book, MessageCircle, Video, FileText } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-xl text-gray-300">Get the support you need to succeed</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Book className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Documentation</h3>
            <p className="text-gray-400 text-sm">Comprehensive guides and tutorials</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Video className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Video Tutorials</h3>
            <p className="text-gray-400 text-sm">Step-by-step video walkthroughs</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <MessageCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Live Chat</h3>
            <p className="text-gray-400 text-sm">Chat with our support team</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <FileText className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Knowledge Base</h3>
            <p className="text-gray-400 text-sm">Search our extensive FAQ library</p>
          </div>
        </div>
        
        <div className="mt-12 bg-gray-800 rounded-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer text-lg font-medium">How do I get started?</summary>
              <p className="mt-2 text-gray-400">Sign up for a free 14-day trial, complete the onboarding process, and import your existing member data.</p>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer text-lg font-medium">Can I import my existing data?</summary>
              <p className="mt-2 text-gray-400">Yes! We support CSV imports for members, leads, and class schedules.</p>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer text-lg font-medium">What payment methods do you accept?</summary>
              <p className="mt-2 text-gray-400">We accept all major credit cards, debit cards, and bank transfers through Stripe.</p>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer text-lg font-medium">Is my data secure?</summary>
              <p className="mt-2 text-gray-400">Yes, we use enterprise-grade encryption and are SOC 2 compliant.</p>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}