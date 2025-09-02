'use client'

import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 text-center">Contact Sales</h1>
          <p className="text-xl text-gray-300 mb-8 text-center">
            Get in touch with our team to learn how Atlas can help your gym grow
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <Mail className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Email</h3>
              <p className="text-gray-400">sales@atlas-fitness.com</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <Phone className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Phone</h3>
              <p className="text-gray-400">+44 20 1234 5678</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <MapPin className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Office</h3>
              <p className="text-gray-400">London, UK</p>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
            <form className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  className="bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  className="bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400"
                />
              </div>
              
              <input
                type="email"
                placeholder="Email"
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400"
              />
              
              <input
                type="text"
                placeholder="Gym Name"
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400"
              />
              
              <textarea
                placeholder="Tell us about your gym and goals"
                rows={4}
                className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400"
              />
              
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}