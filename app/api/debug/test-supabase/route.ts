import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results: any = {};
  
  try {
    // Test 1: Check environment variables
    results.environment = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
    };

    // Test 2: Try with anon key
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: anonTest, error: anonError } = await anonSupabase
      .from('organizations')
      .select('count')
      .limit(1);

    results.anonKeyTest = {
      success: !anonError,
      error: anonError?.message,
      code: anonError?.code
    };

    // Test 3: Try with service key (if available)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: serviceTest, error: serviceError } = await serviceSupabase
        .from('organizations')
        .select('count')
        .limit(1);

      results.serviceKeyTest = {
        success: !serviceError,
        error: serviceError?.message,
        code: serviceError?.code
      };

      // Test 4: Try to insert a test program (without explicit ID)
      const { data: insertTest, error: insertError } = await serviceSupabase
        .from('programs')
        .insert({
          organization_id: '63589490-8f55-4157-bd3a-e141594b740e',
          name: 'Test Program',
          price_pennies: 0,
          is_active: true
        })
        .select()
        .single();

      results.insertTest = {
        success: !insertError,
        error: insertError?.message,
        code: insertError?.code,
        hint: insertError?.hint,
        details: insertError?.details
      };

      // Clean up test data if successful
      if (insertTest && insertTest.id) {
        await serviceSupabase
          .from('programs')
          .delete()
          .eq('id', insertTest.id);
      }
    } else {
      results.serviceKeyTest = {
        error: 'SUPABASE_SERVICE_ROLE_KEY not found in environment variables'
      };
    }

    // Test 5: Check table structure
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get column info for programs table
      let columns = null;
      try {
        const { data } = await serviceSupabase
          .rpc('get_table_columns', { table_name: 'programs' });
        columns = data;
      } catch (e) {
        // RPC function might not exist
        columns = null;
      }

      results.tableStructure = {
        hasRpcFunction: !!columns,
        columns: columns
      };
    }

    return NextResponse.json({
      success: true,
      results,
      recommendation: !process.env.SUPABASE_SERVICE_ROLE_KEY 
        ? 'Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables'
        : 'Check Supabase dashboard for RLS policies or table permissions'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}