import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Fetch onboarding session with employee data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('onboarding_sessions')
      .select(`
        *,
        employees (*)
      `)
      .eq('token', token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired onboarding link' },
        { status: 404 }
      );
    }

    // Check if link has expired
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This onboarding link has expired' },
        { status: 410 }
      );
    }

    // Check if already completed
    if (session.completed) {
      return NextResponse.json(
        { error: 'This onboarding has already been completed' },
        { status: 410 }
      );
    }

    // Return employee data
    return NextResponse.json({
      employee: {
        name: session.employees.name,
        email: session.employees.email,
        jobTitle: session.employees.job_title,
        annualSalary: session.employees.annual_salary,
        hoursPerWeek: session.employees.hours_per_week,
        location: session.employees.location,
        startDate: session.employees.start_date,
      },
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}