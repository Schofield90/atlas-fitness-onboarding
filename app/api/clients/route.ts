import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/clients - Get all clients for organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const assignedTrainer = searchParams.get('assigned_trainer');
    const fitnessLevel = searchParams.get('fitness_level');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('clients')
      .select(`
        *,
        assigned_trainer_info:user_profiles!assigned_trainer(full_name, email, avatar_url),
        memberships(
          id,
          status,
          start_date,
          end_date,
          monthly_price,
          next_payment_date,
          classes_used,
          guest_passes_used,
          plan:membership_plans(
            id,
            name,
            description,
            price,
            billing_cycle,
            features,
            access_level,
            class_limit,
            guest_passes
          )
        ),
        lead:leads(
          id,
          source,
          qualification_score,
          created_at as lead_created_at
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (assignedTrainer) {
      query = query.eq('assigned_trainer', assignedTrainer);
    }
    if (fitnessLevel) {
      query = query.eq('fitness_level', fitnessLevel);
    }
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: clients, error } = await query;

    if (error) {
      console.error('Error fetching clients:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (status) countQuery = countQuery.eq('status', status);
    if (assignedTrainer) countQuery = countQuery.eq('assigned_trainer', assignedTrainer);
    if (fitnessLevel) countQuery = countQuery.eq('fitness_level', fitnessLevel);
    if (search) countQuery = countQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { count } = await countQuery;

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/clients - Create a new client directly (not from lead conversion)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      postcode,
      country = 'UK',
      emergency_name,
      emergency_phone,
      emergency_relationship,
      medical_conditions,
      medications,
      fitness_level,
      goals,
      assigned_trainer,
      notes,
      tags,
      // user_id, // For activity tracking
    } = body;

    // Validate required fields
    if (!organization_id || !first_name || !last_name || !email) {
      return NextResponse.json({ 
        error: 'Organization ID, first name, last name, and email are required' 
      }, { status: 400 });
    }

    // Check if email already exists for this organization
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('email', email)
      .single();

    if (existingClient) {
      return NextResponse.json({ 
        error: 'A client with this email already exists' 
      }, { status: 400 });
    }

    // Create the client
    const clientData = {
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender,
      address,
      city,
      postcode,
      country,
      emergency_name,
      emergency_phone,
      emergency_relationship,
      medical_conditions,
      medications,
      fitness_level,
      goals,
      status: 'active',
      assigned_trainer,
      joined_date: new Date().toISOString().split('T')[0],
      notes,
      tags,
    };

    const { data: client, error: insertError } = await supabaseAdmin
      .from('clients')
      .insert([clientData])
      .select(`
        *,
        assigned_trainer_info:user_profiles!assigned_trainer(full_name, email, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating client:', insertError);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Error in POST /api/clients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}