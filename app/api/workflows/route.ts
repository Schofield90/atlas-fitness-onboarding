import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, nodes, edges, status } = body
    
    if (!name) {
      return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        name,
        description,
        nodes,
        edges,
        status: status || 'draft',
        trigger_type: nodes.find((n: any) => n.type === 'trigger')?.data?.label || 'manual'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving workflow:', error)
      return NextResponse.json({ error: 'Failed to save workflow' }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Workflow save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Workflow fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}