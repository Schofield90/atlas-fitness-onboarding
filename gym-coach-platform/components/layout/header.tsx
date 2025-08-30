'use client'

import { Bell, Search, User, Plus, Calendar, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useClickOutside } from '@/hooks/use-click-outside'
import { Popover, PopoverTrigger, PopoverContent, PopoverItem } from '@/components/ui/popover'
import { Drawer, DrawerTrigger, DrawerContent, DrawerItem } from '@/components/ui/drawer'

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  
  const router = useRouter()
  const notificationsRef = useClickOutside<HTMLDivElement>(() => setShowNotifications(false))
  const profileRef = useClickOutside<HTMLDivElement>(() => setShowProfile(false))

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      title: 'New lead assigned',
      message: 'John Doe has been assigned to you',
      time: '2 minutes ago',
      unread: true
    },
    {
      id: 2,
      title: 'Client payment received',
      message: '£129 payment from Sarah Johnson',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 3,
      title: 'Campaign performance',
      message: 'Facebook campaign exceeded budget',
      time: '3 hours ago',
      unread: true
    }
  ]

  const handleCreateLead = () => {
    setShowPlusMenu(false)
    router.push('/dashboard/leads?action=new')
  }

  const handleCreateTask = () => {
    setShowPlusMenu(false)
    toast('Coming soon - Task creation feature')
  }

  const handleScheduleMeeting = () => {
    setShowPlusMenu(false)
    // This would open the existing calendar modal
    toast('Schedule meeting modal would open here')
  }

  const handleMarkAllRead = () => {
    toast.success('All notifications marked as read')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads, clients, or campaigns..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Plus Button - Create Actions */}
          <Popover open={showPlusMenu} onOpenChange={setShowPlusMenu}>
            <PopoverTrigger asChild>
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Create new item"
                data-testid="plus-button"
                aria-label="Create new item"
              >
                <Plus className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48">
              <PopoverItem
                onClick={handleCreateLead}
                data-testid="create-lead-option"
              >
                <User className="w-4 h-4 mr-2" />
                Create lead
              </PopoverItem>
              <PopoverItem
                onClick={handleCreateTask}
                disabled
                data-testid="create-task-option"
                className="opacity-50 cursor-not-allowed"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Create task
                <span className="ml-auto text-xs text-gray-400">(Coming soon)</span>
              </PopoverItem>
              <PopoverItem
                onClick={handleScheduleMeeting}
                data-testid="schedule-meeting-option"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule meeting
              </PopoverItem>
            </PopoverContent>
          </Popover>
          {/* Notifications */}
          <Drawer open={showNotifications} onOpenChange={setShowNotifications}>
            <DrawerTrigger asChild>
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative transition-colors"
                title="View notifications"
                data-testid="notifications-bell"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.filter(n => n.unread).length}
                </span>
              </button>
            </DrawerTrigger>
            <DrawerContent title="Notifications">
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  data-testid="mark-all-read-button"
                >
                  Mark all read
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <DrawerItem
                    key={notification.id}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </DrawerItem>
                ))}
              </div>
            </DrawerContent>
          </Drawer>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium">John Doe</span>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <p className="font-medium text-gray-900">John Doe</p>
                  <p className="text-sm text-gray-600">john@example.com</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                    Organization Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                    Help & Support
                  </button>
                  <hr className="my-2" />
                  <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}