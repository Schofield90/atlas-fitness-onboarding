'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Users, UserPlus, Settings, BarChart3, MessageSquare, Zap, Calendar, UserCog,
  Megaphone, MessageCircle, Globe, Brain, CreditCard, FileText, Plug, Apple, Layout, Link2, CalendarDays
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Leads', href: '/dashboard/leads', icon: UserPlus },
    { name: 'Members', href: '/dashboard/members', icon: Users },
    { name: 'Clients', href: '/dashboard/clients', icon: UserCog },
    { name: 'Nutrition', href: '/dashboard/nutrition', icon: Apple },
    { name: 'Class Calendar', href: '/class-calendar', icon: CalendarDays },
    { name: 'Google Calendar', href: '/dashboard/google-calendar', icon: Calendar },
    { name: 'Booking Links', href: '/dashboard/booking-links', icon: Link2 },
    { name: 'Staff', href: '/dashboard/staff', icon: UserCog },
    { name: 'Marketing', href: '/dashboard/marketing', icon: Megaphone },
    { name: 'Surveys', href: '/dashboard/surveys', icon: MessageCircle },
    { name: 'Website', href: '/dashboard/website', icon: Globe },
    { name: 'Landing Pages', href: '/dashboard/landing-pages', icon: Layout },
    { name: 'AI Insights', href: '/dashboard/ai', icon: Brain },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'SOPs', href: '/dashboard/sops', icon: FileText },
    { name: 'Automations', href: '/dashboard/automations', icon: Zap },
    { name: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Gym Coach Platform</h2>
        <p className="text-sm text-gray-600 mt-1">AI-Powered CRM</p>
      </div>
      
      <nav className="mt-6 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                isActive 
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700" 
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 mr-3",
                isActive ? "text-blue-700" : "text-gray-400"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Quick Stats */}
      <div className="mt-8 mx-3 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Active Leads</span>
            <span className="font-medium">42</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">New Today</span>
            <span className="font-medium text-green-600">+8</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Conversions</span>
            <span className="font-medium">24%</span>
          </div>
        </div>
      </div>
    </div>
  )
}