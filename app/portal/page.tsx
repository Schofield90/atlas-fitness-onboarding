'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Home, Calendar, MessageSquare, User, Activity, Dumbbell } from 'lucide-react'
import toast from '@/app/lib/toast'
import InterfaceSwitcher from '@/app/components/InterfaceSwitcher'

export default function MemberPortal() {
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [memberData, setMemberData] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/portal/login')
        return
      }

      setUser(authUser)

      // Fetch member data
      const { data: client } = await supabase
        .from('clients')
        .select(`
          *,
          organization:organizations(name, logo_url),
          membership:memberships(*)
        `)
        .eq('email', authUser.email)
        .single()

      if (client) {
        setMemberData(client)
      }
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/portal/login')
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab memberData={memberData} />
      case 'bookings':
        return <BookingsTab memberData={memberData} />
      case 'nutrition':
        return <NutritionTab memberData={memberData} />
      case 'messages':
        return <MessagesTab memberData={memberData} />
      case 'profile':
        return <ProfileTab memberData={memberData} user={user} />
      default:
        return <HomeTab memberData={memberData} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {memberData?.organization?.logo_url && (
              <img 
                src={memberData.organization.logo_url} 
                alt="Logo" 
                className="h-8 w-8 rounded"
              />
            )}
            <div>
              <h1 className="text-lg font-bold">
                {memberData?.organization?.name || 'Gym Portal'}
              </h1>
              <p className="text-xs text-gray-400">Member Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <InterfaceSwitcher currentInterface="member" />
            <button
              onClick={() => {
                supabase.auth.signOut()
                router.push('/portal/login')
              }}
              className="text-sm text-gray-400 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around py-2">
          <TabButton
            icon={<Home className="w-5 h-5" />}
            label="Home"
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <TabButton
            icon={<Calendar className="w-5 h-5" />}
            label="Bookings"
            active={activeTab === 'bookings'}
            onClick={() => setActiveTab('bookings')}
          />
          <TabButton
            icon={<Dumbbell className="w-5 h-5" />}
            label="Nutrition"
            active={activeTab === 'nutrition'}
            onClick={() => setActiveTab('nutrition')}
          />
          <TabButton
            icon={<MessageSquare className="w-5 h-5" />}
            label="Messages"
            active={activeTab === 'messages'}
            onClick={() => setActiveTab('messages')}
          />
          <TabButton
            icon={<User className="w-5 h-5" />}
            label="Profile"
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </nav>
    </div>
  )
}

function TabButton({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
        active 
          ? 'text-orange-500' 
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  )
}

// Home Tab Component
function HomeTab({ memberData }: any) {
  return (
    <div className="p-4 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">
          Welcome back, {memberData?.first_name || 'Member'}!
        </h2>
        <p className="text-gray-400">
          Your membership status: {' '}
          <span className={`font-medium ${
            memberData?.membership_status === 'active' 
              ? 'text-green-500' 
              : 'text-yellow-500'
          }`}>
            {memberData?.membership_status || 'Pending'}
          </span>
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-3xl font-bold text-orange-500">12</div>
          <div className="text-sm text-gray-400">Classes This Month</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-500">85%</div>
          <div className="text-sm text-gray-400">Goal Progress</div>
        </div>
      </div>

      {/* Upcoming Classes */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-bold mb-3">Upcoming Classes</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <div>
              <div className="font-medium">HIIT Training</div>
              <div className="text-sm text-gray-400">Tomorrow, 9:00 AM</div>
            </div>
            <button className="px-3 py-1 bg-orange-600 rounded text-sm">
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Bookings Tab Component
function BookingsTab({ memberData }: any) {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('attendee_email', memberData?.email)
        .order('start_time', { ascending: false })

      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Bookings</h2>
      
      <div className="mb-4">
        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium">
          Book a New Class
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-gray-800 rounded-lg p-4">
              <div className="font-medium">{booking.title}</div>
              <div className="text-sm text-gray-400">
                {new Date(booking.start_time).toLocaleString()}
              </div>
              <div className="mt-2 flex gap-2">
                <button className="text-sm text-orange-500">Reschedule</button>
                <button className="text-sm text-red-500">Cancel</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No bookings yet. Book your first class!
        </div>
      )}
    </div>
  )
}

// Nutrition Tab Component
function NutritionTab({ memberData }: any) {
  const [activeNutritionTab, setActiveNutritionTab] = useState('coach')

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Nutrition</h2>
      
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveNutritionTab('coach')}
          className={`px-4 py-2 rounded-lg ${
            activeNutritionTab === 'coach'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          AI Coach
        </button>
        <button
          onClick={() => setActiveNutritionTab('tracking')}
          className={`px-4 py-2 rounded-lg ${
            activeNutritionTab === 'tracking'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          Tracking
        </button>
        <button
          onClick={() => setActiveNutritionTab('inbody')}
          className={`px-4 py-2 rounded-lg ${
            activeNutritionTab === 'inbody'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          InBody
        </button>
      </div>

      {activeNutritionTab === 'coach' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">AI Nutrition Coach</h3>
          <div className="space-y-3">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-sm text-orange-500 mb-1">AI Coach</div>
              <div>Hi! I'm your personal nutrition coach. What are your fitness goals?</div>
            </div>
            <input
              type="text"
              placeholder="Ask about nutrition, meal plans, or macros..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      )}

      {activeNutritionTab === 'tracking' && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-3">Today's Macros</h3>
            <div className="space-y-2">
              <MacroBar label="Protein" current={85} target={150} color="blue" />
              <MacroBar label="Carbs" current={120} target={200} color="green" />
              <MacroBar label="Fats" current={45} target={60} color="yellow" />
            </div>
          </div>
          <button className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg">
            Log Food
          </button>
        </div>
      )}

      {activeNutritionTab === 'inbody' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">InBody Results</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Muscle Mass</span>
              <span className="font-bold">32.5 kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Body Fat</span>
              <span className="font-bold">18.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">BMI</span>
              <span className="font-bold">23.4</span>
            </div>
            <div className="text-sm text-gray-400 mt-3">
              Last scan: 2 weeks ago
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MacroBar({ label, current, target, color }: any) {
  const percentage = (current / target) * 100
  const colorClass = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500'
  }[color] || 'bg-gray-500'

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{current}g / {target}g</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

// Messages Tab Component
function MessagesTab({ memberData }: any) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')

  return (
    <div className="p-4 h-[calc(100vh-200px)]">
      <h2 className="text-xl font-bold mb-4">Messages</h2>
      
      <div className="bg-gray-800 rounded-lg h-full flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3 max-w-[80%]">
              <div className="text-xs text-gray-400 mb-1">Coach Sarah</div>
              <div>Great job on your workout today! Keep it up!</div>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-orange-600 rounded-lg p-3 max-w-[80%]">
              <div>Thanks! Looking forward to tomorrow's session</div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button className="px-4 py-2 bg-orange-600 rounded-lg">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Profile Tab Component
function ProfileTab({ memberData, user }: any) {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Profile</h2>
      
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-bold mb-3">Personal Information</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Name</label>
            <div className="font-medium">
              {memberData?.first_name} {memberData?.last_name}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <div className="font-medium">{memberData?.email}</div>
          </div>
          <div>
            <label className="text-sm text-gray-400">Phone</label>
            <div className="font-medium">{memberData?.phone || 'Not set'}</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-bold mb-3">Membership</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Plan</label>
            <div className="font-medium">Premium Monthly</div>
          </div>
          <div>
            <label className="text-sm text-gray-400">Status</label>
            <div className="font-medium text-green-500">Active</div>
          </div>
          <div>
            <label className="text-sm text-gray-400">Member Since</label>
            <div className="font-medium">
              {memberData?.created_at 
                ? new Date(memberData.created_at).toLocaleDateString()
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <button className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg">
        Edit Profile
      </button>
    </div>
  )
}