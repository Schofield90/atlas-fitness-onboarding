'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Activity, 
  Users, 
  CreditCard, 
  Bell, 
  Shield, 
  Palette,
  Database,
  Plug,
  ArrowRight,
  Check,
  FileText
} from 'lucide-react'

interface SettingsSection {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  status: 'complete' | 'incomplete' | 'warning'
  badges?: string[]
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const settingsSections: SettingsSection[] = [
    {
      id: 'organization',
      title: 'Organization Settings',
      description: 'Manage your gym\'s basic information, branding, and contact details',
      icon: Settings,
      href: '/dashboard/settings/organization',
      status: 'incomplete',
      badges: ['Basic Info', 'Branding']
    },
    {
      id: 'members',
      title: 'Member Management',
      description: 'Configure membership plans, pricing, and member-specific settings',
      icon: Users,
      href: '/dashboard/settings/membership-plans',
      status: 'incomplete',
      badges: ['Plans', 'Pricing']
    },
    {
      id: 'waivers',
      title: 'Waiver Templates',
      description: 'Create and manage digital waiver templates for liability, medical, and photo releases',
      icon: FileText,
      href: '/dashboard/settings/waivers',
      status: 'incomplete',
      badges: ['Templates', 'Digital Signatures']
    },
    {
      id: 'lookinbody',
      title: 'LookInBody Integration',
      description: 'Connect and configure your InBody scanner for body composition tracking',
      icon: Activity,
      href: '/dashboard/settings/lookinbody',
      status: 'complete',
      badges: ['API', 'Webhooks', 'Health Alerts']
    },
    {
      id: 'billing',
      title: 'Billing & Payments',
      description: 'Manage subscription, payment methods, and billing preferences',
      icon: CreditCard,
      href: '/dashboard/settings/billing',
      status: 'warning',
      badges: ['Subscription', 'Payment Methods']
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure email, SMS, and push notification preferences',
      icon: Bell,
      href: '/dashboard/settings/notifications',
      status: 'incomplete',
      badges: ['Email', 'SMS', 'Push']
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      description: 'Manage user permissions, API keys, and data privacy settings',
      icon: Shield,
      href: '/dashboard/settings/security',
      status: 'incomplete',
      badges: ['Permissions', 'API Keys', 'Privacy']
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel of your dashboard and client portal',
      icon: Palette,
      href: '/dashboard/settings/appearance',
      status: 'incomplete',
      badges: ['Theme', 'Branding']
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect with external services and manage API integrations',
      icon: Plug,
      href: '/dashboard/settings/integrations',
      status: 'incomplete',
      badges: ['APIs', 'Webhooks', 'Third-party']
    },
    {
      id: 'data',
      title: 'Data Management',
      description: 'Import/export data, backup settings, and data retention policies',
      icon: Database,
      href: '/dashboard/settings/data',
      status: 'incomplete',
      badges: ['Backup', 'Import/Export', 'Retention']
    }
  ]

  const getStatusBadge = (status: string) => {
    const styles = {
      complete: 'bg-green-100 text-green-800',
      incomplete: 'bg-gray-100 text-gray-600',
      warning: 'bg-yellow-100 text-yellow-800',
    }

    const labels = {
      complete: 'Complete',
      incomplete: 'Setup Required',
      warning: 'Needs Attention',
    }

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {status === 'complete' && <Check className="w-3 h-3 mr-1" />}
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const completedCount = settingsSections.filter(s => s.status === 'complete').length
  const progressPercentage = Math.round((completedCount / settingsSections.length) * 100)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your gym's configuration and integrations
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Setup Progress</div>
          <div className="text-2xl font-bold text-gray-900">{progressPercentage}%</div>
          <div className="text-sm text-gray-500">{completedCount} of {settingsSections.length} complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsSections.map((section) => (
          <Card 
            key={section.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onMouseEnter={() => setActiveSection(section.id)}
            onMouseLeave={() => setActiveSection(null)}
          >
            <Link href={section.href}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <section.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      {getStatusBadge(section.status)}
                    </div>
                  </div>
                  <ArrowRight 
                    className={`w-4 h-4 text-gray-400 transition-all ${
                      activeSection === section.id ? 'translate-x-1 text-blue-600' : ''
                    }`} 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed mb-4">
                  {section.description}
                </CardDescription>
                
                {/* Feature Badges */}
                <div className="flex flex-wrap gap-1">
                  {section.badges?.map((badge) => (
                    <Badge key={badge} variant="outline" className="text-xs">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <CardDescription>
            Complete these essential settings to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4" asChild>
              <Link href="/dashboard/settings/organization">
                <div className="text-left">
                  <div className="font-medium">Set up organization details</div>
                  <div className="text-sm text-gray-500 mt-1">Add your gym's name, logo, and contact information</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4" asChild>
              <Link href="/dashboard/settings/membership-plans">
                <div className="text-left">
                  <div className="font-medium">Create membership plans</div>
                  <div className="text-sm text-gray-500 mt-1">Define your membership tiers and pricing</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4" asChild>
              <Link href="/dashboard/settings/notifications">
                <div className="text-left">
                  <div className="font-medium">Configure notifications</div>
                  <div className="text-sm text-gray-500 mt-1">Set up email and SMS notifications</div>
                </div>
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4" asChild>
              <Link href="/dashboard/settings/integrations">
                <div className="text-left">
                  <div className="font-medium">Connect integrations</div>
                  <div className="text-sm text-gray-500 mt-1">Link your existing tools and services</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}