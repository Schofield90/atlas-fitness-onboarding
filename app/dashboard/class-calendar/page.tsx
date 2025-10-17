import React from "react";
import { redirect } from "next/navigation";
import { FileDown, Plus, Trash2 } from "lucide-react";
import Button from "@/app/components/ui/Button";
import CompactFilters from "@/app/components/booking/CompactFilters";
import PremiumCalendarGrid from "@/app/components/booking/PremiumCalendarGrid";
import SelectedClassDetails from "@/app/components/booking/SelectedClassDetails";
import DashboardLayout from "@/app/components/DashboardLayout";
import { getAuthenticatedClient } from "@/lib/supabase/server";
import { transformClassesForCalendar } from "@/lib/calendar/class-transformer";
import ClassCalendarClient from "./ClassCalendarClient";

async function getClasses(organizationId: string) {
  try {
    // Use the authenticated supabase client to fetch class sessions directly
    const { supabase } = await getAuthenticatedClient();

    const { data: sessions, error } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        program:programs(*)
      `,
      )
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching classes:", error);
      return [];
    }

    return transformClassesForCalendar(sessions || []);
  } catch (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
}

async function getUserOrganization(userId: string) {
  const { supabase } = await getAuthenticatedClient();

  // First check organization_staff table (new structure)
  const { data: staffOrg } = await supabase
    .from("organization_staff")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (staffOrg) {
    return staffOrg.organization_id;
  }

  // Check user_organizations table
  const { data: userOrgData } = await supabase
    .from("user_organizations")
    .select("organization_id, role")
    .eq("user_id", userId)
    .single();

  if (userOrgData) {
    return userOrgData.organization_id;
  }

  // Check if user owns an organization
  const { data: ownedOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", userId)
    .single();

  if (ownedOrg) {
    return ownedOrg.id;
  }

  return null;
}

export default async function ClassCalendarPage() {
  // Get authenticated user
  const { user, error } = await getAuthenticatedClient();

  if (error || !user) {
    redirect("/signin");
  }

  // Get user's organization
  const organizationId = await getUserOrganization(user.id);

  if (!organizationId) {
    redirect("/onboarding/create-organization");
  }

  // Fetch initial classes data on server
  const initialClasses = await getClasses(organizationId);

  return (
    <DashboardLayout>
      <ClassCalendarClient
        organizationId={organizationId}
        initialClasses={initialClasses}
      />
    </DashboardLayout>
  );
}
