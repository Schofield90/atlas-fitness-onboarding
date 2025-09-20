import { Suspense } from "react";
import { createAdminClient } from "@/app/lib/supabase/admin";
import AdminKPITiles from "./components/AdminKPITiles";
import AdminOrganizationsTable from "./components/AdminOrganizationsTable";
import AdminActivityFeed from "./components/AdminActivityFeed";
import AdminSystemHealth from "./components/AdminSystemHealth";

// Force dynamic rendering since this page uses cookies
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // Fetch overview metrics
  const { data: metrics } = await supabase
    .from("admin_financial_overview")
    .select("*")
    .single();

  const { data: recentOrgs } = await supabase
    .from("organizations")
    .select("*, billing_subscriptions(*)")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentActivity } = await supabase
    .from("admin_activity_logs")
    .select("*, admin_user:super_admin_users(user_id)")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin HQ</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and management console
        </p>
      </div>

      <Suspense
        fallback={<div className="animate-pulse h-32 bg-gray-200 rounded-lg" />}
      >
        <AdminKPITiles metrics={metrics} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense
            fallback={
              <div className="animate-pulse h-96 bg-gray-200 rounded-lg" />
            }
          >
            <AdminOrganizationsTable />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense
            fallback={
              <div className="animate-pulse h-48 bg-gray-200 rounded-lg" />
            }
          >
            <AdminSystemHealth />
          </Suspense>

          <Suspense
            fallback={
              <div className="animate-pulse h-48 bg-gray-200 rounded-lg" />
            }
          >
            <AdminActivityFeed activities={recentActivity} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
