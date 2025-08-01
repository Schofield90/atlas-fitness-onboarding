'use client'

import { Calendar, Home, User, CreditCard, Activity, LogOut, Menu, X } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/client-portal/login')
      return
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (!clientData) {
      router.push('/client-portal/login')
      return
    }

    setClient(clientData)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/client-portal/login')
  }

  const navigation = [
    { name: 'Home', icon: Home, href: '/client' },
    { name: 'Schedule', icon: Calendar, href: '/client/schedule' },
    { name: 'My Classes', icon: Activity, href: '/client/bookings' },
    { name: 'Membership', icon: CreditCard, href: '/client/membership' },
    { name: 'Profile', icon: User, href: '/client/profile' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't show sidebar on the main client page - it has its own layout
  if (pathname === '/client') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileMenuOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/20" aria-hidden="true" onClick={() => setMobileMenuOpen(false)} />
        <nav className="fixed top-0 left-0 bottom-0 flex w-full max-w-xs flex-col bg-white">
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b">
            <span className="text-xl font-semibold">Atlas Fitness</span>
            <button
              type="button"
              className="-m-2.5 p-2.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-y-7 px-6 pb-4">
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => {
                          const Icon = item.icon
                          const isActive = pathname === item.href
                          return (
                            <li key={item.name}>
                              <button
                                onClick={() => {
                                  router.push(item.href)
                                  setMobileMenuOpen(false)
                                }}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full
                                  ${isActive
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                                  }
                                `}
                              >
                                <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                {item.name}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                    <li className="mt-auto">
                      <button
                        onClick={handleLogout}
                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-gray-900 w-full"
                      >
                        <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                        Sign out
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-2xl font-bold text-gray-900">Atlas Fitness</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => router.push(item.href)}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full
                            ${isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                            }
                          `}
                        >
                          <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                          {item.name}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex flex-col gap-2 pb-4">
                  <div className="px-2 py-3 text-sm text-gray-700">
                    <p className="font-semibold">{client?.name || 'Member'}</p>
                    <p className="text-gray-500">{client?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">Atlas Fitness</div>
      </div>

      <main className="lg:pl-72">
        {children}
      </main>
    </div>
  )
}