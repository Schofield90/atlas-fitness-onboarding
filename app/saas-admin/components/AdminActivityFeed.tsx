"use client";

import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  action_type: string;
  created_at: string;
  action_details: any;
  admin_user: {
    user_id: string;
  };
  target_organization_id?: string;
}

interface AdminActivityFeedProps {
  activities: Activity[] | null;
}

export default function AdminActivityFeed({
  activities,
}: AdminActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-gray-800 shadow rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">
          Recent Activity
        </h3>
        <p className="text-sm text-gray-400">No recent activity</p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    if (action.includes("IMPERSONATION")) return "🔐";
    if (action.includes("DELETE")) return "🗑️";
    if (action.includes("UPDATE")) return "✏️";
    if (action.includes("CREATE")) return "➕";
    return "📝";
  };

  const getActionDescription = (activity: Activity) => {
    const action = activity.action_type;
    const details = activity.action_details || {};

    if (action === "IMPERSONATION_START") {
      return `Started impersonation session (${details.scope} access)`;
    }
    if (action === "IMPERSONATION_STOP") {
      return "Ended impersonation session";
    }
    if (action === "IMPERSONATION_DENIED") {
      return "Impersonation attempt denied";
    }

    return action.toLowerCase().replace(/_/g, " ");
  };

  return (
    <div className="bg-gray-800 shadow rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-medium text-white mb-4">
        Recent Activity
      </h3>

      <div className="flow-root">
        <ul className="-mb-8">
          {activities.map((activity, idx) => (
            <li key={activity.id}>
              <div className="relative pb-8">
                {idx !== activities.length - 1 && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-700"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center ring-8 ring-gray-800">
                      <span className="text-sm">
                        {getActionIcon(activity.action_type)}
                      </span>
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div>
                      <p className="text-sm text-white">
                        {getActionDescription(activity)}
                      </p>
                      {activity.target_organization_id && (
                        <p className="text-xs text-gray-400 mt-1">
                          Organization:{" "}
                          {activity.target_organization_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
