import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Test with both keys
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const orgId = '63589490-8f55-4157-bd3a-e141594b740e';

    // Test 1: Anon key query
    const { data: anonData, error: anonError } = await anonSupabase
      .from('organizations')
      .select('*')
      .eq('id', orgId);

    // Test 2: Service role query
    const { data: serviceData, error: serviceError } = await serviceSupabase
      .from('organizations')
      .select('*')
      .eq('id', orgId);

    // Test 3: Check if RLS is enabled
    const { data: rlsCheck } = await serviceSupabase
      .rpc('check_rls_enabled', { table_name: 'organizations' })
      .single()
      .catch(() => ({ data: null }));

    return NextResponse.json({
      orgId,
      anonKey: {
        found: anonData?.length || 0,
        error: anonError?.message || null,
        data: anonData
      },
      serviceKey: {
        found: serviceData?.length || 0,
        error: serviceError?.message || null,
        data: serviceData
      },
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      rlsEnabled: rlsCheck,
      suggestion: !anonData?.length && serviceData?.length 
        ? 'RLS is blocking anon access. Run the SQL policies or disable RLS on organizations table.'
        : 'Check if organization exists with this ID'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}