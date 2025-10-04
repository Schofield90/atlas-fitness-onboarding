"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/app/components/DashboardLayout";
import { useFacebookConnection } from "@/app/hooks/useFacebookConnection";

export default function IntegrationsPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [userData, setUserData] = useState<any>(null);
  const facebookConnection = useFacebookConnection();

  useEffect(() => {
    const storedData = localStorage.getItem("gymleadhub_trial_data");
    if (storedData) {
      setUserData(JSON.parse(storedData));
    }
  }, []);

  const integrations = [
    {
      id: "facebook",
      name: "Facebook Ads",
      description:
        "Connect your Facebook ad account to automatically capture leads from your advertising campaigns.",
      icon: (
        <svg
          className="w-12 h-12 text-blue-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      connected: facebookConnection.connected,
      loading: facebookConnection.loading,
      href: `/org/${orgSlug}/integrations/facebook`,
      features: [
        "Automatic lead capture",
        "Real-time notifications",
        "Lead form sync",
        "Campaign analytics",
      ],
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description:
        "Enable WhatsApp integration for instant member communication, booking confirmations, and automated reminders.",
      icon: (
        <svg
          className="w-12 h-12 text-green-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
      connected: true,
      loading: false,
      href: `/org/${orgSlug}/integrations/whatsapp`,
      comingSoon: false,
      features: [
        "Booking confirmations",
        "Class reminders",
        "Automated messaging",
        "Two-way conversations",
      ],
    },
    {
      id: "google",
      name: "Google Ads",
      description:
        "Sync your Google Ads campaigns to capture leads from search and display advertising.",
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
      connected: false,
      loading: false,
      href: "#",
      comingSoon: true,
      features: [
        "Search ads integration",
        "Display network sync",
        "Conversion tracking",
        "Budget optimization",
      ],
    },
    {
      id: "instagram",
      name: "Instagram",
      description:
        "Connect Instagram to capture leads from your Instagram ads and organic content.",
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24">
          <defs>
            <linearGradient
              id="instagram-gradient"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" style={{ stopColor: "#f09433" }} />
              <stop offset="25%" style={{ stopColor: "#e6683c" }} />
              <stop offset="50%" style={{ stopColor: "#dc2743" }} />
              <stop offset="75%" style={{ stopColor: "#cc2366" }} />
              <stop offset="100%" style={{ stopColor: "#bc1888" }} />
            </linearGradient>
          </defs>
          <path
            fill="url(#instagram-gradient)"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"
          />
        </svg>
      ),
      connected: false,
      loading: false,
      href: "#",
      comingSoon: true,
      features: [
        "Story ads sync",
        "Feed post leads",
        "Reels integration",
        "DM automation",
      ],
    },
  ];

  return (
    <DashboardLayout userData={userData}>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Integrations</h1>
          <p className="text-gray-300">
            Connect your favorite platforms to supercharge your lead generation
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">{integration.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {integration.name}
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                      {integration.description}
                    </p>

                    {/* Features list */}
                    <ul className="space-y-1 mb-4">
                      {integration.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center text-sm text-gray-400"
                        >
                          <svg
                            className="w-4 h-4 mr-2 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                {integration.loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    <span className="text-gray-400 text-sm">
                      Checking status...
                    </span>
                  </div>
                ) : integration.connected ? (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-400 text-sm">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                    <span className="text-gray-400 text-sm">Not connected</span>
                  </div>
                )}

                {integration.comingSoon ? (
                  <span className="bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm">
                    Coming Soon
                  </span>
                ) : integration.connected ? (
                  <Link
                    href={integration.href}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Manage
                  </Link>
                ) : (
                  <Link
                    href={integration.href}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Connect
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Additional integrations coming soon */}
        <div className="mt-12 bg-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold mb-4">
            🚀 More Integrations Coming Soon!
          </h3>
          <p className="text-gray-300 mb-6">
            We're constantly adding new integrations to help you capture leads
            from every channel.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-gray-400">
            <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
              TikTok Ads
            </span>
            <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
              LinkedIn
            </span>
            <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
              Twitter/X
            </span>
            <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
              YouTube
            </span>
            <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
              SMS
            </span>
            <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
              Email Marketing
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
