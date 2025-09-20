"use client";

import { formatDistanceToNow } from "date-fns";

interface OrganizationHeaderProps {
  organization: any;
  metrics: any;
}

export default function OrganizationHeader({
  organization,
  metrics,
}: OrganizationHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trialing":
        return "bg-blue-100 text-blue-800";
      case "past_due":
      case "unpaid":
        return "bg-red-100 text-red-800";
      case "canceled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {organization.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ID: {organization.id} • Slug: {organization.slug}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(organization.subscription_status || "inactive")}`}
            >
              {organization.subscription_status || "No subscription"}
            </span>
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
              {organization.subscription_plan || organization.plan || "Free"}
            </span>
            {organization.trial_ends_at &&
              new Date(organization.trial_ends_at) > new Date() && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Trial ends{" "}
                  {formatDistanceToNow(new Date(organization.trial_ends_at), {
                    addSuffix: true,
                  })}
                </span>
              )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-sm font-medium">
            {new Date(organization.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-lg font-semibold">{metrics.active_users || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Leads</p>
            <p className="text-lg font-semibold">{metrics.total_leads || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">MRR</p>
            <p className="text-lg font-semibold">£{metrics.mrr || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Activity</p>
            <p className="text-lg font-semibold">
              {metrics.last_activity
                ? formatDistanceToNow(new Date(metrics.last_activity), {
                    addSuffix: true,
                  })
                : "Never"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
