'use client'

import Link from 'next/link'
import { ArrowLeft, Brain, MessageSquare, Calendar, ChefHat, Dumbbell, CreditCard, BarChart3, Users } from 'lucide-react'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Platform Features</h1>
          <p className="text-xl text-gray-300">Everything you need to run a successful gym</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="space-y-8">
            <div>
              <div className="flex items-center mb-4">
                <Brain className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">AI-Powered Intelligence</h2>
              </div>
              <p className="text-gray-300">
                Leverage artificial intelligence to score leads, generate content, provide nutrition coaching,
                and predict member behavior. Our AI learns from your data to provide increasingly accurate insights.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-4">
                <MessageSquare className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">Omnichannel Communication</h2>
              </div>
              <p className="text-gray-300">
                Reach members where they are with WhatsApp, SMS, email, and voice calls. Create automated
                campaigns, send broadcast messages, and maintain two-way conversations all from one platform.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-4">
                <Calendar className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">Smart Scheduling</h2>
              </div>
              <p className="text-gray-300">
                Manage classes, personal training, and consultations with ease. Automated waitlists,
                Google Calendar sync, and custom booking pages make scheduling effortless for both staff and members.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-4">
                <ChefHat className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">Nutrition Coaching</h2>
              </div>
              <p className="text-gray-300">
                AI-powered meal planning with macro tracking, personalized recommendations, and coach oversight.
                Members get custom nutrition plans while coaches can monitor progress and provide feedback.
              </p>
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <div className="flex items-center mb-4">
                <Dumbbell className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">Workout Programming</h2>
              </div>
              <p className="text-gray-300">
                Create and assign custom workout plans with video demonstrations. Track member progress,
                adjust programs automatically, and provide real-time coaching feedback through the app.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-4">
                <CreditCard className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">Integrated Payments</h2>
              </div>
              <p className="text-gray-300">
                Process payments seamlessly with Stripe Connect. Handle recurring memberships, one-time payments,
                packages, and marketplace transactions with automated billing and invoicing.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-4">
                <BarChart3 className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
              </div>
              <p className="text-gray-300">
                Get real-time insights into your gym's performance. Track revenue, member retention,
                class attendance, and lead conversion with beautiful dashboards and custom reports.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-4">
                <Users className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-bold">Member Portal</h2>
              </div>
              <p className="text-gray-300">
                Give members their own portal to book classes, track progress, access meal plans,
                communicate with coaches, and manage their membership - all from any device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}