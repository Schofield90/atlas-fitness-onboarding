import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-service'

// Node positioning helper
function getNodePosition(index: number, type: string) {
  const baseX = 100
  const baseY = 100
  const xSpacing = 300
  const ySpacing = 150
  
  if (type === 'trigger') {
    return { x: baseX, y: baseY }
  }
  
  // Arrange other nodes in a flow pattern
  return {
    x: baseX + (xSpacing * Math.floor(index / 3)),
    y: baseY + (ySpacing * (index % 3 + 1))
  }
}

// Parse workflow description into nodes and edges
function parseWorkflowDescription(description: string) {
  const nodes: any[] = []
  const edges: any[] = []
  let nodeIdCounter = 1
  
  // Keywords to identify different parts
  const triggerKeywords = ['when', 'if', 'on', 'after']
  const actionKeywords = ['send', 'wait', 'add', 'create', 'update', 'assign']
  const conditionKeywords = ['if', 'unless', 'check']
  
  // Simple parsing logic
  const sentences = description.toLowerCase().split(/[,.]/).map(s => s.trim()).filter(s => s)
  
  sentences.forEach((sentence, index) => {
    let nodeType = 'action'
    let label = 'Action'
    let nodeDescription = sentence
    
    // Detect trigger
    if (index === 0 && triggerKeywords.some(keyword => sentence.includes(keyword))) {
      nodeType = 'trigger'
      
      if (sentence.includes('new lead') || sentence.includes('lead')) {
        label = 'New Lead'
        nodeDescription = 'When a new lead is created'
        if (sentence.includes('facebook')) {
          nodeDescription += ' from Facebook'
        }
      } else if (sentence.includes('form')) {
        label = 'Form Submitted'
        nodeDescription = 'When a form is submitted'
      } else if (sentence.includes('appointment') || sentence.includes('booking')) {
        label = 'Appointment Scheduled'
        nodeDescription = 'When an appointment is scheduled'
      }
    }
    // Detect wait action
    else if (sentence.includes('wait')) {
      const timeMatch = sentence.match(/(\d+)\s*(minute|hour|day|second)/i)
      if (timeMatch) {
        label = 'Wait'
        nodeDescription = `Wait for ${timeMatch[1]} ${timeMatch[2]}${parseInt(timeMatch[1]) > 1 ? 's' : ''}`
      }
    }
    // Detect send actions
    else if (sentence.includes('send')) {
      if (sentence.includes('sms') || sentence.includes('text')) {
        label = 'Send SMS'
        nodeDescription = 'Send an SMS message'
      } else if (sentence.includes('email')) {
        label = 'Send Email'
        nodeDescription = 'Send an email to the lead'
      } else if (sentence.includes('whatsapp')) {
        label = 'Send WhatsApp'
        nodeDescription = 'Send a WhatsApp message'
      } else {
        label = 'Send Message'
        nodeDescription = 'Send a message'
      }
    }
    // Detect tag action
    else if (sentence.includes('tag') || sentence.includes('label')) {
      label = 'Add Tag'
      nodeDescription = 'Add a tag to the lead'
    }
    // Detect condition
    else if (sentence.includes("don't respond") || sentence.includes('no response')) {
      nodeType = 'condition'
      label = 'If/Else'
      nodeDescription = 'Check if lead responded'
    }
    
    const nodeId = `node_${nodeIdCounter++}`
    const position = getNodePosition(index, nodeType)
    
    nodes.push({
      id: nodeId,
      type: nodeType,
      position,
      data: {
        label,
        description: nodeDescription
      }
    })
    
    // Create edge from previous node
    if (index > 0) {
      edges.push({
        id: `edge_${index}`,
        source: nodes[index - 1].id,
        target: nodeId,
        type: 'smoothstep'
      })
    }
  })
  
  return { nodes, edges }
}

// Generate workflow suggestions based on prompt
function generateSuggestions(prompt: string): string[] {
  const suggestions = []
  
  // Lead nurturing suggestions
  if (prompt.toLowerCase().includes('lead') || prompt.toLowerCase().includes('nurtur')) {
    suggestions.push('Consider adding a lead scoring action to prioritize hot leads')
    suggestions.push('Add a condition to check if the lead has opened previous emails')
    suggestions.push('Include a task assignment for sales team follow-up after 3 touchpoints')
  }
  
  // Welcome sequence suggestions
  if (prompt.toLowerCase().includes('welcome') || prompt.toLowerCase().includes('new')) {
    suggestions.push('Add a welcome email with gym introduction and special offer')
    suggestions.push('Schedule a personal training consultation within first week')
    suggestions.push('Send class schedule and beginner-friendly class recommendations')
  }
  
  // Appointment suggestions
  if (prompt.toLowerCase().includes('appointment') || prompt.toLowerCase().includes('reminder')) {
    suggestions.push('Add SMS reminder 24 hours before appointment')
    suggestions.push('Include location details and parking information')
    suggestions.push('Send post-appointment follow-up to gather feedback')
  }
  
  // Re-engagement suggestions
  if (prompt.toLowerCase().includes('inactive') || prompt.toLowerCase().includes('re-engage')) {
    suggestions.push('Segment by last activity date for personalized messaging')
    suggestions.push('Offer a special comeback discount or free session')
    suggestions.push('Use multiple channels (email, SMS, WhatsApp) for better reach')
  }
  
  // General best practices
  suggestions.push('Test different timing delays to optimize engagement')
  suggestions.push('Add tags to track workflow performance and lead journey')
  
  return suggestions.slice(0, 3) // Return top 3 suggestions
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }
    
    const { prompt } = await request.json()
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    
    // Parse the prompt to generate workflow
    const workflow = parseWorkflowDescription(prompt)
    
    // Generate helpful suggestions
    const suggestions = generateSuggestions(prompt)
    
    // Return the generated workflow and suggestions
    return NextResponse.json({
      success: true,
      workflow,
      suggestions,
      message: 'Workflow generated successfully. You can now customize each node by clicking on it.'
    })
    
  } catch (error: any) {
    console.error('Workflow assistant error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate workflow' },
      { status: 500 }
    )
  }
}