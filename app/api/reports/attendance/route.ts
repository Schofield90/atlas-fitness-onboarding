import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { requireOrgAccess } from '@/app/lib/auth/organization';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    
    // Get date range from query params
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    // Get organization ID from authenticated user
    let organizationId: string;
    try {
      const { organizationId: orgId } = await requireOrgAccess();
      organizationId = orgId;
    } catch (e) {
      return NextResponse.json(
        { error: 'No organization found. Please complete onboarding.' },
        { status: 401 }
      );
    }
    
    // Fetch attendance data
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        checked_in,
        created_at,
        class_session:class_sessions(
          id,
          start_time,
          end_time,
          program:programs(name, type),
          instructor_name,
          location
        ),
        customer:leads(
          id,
          name,
          email
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Calculate attendance metrics
    const totalBookings = bookings?.length || 0;
    const attendedCount = bookings?.filter(b => b.checked_in).length || 0;
    const noShowCount = bookings?.filter(b => !b.checked_in && b.status === 'confirmed').length || 0;
    const cancelledCount = bookings?.filter(b => b.status === 'cancelled').length || 0;
    
    // Group by class type
    const classTypeStats: Record<string, any> = {};
    bookings?.forEach(booking => {
      const className = booking.class_session?.program?.name || 'Unknown';
      if (!classTypeStats[className]) {
        classTypeStats[className] = {
          name: className,
          total: 0,
          attended: 0,
          noShow: 0,
          cancelled: 0
        };
      }
      classTypeStats[className].total++;
      if (booking.checked_in) classTypeStats[className].attended++;
      else if (booking.status === 'cancelled') classTypeStats[className].cancelled++;
      else if (!booking.checked_in && booking.status === 'confirmed') classTypeStats[className].noShow++;
    });
    
    // Calculate daily attendance
    const dailyAttendance: Record<string, number> = {};
    bookings?.forEach(booking => {
      if (booking.checked_in) {
        const date = new Date(booking.class_session?.start_time || booking.created_at).toLocaleDateString('en-GB');
        dailyAttendance[date] = (dailyAttendance[date] || 0) + 1;
      }
    });
    
    // Convert to array for charts
    const dailyData = Object.entries(dailyAttendance).map(([date, count]) => ({
      date,
      attendance: count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate peak times
    const hourlyAttendance: Record<number, number> = {};
    bookings?.forEach(booking => {
      if (booking.checked_in && booking.class_session?.start_time) {
        const hour = new Date(booking.class_session.start_time).getHours();
        hourlyAttendance[hour] = (hourlyAttendance[hour] || 0) + 1;
      }
    });
    
    const peakTimes = Object.entries(hourlyAttendance)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        time: `${hour}:00`,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Top attendees
    const customerAttendance: Record<string, any> = {};
    bookings?.forEach(booking => {
      if (booking.checked_in && booking.customer) {
        const customerId = booking.customer.id;
        if (!customerAttendance[customerId]) {
          customerAttendance[customerId] = {
            id: customerId,
            name: booking.customer.name,
            email: booking.customer.email,
            attendanceCount: 0
          };
        }
        customerAttendance[customerId].attendanceCount++;
      }
    });
    
    const topAttendees = Object.values(customerAttendance)
      .sort((a, b) => b.attendanceCount - a.attendanceCount)
      .slice(0, 10);
    
    return NextResponse.json({
      summary: {
        totalBookings,
        attendedCount,
        noShowCount,
        cancelledCount,
        attendanceRate: totalBookings > 0 ? ((attendedCount / totalBookings) * 100).toFixed(1) : 0,
        dateRange: {
          start: startDate,
          end: endDate
        }
      },
      classTTypeStats: Object.values(classTypeStats),
      dailyAttendance: dailyData,
      peakTimes,
      topAttendees,
      rawData: bookings // For export functionality
    });
  } catch (error: any) {
    console.error('Attendance report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}