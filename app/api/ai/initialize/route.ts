import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import { UniversalDataProcessor } from '@/app/lib/ai/processing/universal-processor'
import { RealTimeProcessor } from '@/app/lib/ai/processing/real-time-processor'

// Keep track of initialized organizations
const initializedOrgs = new Set<string>()
const processors = new Map<string, RealTimeProcessor>()

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user's organization
    const { organizationId: userOrgId, error: authError } = await getCurrentUserOrganization()
    if (authError || !userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { organizationId, processHistorical = false } = await request.json()
    
    // Verify user has access to this organization
    if (organizationId !== userOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
    return NextResponse.json(
      { error: 'Failed to initialize AI' },
      { status: 500 }
    )
  }
}

// Cleanup endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { organizationId } = await request.json()
    
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
    return NextResponse.json(
      { error: 'Failed to shutdown AI' },
      { status: 500 }
    )
  }
}