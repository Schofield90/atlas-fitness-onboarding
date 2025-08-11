import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { UniversalDataProcessor } from '@/app/lib/ai/processing/universal-processor'
import { RealTimeProcessor } from '@/app/lib/ai/processing/real-time-processor'

// Keep track of initialized organizations
const initializedOrgs = new Set<string>()
const processors = new Map<string, RealTimeProcessor>()

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from request body
    const user = await requireAuth()
    const organizationId = user.organizationId
    
    const { processHistorical = false } = await request.json()
    
    // Check if already initialized
    if (initializedOrgs.has(organizationId)) {
      return NextResponse.json({ 
        message: 'AI already initialized for this organization',
        status: 'already_initialized'
      })
    }
    
    // Initialize real-time processor
    const realTimeProcessor = new RealTimeProcessor()
    await realTimeProcessor.initialize(organizationId)
    processors.set(organizationId, realTimeProcessor)
    
    // Process historical data if requested
    if (processHistorical) {
      const universalProcessor = new UniversalDataProcessor()
      
      // Process in background
      universalProcessor.processHistoricalData(organizationId)
        .then(() => {
          console.log(`Historical data processing completed for org: ${organizationId}`)
        })
        .catch((error) => {
          console.error(`Error processing historical data for org ${organizationId}:`, error)
        })
    }
    
    // Mark as initialized
    initializedOrgs.add(organizationId)
    
    return NextResponse.json({ 
      message: 'AI brain initialized successfully',
      status: 'initialized',
      features: {
        realTimeProcessing: true,
        historicalDataProcessing: processHistorical,
        proactiveInsights: true,
        federatedLearning: true
      }
    })
  } catch (error) {
    console.error('AI initialization error:', error)
    return createErrorResponse(error)
  }
}

// Cleanup endpoint
export async function DELETE(request: NextRequest) {
  try {
    // SECURITY: Get authenticated user's organization - NEVER accept from request body
    const user = await requireAuth()
    const organizationId = user.organizationId
    
    // Shutdown real-time processor
    const processor = processors.get(organizationId)
    if (processor) {
      await processor.shutdown()
      processors.delete(organizationId)
    }
    
    // Remove from initialized set
    initializedOrgs.delete(organizationId)
    
    return NextResponse.json({ 
      message: 'AI brain shutdown successfully',
      status: 'shutdown'
    })
  } catch (error) {
    console.error('AI shutdown error:', error)
    return createErrorResponse(error)
  }
}