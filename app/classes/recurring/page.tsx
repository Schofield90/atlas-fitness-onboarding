'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Calendar, Edit, Plus } from 'lucide-react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { createClient } from '@/app/lib/supabase/client'
import { useOrganization } from '@/app/hooks/useOrganization'

interface ClassType {
  id: string
  name: string
  description?: string
  price_pennies: number
  is_active: boolean
  metadata?: Record<string, any>
  sessions_count?: number
}

export default function RecurringClassesPage() {
  const router = useRouter()
  const { organizationId } = useOrganization()
  const supabase = createClient()

  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!organizationId) return
      setLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('programs')
          .select(`*, class_sessions(count)`) 
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        const transformed = (data || []).map((p: any) => ({
          ...p,
          sessions_count: p.class_sessions?.[0]?.count || 0
        }))
        setClassTypes(transformed)
      } catch (e: any) {
        console.error('Failed to load class types for recurring page:', e)
        setError(e.message || 'Failed to load class types')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [organizationId])

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Recurring Classes</h1>
            <p className="text-gray-400 mt-1">Choose a class type to manage recurring schedules.</p>
          </div>
          <button
            onClick={() => router.push('/classes')}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Class Type
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-400">Loading class types...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && !error && classTypes.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg shadow">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-white">No class types yet</h3>
            <p className="mt-1 text-gray-400">Create a class type to set up recurring schedules.</p>
            <button
              onClick={() => router.push('/classes')}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Class Type
            </button>
          </div>
        )}

        {!loading && !error && classTypes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classTypes.map((ct) => (
              <div key={ct.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{ct.name}</h3>
                    {ct.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{ct.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-gray-300 text-sm">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  {ct.sessions_count || 0} sessions
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => router.push(`/classes/${ct.id}`)}
                    className="px-3 py-2 text-sm text-white bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Class Type
                  </button>
                  <button
                    onClick={() => router.push(`/classes/${ct.id}?tab=sessions`)}
                    className="px-3 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Manage Recurring
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

