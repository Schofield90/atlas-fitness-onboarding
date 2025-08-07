import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import { getOrganization } from '@/app/lib/organization-server'
import { SOPTrainingRecordInsert, SOPTrainingRecordUpdate, TRAINING_STATUSES } from '@/app/lib/types/sop'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Get training record for current user
    const { data: trainingRecord, error } = await supabase
      .from('sop_training_records')
      .select(`
        *,
        sop:sops(title, training_required),
        user:users(name, email)
      `)
      .eq('sop_id', params.id)
      .eq('user_id', user.id)
      .eq('organization_id', organization.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching training record:', error)
      return NextResponse.json({ error: 'Failed to fetch training record' }, { status: 500 })
    }

    return NextResponse.json({
      training_record: trainingRecord || null
    })
  } catch (error) {
    console.error('Error in training GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // Verify SOP exists and requires training
    const { data: sop, error: sopError } = await supabase
      .from('sops')
      .select('id, title, training_required')
      .eq('id', params.id)
      .eq('organization_id', organization.id)
      .single()

    if (sopError || !sop) {
      return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
    }

    if (!sop.training_required && action === 'start') {
      return NextResponse.json({ 
        error: 'Training is not required for this SOP' 
      }, { status: 400 })
    }

    // Check if training record already exists
    const { data: existingRecord } = await supabase
      .from('sop_training_records')
      .select('id, status')
      .eq('sop_id', params.id)
      .eq('user_id', user.id)
      .eq('organization_id', organization.id)
      .single()

    if (action === 'start') {
      if (existingRecord) {
        return NextResponse.json({ 
          error: 'Training record already exists' 
        }, { status: 400 })
      }

      // Create new training record
      const trainingData: SOPTrainingRecordInsert = {
        sop_id: params.id,
        user_id: user.id,
        organization_id: organization.id,
        status: TRAINING_STATUSES.IN_PROGRESS,
        assigned_at: new Date().toISOString(),
        started_at: new Date().toISOString()
      }

      const { data: trainingRecord, error } = await supabase
        .from('sop_training_records')
        .insert(trainingData)
        .select(`
          *,
          sop:sops(title, training_required),
          user:users(name, email)
        `)
        .single()

      if (error) {
        console.error('Error creating training record:', error)
        return NextResponse.json({ error: 'Failed to start training' }, { status: 500 })
      }

      return NextResponse.json({ 
        training_record: trainingRecord 
      }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in training POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notes, quiz_score, quiz_passed } = body

    // Get existing training record
    const { data: existingRecord, error: fetchError } = await supabase
      .from('sop_training_records')
      .select('*')
      .eq('sop_id', params.id)
      .eq('user_id', user.id)
      .eq('organization_id', organization.id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 })
    }

    let updateData: SOPTrainingRecordUpdate = {}

    if (action === 'complete') {
      updateData = {
        status: TRAINING_STATUSES.COMPLETED,
        completed_at: new Date().toISOString(),
        notes,
        quiz_score,
        quiz_passed,
        updated_at: new Date().toISOString()
      }
    } else if (action === 'update_progress') {
      updateData = {
        notes,
        quiz_score,
        quiz_passed,
        updated_at: new Date().toISOString()
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: trainingRecord, error } = await supabase
      .from('sop_training_records')
      .update(updateData)
      .eq('id', existingRecord.id)
      .select(`
        *,
        sop:sops(title, training_required),
        user:users(name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating training record:', error)
      return NextResponse.json({ error: 'Failed to update training record' }, { status: 500 })
    }

    return NextResponse.json({ training_record: trainingRecord })
  } catch (error) {
    console.error('Error in training PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}