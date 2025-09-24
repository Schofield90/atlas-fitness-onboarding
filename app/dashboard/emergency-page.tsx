"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EmergencyDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check for emergency auth
    const emergencyAuth = localStorage.getItem("emergency_auth");
    if (emergencyAuth) {
      setUser(JSON.parse(emergencyAuth));
    } else {
      // Check regular auth
      import("@/app/lib/supabase/client").then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) {
            setUser(data.user);
          } else {
            router.push("/owner-login");
          }
        });
      });
    }
  }, [router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">
            Emergency Dashboard
          </h1>
          <p className="mt-2 text-gray-600">Logged in as: {user.email}</p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">
                  Quick Actions
                </h3>
                <ul className="mt-3 space-y-2">
                  <li>
                    <Link
                      href="/leads"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Manage Leads
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/booking"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Bookings
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/settings"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Settings
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
