import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentUserOrganization } from "@/app/lib/organization-server";

export async function GET() {
  try {
    const supabase = createClient();
    const { organizationId } = await getCurrentUserOrganization();

    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    // Get all customers with birthdays
    const { data: customers, error } = await supabase
      .from("leads")
      .select("id, name, date_of_birth, email, phone")
      .eq("organization_id", organizationId)
      .not("date_of_birth", "is", null);

    if (error) throw error;

    const today = new Date();
    const thirtyDaysFromNow = new Date(
      today.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    // Process birthdays
    const upcomingBirthdays = (customers || [])
      .map((customer) => {
        const dob = new Date(customer.date_of_birth);
        const thisYearBirthday = new Date(
          today.getFullYear(),
          dob.getMonth(),
          dob.getDate(),
        );
        const nextYearBirthday = new Date(
          today.getFullYear() + 1,
          dob.getMonth(),
          dob.getDate(),
        );

        // Check if birthday is in the next 30 days
        let birthdayDate = thisYearBirthday;
        if (thisYearBirthday < today) {
          birthdayDate = nextYearBirthday;
        }

        const daysUntil = Math.ceil(
          (birthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          birthdayDate: birthdayDate.toISOString(),
          daysUntil,
          age:
            today.getFullYear() -
            dob.getFullYear() +
            (birthdayDate.getFullYear() - today.getFullYear()),
        };
      })
      .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    // Get anniversaries (member since date)
    const { data: memberships, error: membershipError } = await supabase
      .from("customer_memberships")
      .select(
        `
        *,
        customer:leads(name, email, phone)
      `,
      )
      .eq("organization_id", organizationId)
      .eq("status", "active");

    if (membershipError) throw membershipError;

    // Process anniversaries
    const upcomingAnniversaries = (memberships || [])
      .map((membership) => {
        if (!membership.started_at) return null;

        const startDate = new Date(membership.started_at);
        const thisYearAnniversary = new Date(
          today.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
        );
        const nextYearAnniversary = new Date(
          today.getFullYear() + 1,
          startDate.getMonth(),
          startDate.getDate(),
        );

        let anniversaryDate = thisYearAnniversary;
        if (thisYearAnniversary < today) {
          anniversaryDate = nextYearAnniversary;
        }

        const daysUntil = Math.ceil(
          (anniversaryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        const yearsAsMember =
          today.getFullYear() -
          startDate.getFullYear() +
          (anniversaryDate.getFullYear() - today.getFullYear());

        return {
          id: membership.id,
          name: membership.customer?.name || "Unknown",
          email: membership.customer?.email,
          phone: membership.customer?.phone,
          anniversaryDate: anniversaryDate.toISOString(),
          daysUntil,
          yearsAsMember,
        };
      })
      .filter(
        (a) =>
          a && a.daysUntil >= 0 && a.daysUntil <= 30 && a.yearsAsMember > 0,
      )
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    return NextResponse.json({
      birthdays: upcomingBirthdays,
      anniversaries: upcomingAnniversaries,
    });
  } catch (error: any) {
    console.error("Dashboard birthdays error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
