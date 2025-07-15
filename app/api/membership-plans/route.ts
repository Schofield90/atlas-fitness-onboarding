import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/membership-plans - Get all membership plans for organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const isActive = searchParams.get('is_active');
    const accessLevel = searchParams.get('access_level');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('membership_plans')
      .select(`
        *,
        _count:memberships(count)
      `)
      .eq('organization_id', organizationId)
      .order('price', { ascending: true });

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }
    if (accessLevel) {
      query = query.eq('access_level', accessLevel);
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('Error fetching membership plans:', error);
      return NextResponse.json({ error: 'Failed to fetch membership plans' }, { status: 500 });
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error in GET /api/membership-plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/membership-plans - Create a new membership plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      name,
      description,
      price,
      billing_cycle = 'monthly',
      features = [],
      access_level = 'basic',
      class_limit,
      guest_passes = 0,
      is_active = true,
    } = body;

    // Validate required fields
    if (!organization_id || !name || !price) {
      return NextResponse.json({ 
        error: 'Organization ID, name, and price are required' 
      }, { status: 400 });
    }

    // Validate billing cycle
    const validBillingCycles = ['monthly', 'quarterly', 'annual', 'one_time'];
    if (!validBillingCycles.includes(billing_cycle)) {
      return NextResponse.json({ 
        error: 'Invalid billing cycle' 
      }, { status: 400 });
    }

    // Validate access level
    const validAccessLevels = ['basic', 'premium', 'vip'];
    if (!validAccessLevels.includes(access_level)) {
      return NextResponse.json({ 
        error: 'Invalid access level' 
      }, { status: 400 });
    }

    // Create the membership plan
    const planData = {
      organization_id,
      name,
      description,
      price: parseFloat(price),
      billing_cycle,
      features,
      access_level,
      class_limit,
      guest_passes,
      is_active,
    };

    const { data: plan, error: insertError } = await supabaseAdmin
      .from('membership_plans')
      .insert([planData])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating membership plan:', insertError);
      return NextResponse.json({ error: 'Failed to create membership plan' }, { status: 500 });
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error in POST /api/membership-plans:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}