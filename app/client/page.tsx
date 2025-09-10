"use client";

import {
  Calendar,
  Home,
  User,
  CreditCard,
  Activity,
  LogOut,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function ClientDashboard() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [stats, setStats] = useState({
    classesThisMonth: 0,
    creditsRemaining: 0,
    nextClass: null as any,
    memberSince: null as string | null,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (client) {
      loadDashboardData();
    }
  }, [client]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login-otp");
      return;
    }

    // Get client details
    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!clientData) {
      router.push("/login-otp");
      return;
    }

    setClient(clientData);
    setLoading(false);
  };

  const loadDashboardData = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Try direct client bookings first (preferred for multi-tenant)
    let { data: directBookings } = await supabase
      .from("bookings")
      .select(
        `
        *,
        class_sessions (
          *,
          programs (name),
          organization_locations (name),
          organization_staff (name)
        )
      `,
      )
      .eq("client_id", client.id)
      .gte("created_at", startOfMonth.toISOString());

    let { data: directUpcoming } = await supabase
      .from("bookings")
      .select(
        `
        *,
        class_sessions (
          *,
          programs (name),
          organization_locations (name),
          organization_staff (name)
        )
      `,
      )
      .eq("client_id", client.id)
      .eq("status", "confirmed")
      .gte("class_sessions.start_time", new Date().toISOString())
      .order("class_sessions(start_time)", { ascending: true })
      .limit(3);

    let classesThisMonth =
      directBookings?.filter((b) => b.status === "attended").length || 0;
    let creditsRemaining = 0;

    // Try to get credits directly for client
    const { data: directCredits } = await supabase
      .from("class_credits")
      .select("*")
      .eq("client_id", client.id)
      .single();

    if (directCredits) {
      creditsRemaining = directCredits.credits_remaining || 0;
    }

    // If no direct data, check lead records (backward compatibility)
    if (
      !directBookings ||
      directBookings.length === 0 ||
      !directUpcoming ||
      directUpcoming.length === 0 ||
      !directCredits
    ) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("id")
        .eq("client_id", client.id)
        .single();

      if (leadData) {
        // Get bookings using lead ID if no direct bookings
        if (!directBookings || directBookings.length === 0) {
          const { data: leadBookings } = await supabase
            .from("bookings")
            .select(
              `
              *,
              class_sessions (
                *,
                programs (name),
                organization_locations (name),
                organization_staff (name)
              )
            `,
            )
            .eq("customer_id", leadData.id)
            .gte("created_at", startOfMonth.toISOString());

          if (leadBookings && leadBookings.length > 0) {
            directBookings = leadBookings;
            classesThisMonth =
              leadBookings.filter((b) => b.status === "attended").length || 0;
          }
        }

        // Get upcoming using lead ID if no direct upcoming
        if (!directUpcoming || directUpcoming.length === 0) {
          const { data: leadUpcoming } = await supabase
            .from("bookings")
            .select(
              `
              *,
              class_sessions (
                *,
                programs (name),
                organization_locations (name),
                organization_staff (name)
              )
            `,
            )
            .eq("customer_id", leadData.id)
            .eq("status", "confirmed")
            .gte("class_sessions.start_time", new Date().toISOString())
            .order("class_sessions(start_time)", { ascending: true })
            .limit(3);

          if (leadUpcoming && leadUpcoming.length > 0) {
            directUpcoming = leadUpcoming;
          }
        }

        // Get credits from lead if no direct credits
        if (!directCredits) {
          const { data: leadCredits } = await supabase
            .from("class_credits")
            .select("*")
            .eq("customer_id", leadData.id)
            .single();

          if (leadCredits) {
            creditsRemaining = leadCredits.credits_remaining || 0;
          }
        }
      }
    }

    setUpcomingBookings(directUpcoming || []);
    setStats({
      classesThisMonth,
      creditsRemaining,
      nextClass: directUpcoming?.[0] || null,
      memberSince: client.created_at,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login-otp");
  };

  const navigation = [
    { name: "Home", icon: Home, id: "home", href: "/client" },
    {
      name: "Schedule",
      icon: Calendar,
      id: "schedule",
      href: "/client/schedule",
    },
    {
      name: "My Classes",
      icon: Activity,
      id: "bookings",
      href: "/client/bookings",
    },
    {
      name: "Membership",
      icon: CreditCard,
      id: "membership",
      href: "/client/membership",
    },
    {
      name: "Message Coach",
      icon: MessageCircle,
      id: "messages",
      href: "/client/messages",
    },
    { name: "Profile", icon: User, id: "profile", href: "/client/profile" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileMenuOpen ? "" : "hidden"}`}
      >
        <div
          className="fixed inset-0 bg-black/20"
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
        />
        <nav className="fixed top-0 left-0 bottom-0 flex w-full max-w-xs flex-col bg-gray-800 border-r border-gray-700">
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-700">
            <span className="text-xl font-semibold text-white">
              Atlas Fitness
            </span>
            <button
              type="button"
              className="-m-2.5 p-2.5"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-6 w-6 text-gray-300" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-y-7 px-6 pb-4">
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => {
                          const Icon = item.icon;
                          return (
                            <li key={item.name}>
                              <button
                                onClick={() => {
                                  setActiveTab(item.id);
                                  router.push(item.href);
                                  setMobileMenuOpen(false);
                                }}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full
                                  ${
                                    activeTab === item.id
                                      ? "bg-gray-700 text-white"
                                      : "text-gray-300 hover:text-white hover:bg-gray-700"
                                  }
                                `}
                              >
                                <Icon
                                  className="h-6 w-6 shrink-0"
                                  aria-hidden="true"
                                />
                                {item.name}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                    <li className="mt-auto">
                      <button
                        onClick={handleLogout}
                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-300 hover:bg-gray-700 hover:text-white w-full"
                      >
                        <LogOut
                          className="h-6 w-6 shrink-0"
                          aria-hidden="true"
                        />
                        Sign out
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-700 bg-gray-800 px-6">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-2xl font-bold text-white">Atlas Fitness</h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => {
                            setActiveTab(item.id);
                            router.push(item.href);
                          }}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full
                            ${
                              activeTab === item.id
                                ? "bg-gray-700 text-white"
                                : "text-gray-300 hover:text-white hover:bg-gray-700"
                            }
                          `}
                        >
                          <Icon
                            className="h-6 w-6 shrink-0"
                            aria-hidden="true"
                          />
                          {item.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex flex-col gap-2 pb-4">
                  <div className="px-2 py-3 text-sm">
                    <p className="font-semibold text-white">
                      {client?.first_name && client?.last_name
                        ? `${client.first_name} ${client.last_name}`
                        : "Member"}
                    </p>
                    <p className="text-gray-400">{client?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-800 px-4 py-4 shadow-sm sm:px-6 lg:hidden border-b border-gray-700">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-300 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-white">
          Atlas Fitness
        </div>
      </div>

      <main className="lg:pl-72">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          {/* Welcome section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              Welcome back, {client?.first_name || "Member"}!
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Here's what's happening with your fitness journey.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        Classes This Month
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-white">
                        {stats.classesThisMonth}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        Credits Remaining
                      </dt>
                      <dd className="mt-1 text-3xl font-semibold text-white">
                        {stats.creditsRemaining || "N/A"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        Next Class
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-white">
                        {stats.nextClass
                          ? new Date(
                              stats.nextClass.class_sessions?.start_time,
                            ).toLocaleDateString("en-GB", {
                              weekday: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No upcoming classes"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <User className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">
                        Member Since
                      </dt>
                      <dd className="mt-1 text-lg font-semibold text-white">
                        {stats.memberSince
                          ? new Date(stats.memberSince).toLocaleDateString(
                              "en-GB",
                              { month: "short", year: "numeric" },
                            )
                          : "N/A"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => router.push("/client/schedule")}
                className="relative group bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <div>
                  <Calendar className="h-10 w-10 mb-3" />
                  <h4 className="text-lg font-semibold">Book a Class</h4>
                  <p className="mt-1 text-blue-100">
                    View schedule and reserve your spot
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push("/client/bookings")}
                className="relative group bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white hover:from-green-600 hover:to-green-700 transition-all"
              >
                <div>
                  <Activity className="h-10 w-10 mb-3" />
                  <h4 className="text-lg font-semibold">My Bookings</h4>
                  <p className="mt-1 text-green-100">
                    Manage your upcoming classes
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push("/client/membership")}
                className="relative group bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white hover:from-purple-600 hover:to-purple-700 transition-all"
              >
                <div>
                  <CreditCard className="h-10 w-10 mb-3" />
                  <h4 className="text-lg font-semibold">Membership</h4>
                  <p className="mt-1 text-purple-100">
                    View and manage your plan
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Upcoming classes preview */}
          <div className="mt-8 bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">
                Your Upcoming Classes
              </h3>
              <button
                onClick={() => router.push("/client/bookings")}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {upcomingBookings.length === 0 ? (
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">
                        No Classes Booked
                      </h4>
                      <p className="text-sm text-gray-400">
                        Book your first class to get started
                      </p>
                      <button
                        onClick={() => router.push("/client/schedule")}
                        className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                      >
                        View available sessions →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-white">
                          {booking.class_sessions?.programs?.name || "Class"}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {booking.class_sessions?.start_time &&
                            new Date(
                              booking.class_sessions.start_time,
                            ).toLocaleDateString("en-GB", {
                              weekday: "long",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.class_sessions?.organization_locations
                            ?.name || "Location"}{" "}
                          •
                          {booking.class_sessions?.organization_staff?.name ||
                            "Instructor"}
                        </p>
                      </div>
                      <span className="bg-green-900/50 text-green-400 text-xs font-medium px-2.5 py-0.5 rounded">
                        Confirmed
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
