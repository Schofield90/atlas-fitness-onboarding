'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Building2, 
  Users, 
  Settings, 
  Mail, 
  Phone, 
  MessageCircle,
  Calendar,
  Zap,
  FileText,
  Tag,
  Bell,
  Shield,
  Activity,
  CreditCard,
  Globe,
  Database,
  ArrowLeft
} from 'lucide-react'

const settingsNavigation = [
  {
    category: "MY BUSINESS",
    items: [
      { name: "Business Profile", href: "/settings/business", icon: Building2 },
      { name: "My Staff", href: "/settings/staff", icon: Users },
      { name: "Custom Fields", href: "/settings/custom-fields", icon: Settings },
      { name: "Tags", href: "/settings/tags", icon: Tag },
    ]
  },
  {
    category: "INTEGRATIONS",
    items: [
      { name: "Email Services", href: "/settings/integrations/email", icon: Mail },
      { name: "Phone & SMS", href: "/settings/integrations/phone", icon: Phone },
      { name: "WhatsApp", href: "/settings/integrations/whatsapp", icon: MessageCircle },
      { name: "Google Calendar", href: "/settings/integrations/google", icon: Calendar },
      { name: "Payment Processing", href: "/settings/integrations/payments", icon: CreditCard },
      { name: "Website & Forms", href: "/settings/integrations/website", icon: Globe },
    ]
  },
  {
    category: "AUTOMATION",
    items: [
      { name: "Workflows", href: "/settings/workflows", icon: Zap },
      { name: "Email Templates", href: "/settings/templates", icon: FileText },
    ]
  },
  {
    category: "SYSTEM",
    items: [
      { name: "Notifications", href: "/settings/notifications", icon: Bell },
      { name: "Security", href: "/settings/security", icon: Shield },
      { name: "Data & Privacy", href: "/settings/data", icon: Database },
      { name: "Audit Logs", href: "/settings/audit", icon: Activity },
    ]
  }
]

export default function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </Link>
        <h2 className="text-xl font-bold text-white mt-4">Settings</h2>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-6 overflow-y-auto h-[calc(100%-120px)]">
        {settingsNavigation.map((section) => (
          <div key={section.category}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              {section.category}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                        ${isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}