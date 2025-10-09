'use client'

import { useState, useRef, useEffect } from 'react'
import { useOrganization } from '@/app/hooks/useOrganization'
import { ChevronDown, Building2, Check, Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OrganizationSwitcher() {
  const {
    organization,
    availableOrganizations,
    switchOrganization,
    isLoading
  } = useOrganization()

  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSwitch = async (orgId: string) => {
    if (orgId === organization?.id) {
      setIsOpen(false)
      return
    }

    setSwitching(true)
    try {
      await switchOrganization(orgId)
      // Page will reload after successful switch
    } catch (error) {
      console.error('Failed to switch organization:', error)
      setSwitching(false)
      setIsOpen(false)
    }
  }

  const getRoleBadge = (role?: string) => {
    const roleColors: Record<string, string> = {
      owner: 'bg-purple-600 text-white',
      superadmin: 'bg-red-600 text-white',
      admin: 'bg-blue-600 text-white',
      staff: 'bg-gray-600 text-white',
    }

    const roleLabels: Record<string, string> = {
      owner: 'Owner',
      superadmin: 'Super Admin',
      admin: 'Admin',
      staff: 'Staff',
    }

    if (!role) return null

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[role] || 'bg-gray-600 text-white'}`}>
        {roleLabels[role] || role}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    )
  }

  // Don't show switcher if user has no organizations or only one
  if (!organization || availableOrganizations.length <= 1) {
    return null
  }

  // Find current org in available orgs to get role
  const currentOrgWithRole = availableOrganizations.find(org => org.id === organization.id)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Organization Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-3 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors min-w-[240px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Building2 className="h-5 w-5 text-gray-400" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-white">
            {organization.name}
          </div>
          {currentOrgWithRole?.role && (
            <div className="mt-0.5">
              {getRoleBadge(currentOrgWithRole.role)}
            </div>
          )}
        </div>
        {switching ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Switch Organization
              </div>
              {availableOrganizations.map((org) => {
                const isCurrentOrg = org.id === organization?.id

                return (
                  <button
                    key={org.id}
                    onClick={() => handleSwitch(org.id)}
                    disabled={switching}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors
                      ${isCurrentOrg
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700 text-gray-300'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {org.name}
                      </div>
                      <div className="mt-1">
                        {getRoleBadge(org.role)}
                      </div>
                    </div>
                    {isCurrentOrg && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                )
              })}

              {/* Create New Organization Button */}
              <div className="border-t border-gray-700 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/onboarding/create-organization')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Create New Organization</span>
                </button>
              </div>
            </div>

            {/* Show count if super admin */}
            {currentOrgWithRole?.role === 'superadmin' && (
              <div className="px-5 py-3 border-t border-gray-700 bg-gray-900">
                <p className="text-xs text-gray-400">
                  {availableOrganizations.length} {availableOrganizations.length === 1 ? 'organization' : 'organizations'} available
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
