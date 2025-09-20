"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface ActivityTabProps {
  organizationId: string;
}

export default function ActivityTab({ organizationId }: ActivityTabProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [organizationId]);

  const fetchActivities = async () => {
    try {
      const res = await fetch(
        `/api/admin/organizations/${organizationId}/activity`,
      );
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Recent Activity
      </h3>

      {activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action}
                  </p>
                  {activity.details && (
                    <p className="text-sm text-gray-500 mt-1">
                      {JSON.stringify(activity.details)}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>By: {activity.actor_email || "System"}</span>
                    <span>
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {activity.ip_address && (
                      <span>IP: {activity.ip_address}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-4 text-center text-gray-500">
          No recent activity
        </div>
      )}
    </div>
  );
}
