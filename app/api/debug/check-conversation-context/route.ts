import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Check if conversation_contexts table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('conversation_contexts')
      .select('id')
      .limit(1)
    
    // Check if functions exist
    const { data: functions, error: functionsError } = await supabase.rpc('pg_proc', {
      proname: 'get_conversation_context'
    }).select('*').limit(1).maybeSingle()
    
    // Get sample conversation contexts
    const { data: contexts, error: contextsError } = await supabase
      .from('conversation_contexts')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5)
    
    // Test the RPC function
    let rpcTest = null
    if (contexts && contexts.length > 0) {
      const firstContext = contexts[0]
      const { data: rpcResult, error: rpcError } = await supabase.rpc('get_conversation_context', {
        p_organization_id: firstContext.organization_id,
        p_phone_number: firstContext.phone_number,
        p_channel: firstContext.channel
      })
      rpcTest = { result: rpcResult, error: rpcError }
    }
    
    return NextResponse.json({
      tableStatus: {
        exists: !tableError,
        error: tableError?.message
      },
      sampleContexts: contexts || [],
      contextCount: contexts?.length || 0,
      rpcFunctionTest: rpcTest,
      debug: {
        tableCheckError: tableError,
        contextsError: contextsError
      }
    })
  } catch (error: any) {
    console.error('Error checking conversation context:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check conversation context',
        details: error.message
      },
      { status: 500 }
    )
  }
}