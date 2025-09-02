'use client'

import Link from 'next/link'
import { ArrowLeft, Book, Code, Zap, Settings } from 'lucide-react'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-xl text-gray-300">Everything you need to know about Atlas Fitness</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6">
            <Book className="w-8 h-8 text-orange-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Getting Started</h2>
            <p className="text-gray-400 mb-4">Learn the basics and get your gym up and running quickly.</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Quick Start Guide</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Initial Setup</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Importing Data</a></li>
            </ul>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <Zap className="w-8 h-8 text-orange-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Features</h2>
            <p className="text-gray-400 mb-4">Deep dive into all Atlas features and capabilities.</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Lead Management</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Automation Workflows</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">AI Features</a></li>
            </ul>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <Code className="w-8 h-8 text-orange-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">API Reference</h2>
            <p className="text-gray-400 mb-4">Integrate Atlas with your existing systems.</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Authentication</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Endpoints</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Webhooks</a></li>
            </ul>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <Settings className="w-8 h-8 text-orange-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Admin Guide</h2>
            <p className="text-gray-400 mb-4">Configure and customize Atlas for your gym.</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-orange-500 hover:text-orange-400">User Management</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Billing & Payments</a></li>
              <li><a href="#" className="text-orange-500 hover:text-orange-400">Security Settings</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}