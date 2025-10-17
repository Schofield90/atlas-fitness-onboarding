import { NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    // Get the organization ID from the request
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Create sample classes for the next 7 days
    const today = new Date();
    const sampleClasses = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const classDate = new Date(today);
      classDate.setDate(today.getDate() + dayOffset);

      // Morning class at 6:00 AM
      const morningClass = new Date(classDate);
      morningClass.setHours(6, 0, 0, 0);

      sampleClasses.push({
        name: `Morning Yoga - Day ${dayOffset + 1}`,
        start_time: morningClass.toISOString(),
        end_time: new Date(
          morningClass.getTime() + 60 * 60 * 1000,
        ).toISOString(),
        organization_id: organizationId,
        max_capacity: 20,
        current_bookings: Math.floor(Math.random() * 15),
        instructor_name: "Sarah Johnson",
        location: "Studio A",
        description: "Start your day with energizing yoga",
        class_type: "Yoga",
      });

      // Afternoon class at 12:00 PM
      const noonClass = new Date(classDate);
      noonClass.setHours(12, 0, 0, 0);

      sampleClasses.push({
        name: `HIIT Training - Day ${dayOffset + 1}`,
        start_time: noonClass.toISOString(),
        end_time: new Date(noonClass.getTime() + 45 * 60 * 1000).toISOString(),
        organization_id: organizationId,
        max_capacity: 15,
        current_bookings: Math.floor(Math.random() * 12),
        instructor_name: "Mike Thompson",
        location: "Main Gym",
        description: "High intensity interval training",
        class_type: "HIIT",
      });

      // Evening class at 6:00 PM
      const eveningClass = new Date(classDate);
      eveningClass.setHours(18, 0, 0, 0);

      sampleClasses.push({
        name: `Evening Spin - Day ${dayOffset + 1}`,
        start_time: eveningClass.toISOString(),
        end_time: new Date(
          eveningClass.getTime() + 50 * 60 * 1000,
        ).toISOString(),
        organization_id: organizationId,
        max_capacity: 25,
        current_bookings: Math.floor(Math.random() * 20),
        instructor_name: "Lisa Chen",
        location: "Spin Studio",
        description: "Indoor cycling workout",
        class_type: "Spin",
      });
    }

    // Insert all sample classes
    const { data, error } = await supabase
      .from("class_sessions")
      .insert(sampleClasses)
      .select();

    if (error) {
      console.error("Error creating sample classes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${sampleClasses.length} sample classes`,
      classes: data,
    });
  } catch (error) {
    console.error("Error in create-sample-classes:", error);
    return NextResponse.json(
      { error: "Failed to create sample classes" },
      { status: 500 },
    );
  }
}
