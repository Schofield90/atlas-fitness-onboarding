'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { ChevronDown, Building, Plus, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  role: string
}

export default function OrganizationSwitcher() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all organizations the user has access to
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name
          )
        `)
        .eq('user_id', user.id)

      if (!userOrgsError && userOrgs) {
        const orgs = userOrgs
          .filter((uo: any) => uo.organizations)
          .map((uo: any) => ({
            id: uo.organizations.id,
            name: uo.organizations.name,
            role: uo.role
          }))
        
        setOrganizations(orgs)
        
        // Get current organization from localStorage or use first one
        const savedOrgId = localStorage.getItem('current_organization_id')
        const currentOrganization = orgs.find(org => org.id === savedOrgId) || orgs[0]
        
        if (currentOrganization) {
          setCurrentOrg(currentOrganization)
          localStorage.setItem('current_organization_id', currentOrganization.id)
        }
      }

      // Also check if user owns any organizations
      const { data: ownedOrgs, error: ownedError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_id', user.id)

      if (!ownedError && ownedOrgs) {
        // Add owned organizations that aren't already in the list
        ownedOrgs.forEach(org => {
          if (!organizations.find(o => o.id === org.id)) {
            const newOrg = { id: org.id, name: org.name, role: 'owner' }
            setOrganizations(prev => [...prev, newOrg])
            
            // If no current org, set this as current
            if (!currentOrg) {
              setCurrentOrg(newOrg)
              localStorage.setItem('current_organization_id', newOrg.id)
            }
          }
        })
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchOrganization = async (org: Organization) => {
    setCurrentOrg(org)
    localStorage.setItem('current_organization_id', org.id)
    setShowDropdown(false)
    
    // Reload the page to refresh all data with new organization context
    window.location.reload()
  }

  if (loading || organizations.length <= 1) {
    return null // Don't show switcher if only one organization
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Building className="h-4 w-4 text-gray-400" />
        <span className="text-sm text-white">{currentOrg?.name || 'Select Organization'}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full mt-2 right-0 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-2">
              <p className="text-xs text-gray-500 px-3 py-1">Switch Organization</p>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => switchOrganization(org)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <div>
                    <p className="text-sm text-white">{org.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{org.role}</p>
                  </div>
                  {currentOrg?.id === org.id && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))}
              
              <div className="border-t border-gray-700 mt-2 pt-2">
                <button
                  onClick={() => router.push('/onboarding/create-organization')}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  <Plus className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Create New Organization</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}