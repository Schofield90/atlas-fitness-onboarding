'use client'

import { Calendar, Home, User, CreditCard, Activity, LogOut, Menu, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export default function ClientDashboard() {
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
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

    // Get client details
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
    { name: 'Home', icon: Home, id: 'home', href: '/client' },
    { name: 'Schedule', icon: Calendar, id: 'schedule', href: '/client/schedule' },
    { name: 'My Classes', icon: Activity, id: 'bookings', href: '/client/bookings' },
    { name: 'Membership', icon: CreditCard, id: 'membership', href: '/client/membership' },
    { name: 'Profile', icon: User, id: 'profile', href: '/client/profile' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
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
                          return (
                            <li key={item.name}>
                              <button
                                onClick={() => {
                                  setActiveTab(item.id)
                                  router.push(item.href)
                                  setMobileMenuOpen(false)
                                }}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full
                                  ${activeTab === item.id
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
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => {
                            setActiveTab(item.id)
                            router.push(item.href)
                          }}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full
                            ${activeTab === item.id
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
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          {/* Welcome section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back, {client?.name?.split(' ')[0] || 'Member'}!</h2>
            <p className="mt-1 text-sm text-gray-600">Here's what's happening with your fitness journey.</p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Classes This Month</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">12</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Credits Remaining</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">8</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Next Class</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">Today, 6:00 PM</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Member Since</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">Jan 2024</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => router.push('/client/schedule')}
                className="relative group bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <div>
                  <Calendar className="h-10 w-10 mb-3" />
                  <h4 className="text-lg font-semibold">Book a Class</h4>
                  <p className="mt-1 text-blue-100">View schedule and reserve your spot</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/client/bookings')}
                className="relative group bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white hover:from-green-600 hover:to-green-700 transition-all"
              >
                <div>
                  <Activity className="h-10 w-10 mb-3" />
                  <h4 className="text-lg font-semibold">My Bookings</h4>
                  <p className="mt-1 text-green-100">Manage your upcoming classes</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/client/membership')}
                className="relative group bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white hover:from-purple-600 hover:to-purple-700 transition-all"
              >
                <div>
                  <CreditCard className="h-10 w-10 mb-3" />
                  <h4 className="text-lg font-semibold">Membership</h4>
                  <p className="mt-1 text-purple-100">View and manage your plan</p>
                </div>
              </button>
            </div>
          </div>

          {/* Upcoming classes preview */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Your Upcoming Classes</h3>
              <button
                onClick={() => router.push('/client/bookings')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              <div className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">HIIT Circuit</h4>
                    <p className="text-sm text-gray-600">Today at 6:00 PM - Sarah Johnson</p>
                    <p className="text-sm text-gray-500">Harrogate Studio</p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Confirmed</span>
                </div>
              </div>
              <div className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">Yoga Flow</h4>
                    <p className="text-sm text-gray-600">Tomorrow at 7:00 AM - Emma Wilson</p>
                    <p className="text-sm text-gray-500">York Studio</p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Confirmed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}