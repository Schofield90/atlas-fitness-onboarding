import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Dynamically import to avoid build-time execution
    const { getSystemStatus, performHealthCheck } = await import('@/app/lib/queue');
    
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const component = searchParams.get('component');
    
    if (detailed) {
      // Perform comprehensive health check
      const healthCheck = await performHealthCheck();
      const systemStatus = await getSystemStatus();
      
      return NextResponse.json({
        status: 'success',
        data: {
          health: healthCheck,
          system: systemStatus,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Quick status check
      const systemStatus = await getSystemStatus();
      
      return NextResponse.json({
        status: systemStatus.status === 'healthy' ? 'success' : 'warning',
        data: {
          overall: systemStatus.status,
          queues: Object.keys(systemStatus.queues).length,
          workers: Object.keys(systemStatus.workers).length,
          redis: systemStatus.connection.redis,
          timestamp: systemStatus.timestamp,
        },
      }, {
        status: systemStatus.status === 'critical' ? 503 : 200
      });
    }
    
  } catch (error) {
    console.error('Queue health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, {
      status: 503
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, queueName, jobId } = body;
    
    if (!action) {
      return NextResponse.json({
        status: 'error',
        message: 'Action is required',
      }, { status: 400 });
    }
    
    let result;
    
    switch (action) {
      case 'health-check':
        result = await performHealthCheck();
        break;
        
      case 'emergency-recovery':
        const queueModule = await import('@/app/lib/queue');
        await queueModule.emergencyRecovery();
        result = { recovered: true };
        break;
        
      default:
        return NextResponse.json({
          status: 'error',
          message: `Unknown action: ${action}`,
        }, { status: 400 });
    }
    
    return NextResponse.json({
      status: 'success',
      data: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Queue health action failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Health action failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, {
      status: 500
    });
  }
}