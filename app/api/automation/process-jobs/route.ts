import { NextRequest, NextResponse } from 'next/server';
import { SimpleAutomationEngine } from '@/lib/automation/simple-automation-engine';

export async function POST(request: NextRequest) {
  try {
    // Verify this is coming from a trusted source (add auth header check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.AUTOMATION_CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Processing scheduled automation jobs...');
    
    // Process all pending automation jobs
    await SimpleAutomationEngine.processScheduledJobs();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Automation jobs processed successfully' 
    });

  } catch (error) {
    console.error('Error processing automation jobs:', error);
    return NextResponse.json({ 
      error: 'Failed to process automation jobs' 
    }, { status: 500 });
  }
}

// Allow GET for manual testing
export async function GET() {
  try {
    console.log('Manual processing of scheduled automation jobs...');
    
    await SimpleAutomationEngine.processScheduledJobs();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Automation jobs processed successfully (manual)' 
    });

  } catch (error) {
    console.error('Error processing automation jobs:', error);
    return NextResponse.json({ 
      error: 'Failed to process automation jobs' 
    }, { status: 500 });
  }
}