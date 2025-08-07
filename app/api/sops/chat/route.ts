import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import { getOrganization } from '@/app/lib/organization-server'
import { SOPProcessor } from '@/app/lib/services/sopProcessor'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      question, 
      sopId, 
      contextSopIds = [], 
      conversationHistory = [] 
    } = body

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const processor = SOPProcessor.getInstance()

    // Get main SOP if specified
    let mainSop = null
    if (sopId) {
      const { data: sop, error } = await supabase
        .from('sops')
        .select('*')
        .eq('id', sopId)
        .eq('organization_id', organization.id)
        .single()

      if (error) {
        return NextResponse.json({ error: 'SOP not found' }, { status: 404 })
      }
      mainSop = sop
    }

    // Get context SOPs
    let contextSops = []
    if (contextSopIds.length > 0) {
      const { data: sops, error } = await supabase
        .from('sops')
        .select('id, title, content')
        .eq('organization_id', organization.id)
        .in('id', contextSopIds)

      if (!error && sops) {
        contextSops = sops
      }
    }

    // If no main SOP specified, search for relevant SOPs
    if (!mainSop && !contextSops.length) {
      // Use search to find relevant SOPs
      const queryEmbedding = await processor.generateEmbedding(question)

      const { data: searchSops, error } = await supabase
        .from('sops')
        .select('id, title, content, embedding')
        .eq('organization_id', organization.id)
        .not('embedding', 'is', null)
        .limit(5)

      if (!error && searchSops) {
        // Calculate similarity and get top matches
        const relevantSops = []
        
        for (const sop of searchSops) {
          try {
            const sopEmbedding = JSON.parse(sop.embedding)
            const similarity = cosineSimilarity(queryEmbedding, sopEmbedding)
            
            if (similarity > 0.6) {
              relevantSops.push({ ...sop, similarity })
            }
          } catch (error) {
            console.error(`Error processing SOP ${sop.id}:`, error)
            continue
          }
        }

        relevantSops.sort((a, b) => b.similarity - a.similarity)
        contextSops = relevantSops.slice(0, 3)
        
        if (relevantSops.length > 0) {
          mainSop = relevantSops[0]
        }
      }
    }

    if (!mainSop && !contextSops.length) {
      return NextResponse.json({ 
        error: 'No relevant SOPs found for your question' 
      }, { status: 404 })
    }

    // Generate response using AI
    const response = await processor.generateSOPResponse(
      question,
      mainSop?.content || '',
      mainSop?.title || 'General SOPs',
      contextSops.map(sop => `${sop.title}: ${sop.content}`)
    )

    // Log the conversation for analytics
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('sop_chat_logs')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          sop_id: mainSop?.id,
          question,
          answer: response.answer,
          confidence: response.confidence,
          context_sop_ids: contextSops.map(sop => sop.id)
        })
        .catch(error => console.error('Error logging chat:', error))
    }

    return NextResponse.json({
      answer: response.answer,
      confidence: response.confidence,
      sources: response.sources,
      followUpQuestions: response.followUpQuestions,
      relatedSops: contextSops.map(sop => ({
        id: sop.id,
        title: sop.title
      })),
      mainSop: mainSop ? {
        id: mainSop.id,
        title: mainSop.title
      } : null
    })
  } catch (error) {
    console.error('Error in SOP chat:', error)
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const organization = await getOrganization()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const url = new URL(request.url)
    const sopId = url.searchParams.get('sopId')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    if (!sopId) {
      return NextResponse.json({ error: 'SOP ID is required' }, { status: 400 })
    }

    // Get recent chat history for this SOP
    const { data: chatHistory, error } = await supabase
      .from('sop_chat_logs')
      .select(`
        *,
        user:users(name, email)
      `)
      .eq('organization_id', organization.id)
      .eq('sop_id', sopId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching chat history:', error)
      return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
    }

    return NextResponse.json({
      chatHistory: chatHistory || []
    })
  } catch (error) {
    console.error('Error in SOP chat history:', error)
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}