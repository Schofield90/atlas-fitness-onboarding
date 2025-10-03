import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient()
    
    // Get all knowledge entries
    const { data: knowledge, error } = await adminSupabase
      .from('knowledge')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch knowledge',
        details: error.message 
      }, { status: 500 })
    }

    // Get knowledge by type
    const { data: knowledgeByType } = await adminSupabase
      .from('knowledge')
      .select('type')
      .order('type')

    const typeCounts: Record<string, number> = {}
    knowledgeByType?.forEach(k => {
      typeCounts[k.type] = (typeCounts[k.type] || 0) + 1
    })

    // Check for real gym data
    const hasRealData = knowledge?.some(k => 
      k.content.includes('Atlas Fitness') ||
      k.content.includes('Harrogate') ||
      k.content.includes('York') ||
      k.content.includes('Sam Schofield')
    )

    // Get organization-specific knowledge
    const { data: orgKnowledge } = await adminSupabase
      .from('organization_knowledge')
      .select('*')
      .limit(10)

    return NextResponse.json({
      summary: {
        totalKnowledge: knowledge?.length || 0,
        hasRealData,
        knowledgeByType: typeCounts,
        hasOrganizationKnowledge: (orgKnowledge?.length || 0) > 0
      },
      sampleKnowledge: knowledge?.slice(0, 5).map(k => ({
        type: k.type,
        content: k.content.substring(0, 200) + '...',
        organizationId: k.organization_id,
        createdAt: k.created_at
      })),
      organizationKnowledge: orgKnowledge?.slice(0, 5).map(k => ({
        organizationId: k.organization_id,
        category: k.category,
        content: k.content.substring(0, 200) + '...'
      }))
    })
  } catch (error) {
    console.error('Knowledge check error:', error)
    return NextResponse.json({ 
      error: 'Failed to check knowledge data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}