import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  try {
    const { organizationId } = await request.json();

    // Ensure we have service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        error: 'Missing SUPABASE_SERVICE_ROLE_KEY',
        hint: 'Add this to Vercel environment variables'
      }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test 1: Simple program insert
    const program1 = {
      organization_id: organizationId,
      name: 'Test Program 1',
      price_pennies: 1000,
      is_active: true
    };

    const { data: p1, error: e1 } = await supabase
      .from('programs')
      .insert(program1)
      .select();

    results.tests.push({
      test: 'Simple program insert',
      payload: program1,
      success: !e1,
      data: p1,
      error: e1 ? {
        message: e1.message,
        details: e1.details,
        hint: e1.hint,
        code: e1.code
      } : null
    });

    // Test 2: Program with all fields
    const program2 = {
      organization_id: organizationId,
      name: 'Test Program 2',
      description: 'Test description',
      price_pennies: 2000,
      max_participants: 10,
      program_type: 'ongoing',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: p2, error: e2 } = await supabase
      .from('programs')
      .insert(program2)
      .select();

    results.tests.push({
      test: 'Program with all fields',
      payload: program2,
      success: !e2,
      data: p2,
      error: e2 ? {
        message: e2.message,
        details: e2.details,
        hint: e2.hint,
        code: e2.code
      } : null
    });

    // Test 3: Check if programs table exists and get column info
    const { data: tableInfo, error: tableError } = await supabase
      .from('programs')
      .select('*')
      .limit(0);

    results.tableCheck = {
      exists: !tableError || !tableError.message.includes('does not exist'),
      error: tableError?.message
    };

    // Test 4: Try raw SQL query
    const { data: sqlTest, error: sqlError } = await supabase
      .rpc('exec_sql', { 
        query: `INSERT INTO programs (organization_id, name, price_pennies, is_active) 
                VALUES ($1, $2, $3, $4) 
                RETURNING *`,
        params: [organizationId, 'SQL Test Program', 3000, true]
      })
      .catch(() => ({ data: null, error: { message: 'RPC function not available' } }));

    results.tests.push({
      test: 'Raw SQL insert',
      success: !sqlError,
      data: sqlTest,
      error: sqlError?.message
    });

    // Clean up any successful test data
    if (p1?.[0]?.id) {
      await supabase.from('programs').delete().eq('id', p1[0].id);
    }
    if (p2?.[0]?.id) {
      await supabase.from('programs').delete().eq('id', p2[0].id);
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalTests: results.tests.length,
        passed: results.tests.filter((t: any) => t.success).length,
        failed: results.tests.filter((t: any) => !t.success).length
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}