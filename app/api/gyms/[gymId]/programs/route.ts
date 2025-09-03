import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gymId: string }> }
) {
  const params = await context.params;
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json([], { status: 200 })
    }
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get programs for this gym
    const { data: programs, error } = await supabase
      .from('gym_programs')
      .select('*')
      .eq('gym_id', params.gymId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching programs:', error);
      return NextResponse.json([], { status: 200 }); // Return empty array instead of error
    }

    return NextResponse.json(programs || []);
  } catch (error) {
    console.error('Error in programs API:', error);
    return NextResponse.json([], { status: 200 }); // Return empty array for any errors
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gymId: string }> }
) {
  const params = await context.params;
  
  try {
    const body = await request.json();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, serviceKey)

    if (body.action === 'create_samples') {
      // Create sample programs for this gym
      const samplePrograms = [
        {
          gym_id: params.gymId,
          name: 'Morning HIIT',
          description: 'High-intensity interval training to start your day strong',
          price: 15.00,
          duration_minutes: 45,
          max_participants: 15,
          is_active: true
        },
        {
          gym_id: params.gymId,
          name: 'Strength & Conditioning',
          description: 'Build muscle and improve your overall strength',
          price: 20.00,
          duration_minutes: 60,
          max_participants: 10,
          is_active: true
        },
        {
          gym_id: params.gymId,
          name: 'Yoga Flow',
          description: 'Relaxing flow for flexibility and mindfulness',
          price: 12.00,
          duration_minutes: 60,
          max_participants: 20,
          is_active: true
        },
        {
          gym_id: params.gymId,
          name: 'Free Trial Class',
          description: 'Try our gym with a complimentary session',
          price: 0.00,
          duration_minutes: 45,
          max_participants: 8,
          is_active: true
        }
      ];

      const { data, error } = await supabase
        .from('gym_programs')
        .insert(samplePrograms)
        .select();

      if (error) {
        console.error('Error creating sample programs:', error);
        return NextResponse.json(
          { error: 'Failed to create sample programs', details: error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Sample programs created successfully',
        programs: data
      });
    }

    // Handle other POST actions here (create individual program, etc.)
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in programs POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error },
      { status: 500 }
    );
  }
}