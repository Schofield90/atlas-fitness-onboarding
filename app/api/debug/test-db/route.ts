import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Test database connection and permissions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Testing database connection...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Test 1: Can we connect to the database?
    const { data: testConnection, error: connectionError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);

    if (connectionError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: connectionError.message,
        code: connectionError.code,
        hint: connectionError.hint
      }, { status: 500 });
    }

    // Test 2: Can we see existing organizations?
    const { data: existingOrgs, error: selectError } = await supabase
      .from('organizations')
      .select('*')
      .limit(5);

    // Test 3: Can we insert a test organization?
    const testOrgName = `Test Org ${Date.now()}`;
    const { data: insertTest, error: insertError } = await supabase
      .from('organizations')
      .insert({
        name: testOrgName
      })
      .select()
      .single();

    // Clean up test data
    if (insertTest) {
      await supabase
        .from('organizations')
        .delete()
        .eq('id', insertTest.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Database tests completed',
      results: {
        connection: 'OK',
        existingOrgs: existingOrgs?.length || 0,
        insertTest: insertError ? `Failed: ${insertError.message}` : 'OK',
        selectError: selectError?.message || null,
        insertError: insertError?.message || null,
        serviceRoleKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        usingAnonKey: !process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      env: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }, { status: 500 });
  }
}