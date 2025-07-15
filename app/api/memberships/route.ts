import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/memberships - Get all memberships for organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const planId = searchParams.get('plan_id');
    const clientId = searchParams.get('client_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const expiringWithin = searchParams.get('expiring_within'); // days

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('memberships')
      .select(`
        *,
        client:clients(
          id,
          first_name,
          last_name,
          email,
          phone,
          status,
          joined_date,
          assigned_trainer_info:user_profiles!assigned_trainer(full_name, email)
        ),
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
      `)
      .eq('client.organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (planId) {
      query = query.eq('plan_id', planId);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (expiringWithin) {
      const days = parseInt(expiringWithin);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      query = query.lte('next_payment_date', futureDate.toISOString().split('T')[0]);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: memberships, error } = await query;

    if (error) {
      console.error('Error fetching memberships:', error);
      return NextResponse.json({ error: 'Failed to fetch memberships' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('memberships')
      .select('client!inner(organization_id)', { count: 'exact', head: true })
      .eq('client.organization_id', organizationId);

    if (status) countQuery = countQuery.eq('status', status);
    if (planId) countQuery = countQuery.eq('plan_id', planId);
    if (clientId) countQuery = countQuery.eq('client_id', clientId);

    const { count } = await countQuery;

    return NextResponse.json({
      memberships,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /api/memberships:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/memberships - Create a new membership
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      client_id,
      plan_id,
      start_date,
      end_date,
      billing_date = 1,
      notes,
      user_id, // For activity tracking
    } = body;

    // Validate required fields
    if (!client_id || !plan_id || !start_date) {
      return NextResponse.json({ 
        error: 'Client ID, plan ID, and start date are required' 
      }, { status: 400 });
    }

    // Get the client and plan information
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('organization_id', client.organization_id)
      .single();

    if (planError) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }

    // Check if client already has an active membership
    const { data: existingMembership } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .eq('client_id', client_id)
      .eq('status', 'active')
      .single();

    if (existingMembership) {
      return NextResponse.json({ 
        error: 'Client already has an active membership' 
      }, { status: 400 });
    }

    // Calculate next payment date
    const nextPaymentDate = calculateNextPaymentDate(start_date, billing_date);

    // Create the membership
    const membershipData = {
      client_id,
      plan_id,
      status: 'active',
      start_date,
      end_date,
      monthly_price: plan.price,
      billing_date,
      next_payment_date: nextPaymentDate,
      classes_used: 0,
      guest_passes_used: 0,
      notes,
    };

    const { data: membership, error: insertError } = await supabaseAdmin
      .from('memberships')
      .insert([membershipData])
      .select(`
        *,
        client:clients(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
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
      `)
      .single();

    if (insertError) {
      console.error('Error creating membership:', insertError);
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
    }

    // Create activity record
    if (user_id) {
      await supabaseAdmin
        .from('client_activities')
        .insert([{
          client_id,
          user_id,
          type: 'membership_created',
          subject: 'New Membership Created',
          content: `New ${plan.name} membership created starting ${start_date}`,
          metadata: {
            membership_id: membership.id,
            plan_name: plan.name,
            monthly_price: plan.price,
            start_date,
            next_payment_date: nextPaymentDate,
          },
        }]);
    }

    return NextResponse.json({ membership });
  } catch (error) {
    console.error('Error in POST /api/memberships:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate next payment date
function calculateNextPaymentDate(startDate: string, billingDate: number): string {
  const start = new Date(startDate);
  const nextPayment = new Date(start);
  
  // Set to next month, same billing date
  nextPayment.setMonth(nextPayment.getMonth() + 1);
  nextPayment.setDate(billingDate);
  
  // Handle edge cases (e.g., billing date 31 in February)
  if (nextPayment.getDate() !== billingDate) {
    nextPayment.setDate(0); // Set to last day of previous month
  }
  
  return nextPayment.toISOString().split('T')[0];
}