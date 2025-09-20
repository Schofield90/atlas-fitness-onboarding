import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Starting force delete of all classes...");

    // Step 1: Count and delete all bookings first (foreign key constraint)
    console.log("Deleting all bookings...");
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    const { error: bookingError } = await supabase
      .from("bookings")
      .delete()
      .gte("created_at", "2000-01-01"); // This ensures we match all rows

    if (bookingError) {
      console.error("Booking deletion error:", bookingError);
    } else {
      console.log(`Deleted ${bookingCount || 0} bookings`);
    }

    // Step 2: Count and delete all waitlist entries
    console.log("Deleting all waitlist entries...");
    const { count: waitlistCount } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    const { error: waitlistError } = await supabase
      .from("waitlist")
      .delete()
      .gte("created_at", "2000-01-01");

    if (waitlistError) {
      console.error("Waitlist deletion error:", waitlistError);
    } else {
      console.log(`Deleted ${waitlistCount || 0} waitlist entries`);
    }

    // Step 3: Count classes before deletion
    const { count: beforeCount } = await supabase
      .from("class_sessions")
      .select("*", { count: "exact", head: true });

    console.log(`Found ${beforeCount} classes to delete`);

    // Step 4: Delete all class sessions using different methods
    console.log("Attempting to delete all class_sessions...");

    // Method 1: Delete by organization
    const { data: orgs } = await supabase.from("organizations").select("id");

    let totalDeleted = 0;

    for (const org of orgs || []) {
      // Count before delete
      const { count } = await supabase
        .from("class_sessions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", org.id);

      const { error: deleteError } = await supabase
        .from("class_sessions")
        .delete()
        .eq("organization_id", org.id);

      if (!deleteError && count) {
        totalDeleted += count;
        console.log(`Deleted ${count} classes for org ${org.id}`);
      }
    }

    // Method 2: If any remain, try batch deletion
    if (totalDeleted < (beforeCount || 0)) {
      console.log("Trying batch deletion for remaining classes...");

      // Get all remaining class IDs
      const { data: remainingClasses } = await supabase
        .from("class_sessions")
        .select("id");

      if (remainingClasses && remainingClasses.length > 0) {
        // Delete in batches of 100
        const batchSize = 100;
        for (let i = 0; i < remainingClasses.length; i += batchSize) {
          const batch = remainingClasses
            .slice(i, i + batchSize)
            .map((c) => c.id);
          const batchCount = batch.length;

          const { error: batchError } = await supabase
            .from("class_sessions")
            .delete()
            .in("id", batch);

          if (!batchError) {
            totalDeleted += batchCount;
            console.log(`Batch deleted ${batchCount} classes`);
          }
        }
      }
    }

    // Step 5: Verify deletion
    const { count: afterCount } = await supabase
      .from("class_sessions")
      .select("*", { count: "exact", head: true });

    console.log(`Classes remaining after deletion: ${afterCount}`);

    // Step 6: If classes still exist, try one more aggressive approach
    if (afterCount && afterCount > 0) {
      console.log("Final aggressive deletion attempt...");
      const { error: finalError } = await supabase
        .from("class_sessions")
        .delete()
        .gte("created_at", "2000-01-01");

      const { count: finalCount } = await supabase
        .from("class_sessions")
        .select("*", { count: "exact", head: true });

      return NextResponse.json({
        success: finalCount === 0,
        message: `Force delete completed. Started with ${beforeCount}, deleted ${totalDeleted}, ${finalCount || 0} remain.`,
        details: {
          bookingsDeleted: bookingCount || 0,
          waitlistDeleted: waitlistCount || 0,
          classesBeforeDelete: beforeCount || 0,
          classesDeleted: totalDeleted,
          classesRemaining: finalCount || 0,
          finalAttemptError: finalError?.message,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted all ${totalDeleted} classes`,
      details: {
        bookingsDeleted: bookingCount || 0,
        waitlistDeleted: waitlistCount || 0,
        classesBeforeDelete: beforeCount || 0,
        classesDeleted: totalDeleted,
        classesRemaining: afterCount || 0,
      },
    });
  } catch (error: any) {
    console.error("Force delete error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete classes",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}

// Also support POST for easier testing
export async function POST() {
  return DELETE();
}
