import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import { getOrganization } from '@/app/lib/organization-server'
import { SOP_STATUSES, TRAINING_STATUSES } from '@/app/lib/types/sop'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { organization } = await getOrganization()

    if (!organization || !organization.id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    // Get SOP counts by status
    const { data: sops, error: sopsError } = await supabase
      .from('sops')
      .select('status, training_required')
      .eq('organization_id', organization.id)

    if (sopsError) {
      console.error('Error fetching SOPs for stats:', sopsError)
      return NextResponse.json({ error: 'Failed to fetch SOP statistics' }, { status: 500 })
    }

    // Calculate SOP statistics
    const sopStats = {
      total: sops?.length || 0,
      approved: sops?.filter(sop => sop.status === SOP_STATUSES.APPROVED).length || 0,
      review: sops?.filter(sop => sop.status === SOP_STATUSES.REVIEW).length || 0,
      draft: sops?.filter(sop => sop.status === SOP_STATUSES.DRAFT).length || 0,
      archived: sops?.filter(sop => sop.status === SOP_STATUSES.ARCHIVED).length || 0,
      training_required: sops?.filter(sop => sop.training_required).length || 0
    }

    // Get training statistics
    const { data: trainingRecords, error: trainingError } = await supabase
      .from('sop_training_records')
      .select('status, completed_at, assigned_at')
      .eq('organization_id', organization.id)

    if (trainingError) {
      console.error('Error fetching training records for stats:', trainingError)
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const trainingStats = {
      total_assigned: trainingRecords?.length || 0,
      completed: trainingRecords?.filter(record => record.status === TRAINING_STATUSES.COMPLETED).length || 0,
      in_progress: trainingRecords?.filter(record => record.status === TRAINING_STATUSES.IN_PROGRESS).length || 0,
      assigned: trainingRecords?.filter(record => record.status === TRAINING_STATUSES.ASSIGNED).length || 0,
      overdue: trainingRecords?.filter(record => {
        if (record.status !== TRAINING_STATUSES.ASSIGNED && record.status !== TRAINING_STATUSES.IN_PROGRESS) {
          return false
        }
        const assignedDate = new Date(record.assigned_at)
        return assignedDate < thirtyDaysAgo // Consider overdue after 30 days
      }).length || 0,
      completion_rate: trainingRecords?.length ? 
        Math.round((trainingRecords.filter(record => record.status === TRAINING_STATUSES.COMPLETED).length / trainingRecords.length) * 100) : 0
    }

    // Get category statistics
    const { data: categories, error: categoriesError } = await supabase
      .from('sops')
      .select('category')
      .eq('organization_id', organization.id)

    const categoryStats = {}
    if (categories) {
      categories.forEach(sop => {
        if (sop.category) {
          categoryStats[sop.category] = (categoryStats[sop.category] || 0) + 1
        }
      })
    }

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const { data: recentSOPs, error: recentSOPsError } = await supabase
      .from('sops')
      .select('id, title, status, created_at, updated_at')
      .eq('organization_id', organization.id)
      .or(`created_at.gte.${sevenDaysAgo.toISOString()},updated_at.gte.${sevenDaysAgo.toISOString()}`)
      .order('updated_at', { ascending: false })
      .limit(10)

    const { data: recentTraining, error: recentTrainingError } = await supabase
      .from('sop_training_records')
      .select(`
        id, status, completed_at, created_at,
        sop:sops(title),
        user:users(name)
      `)
      .eq('organization_id', organization.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    const recentActivity = []

    // Add recent SOP activities
    if (recentSOPs) {
      recentSOPs.forEach(sop => {
        const isNew = new Date(sop.created_at) >= sevenDaysAgo
        recentActivity.push({
          type: isNew ? 'sop_created' : 'sop_updated',
          title: sop.title,
          timestamp: isNew ? sop.created_at : sop.updated_at,
          status: sop.status
        })
      })
    }

    // Add recent training activities
    if (recentTraining) {
      recentTraining.forEach(record => {
        if (record.status === TRAINING_STATUSES.COMPLETED && record.completed_at) {
          recentActivity.push({
            type: 'training_completed',
            title: record.sop?.title,
            user: record.user?.name,
            timestamp: record.completed_at
          })
        } else if (record.status === TRAINING_STATUSES.ASSIGNED) {
          recentActivity.push({
            type: 'training_assigned',
            title: record.sop?.title,
            user: record.user?.name,
            timestamp: record.created_at
          })
        }
      })
    }

    // Sort recent activity by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      ...sopStats,
      training: trainingStats,
      categories: categoryStats,
      recent_activity: recentActivity.slice(0, 10)
    })
  } catch (error) {
    console.error('Error fetching SOP statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}