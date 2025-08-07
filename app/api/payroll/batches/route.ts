import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayrollService } from '@/app/lib/services/xero/PayrollService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/payroll/batches - Get all payroll batches
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const payrollService = new PayrollService(organizationId);
    
    const result = await payrollService.getPayrollBatches({
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.batches,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: result.total > offset + limit,
      },
    });

  } catch (error: any) {
    console.error('Error fetching payroll batches:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/payroll/batches - Create new payroll batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      name,
      payPeriodStart,
      payPeriodEnd,
      paymentDate,
      frequency,
      employeeIds,
    } = body;

    // Validation
    if (!organizationId || !name || !payPeriodStart || !payPeriodEnd || !paymentDate || !frequency) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(payPeriodStart);
    const endDate = new Date(payPeriodEnd);
    const payDate = new Date(paymentDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Pay period start date must be before end date' },
        { status: 400 }
      );
    }

    if (payDate < endDate) {
      return NextResponse.json(
        { success: false, error: 'Payment date must be after pay period end date' },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['weekly', 'fortnightly', 'monthly', 'custom'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pay frequency' },
        { status: 400 }
      );
    }

    const payrollService = new PayrollService(organizationId);
    
    const batch = await payrollService.createPayrollBatch({
      name,
      payPeriodStart,
      payPeriodEnd,
      paymentDate,
      frequency,
      employeeIds: employeeIds || [],
    });

    return NextResponse.json({
      success: true,
      data: batch,
      message: 'Payroll batch created successfully',
    });

  } catch (error: any) {
    console.error('Error creating payroll batch:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}