"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

interface HealthMetric {
  name: string;
  status: "healthy" | "warning" | "error";
  value: string;
  details?: string;
}

export default function AdminSystemHealth() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const res = await fetch("/api/admin/system/health");
      if (res.ok) {
        const data = await res.json();
        setMetrics([
          {
            name: "Database",
            status: data.database ? "healthy" : "error",
            value: data.database ? "Connected" : "Disconnected",
            details: data.databaseLatency
              ? `${data.databaseLatency}ms latency`
              : undefined,
          },
          {
            name: "Stripe API",
            status: data.stripe ? "healthy" : "warning",
            value: data.stripe ? "Connected" : "Issues detected",
            details: data.stripeWebhooks
              ? `${data.stripeWebhooks} webhooks pending`
              : undefined,
          },
          {
            name: "GoCardless",
            status: data.gocardless ? "healthy" : "warning",
            value: data.gocardless ? "Connected" : "Not configured",
          },
          {
            name: "Email Service",
            status: data.email ? "healthy" : "error",
            value: data.email ? "Operational" : "Down",
            details: data.emailQueue
              ? `${data.emailQueue} emails queued`
              : undefined,
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to check system health:", error);
      setMetrics([
        {
          name: "System",
          status: "error",
          value: "Unable to check health",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          System Health
        </h3>
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>

      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.name} className="flex items-center justify-between">
            <div className="flex items-center">
              {metric.status === "healthy" && (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              )}
              {metric.status === "warning" && (
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              )}
              {metric.status === "error" && (
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {metric.name}
                </p>
                {metric.details && (
                  <p className="text-xs text-gray-500">{metric.details}</p>
                )}
              </div>
            </div>
            <span
              className={`text-sm ${
                metric.status === "healthy"
                  ? "text-green-600"
                  : metric.status === "warning"
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={checkSystemHealth}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh status
        </button>
      </div>
    </div>
  );
}
